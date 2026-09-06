import { Prisma, type LobbyMember as PrismaLobbyMember } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import type { PrismaService } from '../../database/prisma.service';
import type { EntityManager } from '../../shared/run-in-transaction';
import { Lobby } from '../entities/lobby.entity';
import { DISPLAY_NAME_TAKEN_MESSAGE } from '../domain/lobby-unique-errors';

export const LOBBY_DETAIL_INCLUDE = {
  restaurant: true,
  members: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.LobbyInclude;

type LobbyReader = Pick<EntityManager, 'lobby'> | Pick<PrismaService, 'lobby'>;
type UserReader = Pick<EntityManager, 'user'> | Pick<PrismaService, 'user'>;
type MemberReader = Pick<EntityManager, 'lobbyMember'>;
type RowLocker = Pick<EntityManager, '$queryRaw'>;

export async function loadLobbyById(
  em: LobbyReader,
  id: string,
): Promise<Lobby> {
  const row = await em.lobby.findUnique({
    where: { id },
    include: LOBBY_DETAIL_INCLUDE,
  });
  if (!row) {
    throw new AppError('NOT_FOUND', `Lobby ${id} not found`);
  }
  return Lobby.fromPersistence(row);
}

export async function loadLobbyByCode(
  em: LobbyReader,
  code: string,
): Promise<Lobby> {
  const row = await em.lobby.findUnique({
    where: { code },
    include: LOBBY_DETAIL_INCLUDE,
  });
  if (!row) {
    throw new AppError('NOT_FOUND', `Lobby ${code} not found`);
  }
  return Lobby.fromPersistence(row);
}

export async function requireUserProfile(
  em: UserReader,
  userId: string,
): Promise<{ displayName: string; instaPayHandle: string | null }> {
  const user = await em.user.findUnique({
    where: { id: userId },
    select: { displayName: true, instaPayHandle: true },
  });
  if (!user) {
    throw new AppError('NOT_FOUND', `User ${userId} not found`);
  }
  return user;
}

export async function findMembership(
  em: MemberReader,
  lobbyId: string,
  userId: string,
): Promise<PrismaLobbyMember | null> {
  return em.lobbyMember.findFirst({ where: { lobbyId, userId } });
}

export async function requireAdmin(
  em: MemberReader,
  lobbyId: string,
  userId: string,
): Promise<PrismaLobbyMember> {
  const membership = await findMembership(em, lobbyId, userId);
  if (!membership || membership.role !== 'admin') {
    throw new AppError(
      'FORBIDDEN',
      'Only the lobby admin can perform this action',
    );
  }
  return membership;
}

export async function assertDisplayNameAvailable(
  em: MemberReader,
  lobbyId: string,
  displayName: string,
): Promise<void> {
  const taken = await em.lobbyMember.findFirst({
    where: {
      lobbyId,
      displayName: { equals: displayName, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (taken) {
    throw new AppError('CONFLICT', DISPLAY_NAME_TAKEN_MESSAGE);
  }
}

/**
 * Serializes joins and status transitions for one lobby. Without the row lock,
 * concurrent joins can both pass the capacity check.
 */
export async function lockLobbyByCode(
  em: RowLocker,
  code: string,
): Promise<void> {
  await em.$queryRaw(
    Prisma.sql`SELECT id FROM lobbies WHERE code = ${code} FOR UPDATE`,
  );
}

export async function lockLobbyById(
  em: RowLocker,
  lobbyId: string,
): Promise<void> {
  await em.$queryRaw(
    Prisma.sql`SELECT id FROM lobbies WHERE id = ${lobbyId}::uuid FOR UPDATE`,
  );
}
