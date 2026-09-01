import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { LobbiesService } from '../services/lobbies.service';
import { LobbyMembersService } from '../services/lobby-members.service';

export const LOBBY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
export const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
export const GUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
export const MEMBER_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
export const GUEST_MEMBER_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';
export const RESTAURANT_ID = '11111111-1111-4111-8111-111111111111';
export const NOW = new Date('2026-08-30T12:00:00.000Z');

export function restaurantRow() {
  return {
    id: RESTAURANT_ID,
    name: 'مطعم الفحام',
    phone: '+201001111111',
    image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
    note: 'مشويات على الفحم',
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MEMBER_ID,
    lobbyId: LOBBY_ID,
    userId: USER_ID,
    role: 'admin',
    displayName: 'أحمد',
    createdAt: NOW,
    ...overrides,
  };
}

export function guestMemberRow(overrides: Record<string, unknown> = {}) {
  return memberRow({
    id: GUEST_MEMBER_ID,
    userId: GUEST_ID,
    role: 'member',
    displayName: 'ضيف',
    ...overrides,
  });
}

export function lobbyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LOBBY_ID,
    restaurantId: RESTAURANT_ID,
    code: 'B12F7K',
    status: 'open',
    maxMembers: 8,
    expiresAt: new Date('2026-08-30T13:00:00.000Z'),
    instaPayHandle: 'ahmed.gamal',
    createdAt: NOW,
    updatedAt: NOW,
    restaurant: restaurantRow(),
    members: [memberRow()],
    ...overrides,
  };
}

export function uniqueError(target: string | string[]) {
  return new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

function buildPrismaMock() {
  const prisma = {
    restaurant: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    lobby: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lobbyMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: LOBBY_ID }]),
    runInTransaction: jest.fn(),
  };

  prisma.runInTransaction.mockImplementation(
    async (work: (em: typeof prisma) => Promise<unknown>) => work(prisma),
  );

  return prisma;
}

export function buildService() {
  const prisma = buildPrismaMock();
  const service = new LobbiesService(prisma as unknown as PrismaService);
  return { prisma, service };
}

export function buildMembersService() {
  const prisma = buildPrismaMock();
  const service = new LobbyMembersService(prisma as unknown as PrismaService);
  return { prisma, service };
}

export function useFrozenClock() {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}
