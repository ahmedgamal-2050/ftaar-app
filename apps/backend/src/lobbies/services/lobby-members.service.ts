import { Injectable } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error';
import { PrismaService } from '../../database/prisma.service';
import type { EntityManager } from '../../shared/run-in-transaction';
import type { JoinLobbyDto } from '../dto/join-lobby.dto';
import type { Lobby } from '../entities/lobby.entity';
import { LobbyMember } from '../entities/lobby-member.entity';
import { normalizeLobbyCode } from '../domain/lobby-code';
import {
  assertDisplayNameAvailable,
  findMembership,
  loadLobbyById,
  loadLobbyByCode,
  lockLobbyById,
  lockLobbyByCode,
  requireAdmin,
  requireUserProfile,
} from '../repositories/lobby.repository';
import { assertJoinable, resolveJoinDisplayName } from '../domain/lobby-rules';
import {
  isUniqueOn,
  rethrowDisplayNameConflict,
} from '../domain/lobby-unique-errors';

export type JoinLobbyResult = {
  lobby: Lobby;
  membership: LobbyMember;
  alreadyMember: boolean;
};

@Injectable()
export class LobbyMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async join(userId: string, dto: JoinLobbyDto): Promise<JoinLobbyResult> {
    const code = normalizeLobbyCode(dto.code);

    return this.prisma.runInTransaction(async (em) => {
      await lockLobbyByCode(em, code);
      const lobby = await loadLobbyByCode(em, code);

      const existing = lobby.members.find((member) => member.userId === userId);
      if (existing) {
        return { lobby, membership: existing, alreadyMember: true };
      }

      assertJoinable(lobby);

      const user = await requireUserProfile(em, userId);
      const displayName = resolveJoinDisplayName(
        dto.displayName,
        user.displayName,
      );
      await assertDisplayNameAvailable(em, lobby.id, displayName);

      try {
        const membership = await em.lobbyMember.create({
          data: { lobbyId: lobby.id, userId, role: 'member', displayName },
        });
        return {
          lobby: await loadLobbyById(em, lobby.id),
          membership: LobbyMember.fromPersistence(membership),
          alreadyMember: false,
        };
      } catch (error) {
        const raced = await this.resolveRacedJoin(em, error, lobby.id, userId);
        if (raced) {
          return raced;
        }
        rethrowDisplayNameConflict(error);
        throw error;
      }
    });
  }

  async removeMember(
    lobbyId: string,
    memberId: string,
    adminUserId: string,
  ): Promise<LobbyMember> {
    return this.prisma.runInTransaction(async (em) => {
      await lockLobbyById(em, lobbyId);
      await loadLobbyById(em, lobbyId);
      await requireAdmin(em, lobbyId, adminUserId);

      const target = await em.lobbyMember.findFirst({
        where: { id: memberId, lobbyId },
      });
      if (!target) {
        throw new AppError('NOT_FOUND', `Member ${memberId} not found`);
      }
      if (target.role === 'admin') {
        throw new AppError('FORBIDDEN', 'The lobby admin cannot be removed');
      }

      await em.lobbyMember.delete({ where: { id: target.id } });
      return LobbyMember.fromPersistence(target);
    });
  }

  async leave(lobbyId: string, userId: string): Promise<LobbyMember> {
    return this.prisma.runInTransaction(async (em) => {
      await lockLobbyById(em, lobbyId);
      const lobby = await loadLobbyById(em, lobbyId);
      const membership = await findMembership(em, lobbyId, userId);
      if (!membership) {
        throw new AppError('NOT_FOUND', 'You are not a member of this lobby');
      }
      if (membership.role === 'admin') {
        throw new AppError(
          'FORBIDDEN',
          'The lobby admin cannot leave. Remove members or cancel the lobby instead.',
        );
      }
      if (lobby.status !== 'open') {
        throw new AppError(
          'CONFLICT',
          'You can only leave while the lobby is open',
          { status: lobby.status },
        );
      }

      await em.lobbyMember.delete({ where: { id: membership.id } });
      return LobbyMember.fromPersistence(membership);
    });
  }

  /** Treats a lost `uq_lobby_members_lobby_user` race as an existing join. */
  private async resolveRacedJoin(
    em: EntityManager,
    error: unknown,
    lobbyId: string,
    userId: string,
  ): Promise<JoinLobbyResult | null> {
    if (!isUniqueOn(error, 'lobby_id', 'user_id')) {
      return null;
    }
    const membership = await findMembership(em, lobbyId, userId);
    if (!membership) {
      return null;
    }
    return {
      lobby: await loadLobbyById(em, lobbyId),
      membership: LobbyMember.fromPersistence(membership),
      alreadyMember: true,
    };
  }
}
