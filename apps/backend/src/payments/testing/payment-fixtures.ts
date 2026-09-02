import { Money } from '../../money/money';
import type { PrismaService } from '../../database/prisma.service';
import { PaymentsService } from '../services/payments.service';

export const LOBBY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
export const ADMIN_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
export const MEMBER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
export const ADMIN_MEMBER_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
export const MEMBER_MEMBER_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8'; // billed seed member; keep in sync with seed.ts
export const NOW = new Date('2026-09-02T12:00:00.000Z');

export function adminMember(overrides: Record<string, unknown> = {}) {
  return {
    id: ADMIN_MEMBER_ID,
    lobbyId: LOBBY_ID,
    userId: ADMIN_USER_ID,
    role: 'admin',
    displayName: 'عمر',
    paymentStatus: 'unpaid',
    createdAt: NOW,
    lobby: { id: LOBBY_ID, status: 'billed' },
    ...overrides,
  };
}

export function owingMember(overrides: Record<string, unknown> = {}) {
  return {
    id: MEMBER_MEMBER_ID,
    lobbyId: LOBBY_ID,
    userId: MEMBER_USER_ID,
    role: 'member',
    displayName: 'لينا',
    paymentStatus: 'unpaid',
    createdAt: NOW,
    lobby: { id: LOBBY_ID, status: 'billed' },
    ...overrides,
  };
}

export function billPayload() {
  return {
    total: Money.fromEgpString('24.00'),
    members: [
      {
        id: ADMIN_MEMBER_ID,
        userId: ADMIN_USER_ID,
        displayName: 'عمر',
        role: 'admin' as const,
        itemsSubtotal: Money.fromEgpString('16.00'),
        feesShare: Money.zero(),
        total: Money.fromEgpString('16.00'),
        paymentStatus: 'unpaid' as const,
      },
      {
        id: MEMBER_MEMBER_ID,
        userId: MEMBER_USER_ID,
        displayName: 'لينا',
        role: 'member' as const,
        itemsSubtotal: Money.fromEgpString('8.00'),
        feesShare: Money.zero(),
        total: Money.fromEgpString('8.00'),
        paymentStatus: 'unpaid' as const,
      },
    ],
  };
}

export function buildPaymentsService() {
  const prisma = {
    lobby: { findUnique: jest.fn(), update: jest.fn() },
    lobbyMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    lobbyBill: { update: jest.fn() },
    paymentClaim: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    runInTransaction: jest.fn(),
  };
  prisma.runInTransaction.mockImplementation(
    async (work: (em: typeof prisma) => Promise<unknown>) => work(prisma),
  );

  const access = {
    requireMember: jest.fn(),
    requireAdmin: jest.fn(),
  };
  const billing = {
    readFinalisedBill: jest.fn().mockResolvedValue(billPayload()),
  };

  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    access as never,
    billing as never,
  );
  return { prisma, access, billing, service };
}
