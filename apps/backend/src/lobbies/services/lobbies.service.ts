import { Injectable } from '@nestjs/common';
import type { LobbyStatus } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLobbyDto } from '../dto/create-lobby.dto';
import type { Lobby } from '../entities/lobby.entity';
import {
  MAX_CODE_ATTEMPTS,
  generateLobbyCode,
  normalizeLobbyCode,
} from '../domain/lobby-code';
import {
  loadLobbyById,
  loadLobbyByCode,
  lockLobbyById,
  requireAdmin,
  requireUserProfile,
} from '../repositories/lobby.repository';
import {
  normalizeOptionalHandle,
  resolveExpiresAt,
} from '../domain/lobby-rules';
import { isUniqueOn } from '../domain/lobby-unique-errors';

@Injectable()
export class LobbiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateLobbyDto): Promise<Lobby> {
    const expiresAt = resolveExpiresAt(dto.expiryMinutes, dto.expiresAt);
    const instaPayHandle = normalizeOptionalHandle(dto.instaPayHandle);
    const [restaurant, user] = await Promise.all([
      this.prisma.restaurant.findFirst({
        where: { id: dto.restaurantId, isActive: true },
        select: { id: true },
      }),
      requireUserProfile(this.prisma, userId),
    ]);
    if (!restaurant) {
      throw new AppError(
        'NOT_FOUND',
        `Restaurant ${dto.restaurantId} not found`,
      );
    }

    // A failed unique insert aborts a PostgreSQL transaction, so each collision
    // attempt runs outside one. Prisma's nested create is atomic on its own.
    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        const lobby = await this.prisma.lobby.create({
          data: {
            restaurantId: dto.restaurantId,
            code: generateLobbyCode(),
            status: 'open',
            maxMembers: dto.maxMembers ?? null,
            expiresAt,
            instaPayHandle: instaPayHandle ?? user.instaPayHandle,
            members: {
              create: {
                userId,
                role: 'admin',
                displayName: user.displayName,
              },
            },
          },
        });
        return loadLobbyById(this.prisma, lobby.id);
      } catch (error) {
        if (isUniqueOn(error, 'code')) {
          if (attempt < MAX_CODE_ATTEMPTS) {
            continue;
          }
          break;
        }
        throw error;
      }
    }

    throw new AppError(
      'CONFLICT',
      'Could not allocate a unique lobby code. Please try again.',
    );
  }

  async findById(id: string): Promise<Lobby> {
    return loadLobbyById(this.prisma, id);
  }

  async findByCode(rawCode: string): Promise<Lobby> {
    return loadLobbyByCode(this.prisma, normalizeLobbyCode(rawCode));
  }

  async lock(lobbyId: string, userId: string): Promise<Lobby> {
    return this.transitionStatus(
      lobbyId,
      userId,
      'open',
      'locked',
      'Only an open lobby can be locked',
    );
  }

  async reopen(lobbyId: string, userId: string): Promise<Lobby> {
    return this.transitionStatus(
      lobbyId,
      userId,
      'locked',
      'open',
      'Only a locked lobby can be reopened',
    );
  }

  private async transitionStatus(
    lobbyId: string,
    userId: string,
    from: LobbyStatus,
    to: LobbyStatus,
    conflictMessage: string,
  ): Promise<Lobby> {
    return this.prisma.runInTransaction(async (em) => {
      await lockLobbyById(em, lobbyId);
      const lobby = await loadLobbyById(em, lobbyId);
      await requireAdmin(em, lobbyId, userId);
      if (lobby.status !== from) {
        throw new AppError('CONFLICT', conflictMessage, {
          status: lobby.status,
        });
      }
      await em.lobby.update({ where: { id: lobbyId }, data: { status: to } });
      return loadLobbyById(em, lobbyId);
    });
  }
}
