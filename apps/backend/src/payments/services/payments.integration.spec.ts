import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { BillingService } from '../../billing/billing.service';
import { FinaliseFault } from '../../billing/finalise-fault';
import { LobbyAccessService } from '../../billing/lobby-access.service';
import { PrismaService } from '../../database/prisma.service';
import { moneyTransformer } from '../../money/money.transformer';
import { lockLobbyRow } from '../../shared/lock-lobby';
import { runInTransaction } from '../../shared/run-in-transaction';
import { PaymentsService } from './payments.service';

const DATABASE_URL = process.env['DATABASE_URL'];
const SKIP_DB = process.env['SKIP_DB'] === 'true';

type PaymentsPrisma = PrismaClient & {
  paymentClaim: {
    deleteMany(args: { where: { lobbyId: string } }): Promise<unknown>;
  };
};

function wrapPrisma(client: PrismaClient): PrismaService {
  const wrapped = client as PrismaService;
  wrapped.moneyToDb = (value) => moneyTransformer.to(value);
  wrapped.moneyFromDb = (value) => moneyTransformer.from(value);
  wrapped.runInTransaction = (work) => runInTransaction(client, work);
  return wrapped;
}

describe('payments service (postgres)', () => {
  let prisma: PaymentsPrisma | undefined;
  let billing: BillingService | undefined;
  let payments: PaymentsService | undefined;

  beforeAll(async () => {
    if (!DATABASE_URL || SKIP_DB) {
      return;
    }
    const client = new PrismaClient({ datasourceUrl: DATABASE_URL });
    try {
      await client.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`;
      await client.$queryRaw`SELECT status FROM payment_claims LIMIT 0`;
      prisma = client as PaymentsPrisma;
      const asService = wrapPrisma(client);
      const access = new LobbyAccessService(asService);
      billing = new BillingService(asService, access, new FinaliseFault());
      payments = new PaymentsService(asService, access, billing);
    } catch {
      await client.$disconnect().catch(() => undefined);
      prisma = undefined;
    }
  }, 30_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('claims, rejects, re-claims, confirms, and settles', async () => {
    if (!prisma || !billing || !payments) {
      return;
    }
    const fx = await insertFixture(prisma);
    try {
      await billing.finalise(fx.lobbyId, fx.adminUserId, {
        deliveryFee: '0',
        serviceFee: '0',
        discount: '0',
      });

      await expect(
        payments.claim(fx.lobbyId, fx.adminUserId, {}),
      ).rejects.toMatchObject({ code: 'CANNOT_CLAIM_AS_HOST' });

      const claimed = await payments.claim(fx.lobbyId, fx.memberUserId, {
        note: 'sent',
      });
      expect(claimed.you.paymentStatus).toBe('pending');

      const again = await payments.claim(fx.lobbyId, fx.memberUserId, {});
      expect(again.you.paymentStatus).toBe('pending');

      await payments.reject(fx.lobbyId, fx.memberMemberId, fx.adminUserId, {
        note: 'wrong amount',
      });
      const afterReject = await payments.getBoard(fx.lobbyId, fx.memberUserId);
      expect(afterReject.you.paymentStatus).toBe('unpaid');

      await payments.claim(fx.lobbyId, fx.memberUserId, {});
      await expect(
        payments.settle(fx.lobbyId, fx.adminUserId),
      ).rejects.toMatchObject({ code: 'SETTLEMENT_INCOMPLETE' });

      const confirmed = await payments.confirm(
        fx.lobbyId,
        fx.memberMemberId,
        fx.adminUserId,
        {},
      );
      expect(confirmed.waitingOn).toEqual([]);

      const settled = await payments.settle(fx.lobbyId, fx.adminUserId);
      expect(settled.status).toBe('settled');

      await expect(
        payments.claim(fx.lobbyId, fx.memberUserId, {}),
      ).rejects.toMatchObject({ code: 'LOBBY_SETTLED' });
    } finally {
      await deleteFixture(prisma, fx);
    }
  }, 60_000);

  /**
   * The lock primitive itself. Without `FOR UPDATE`, both transactions read
   * the same "before" row under READ COMMITTED and the second one's view is
   * already stale by the time it acts on it. Holding the lock forces the
   * second to wait for the first to commit, which is what every
   * settle/reopen/confirm ordering below relies on.
   */
  it('lockLobbyRow serialises two transactions on the same lobby', async () => {
    if (!prisma) {
      return;
    }
    const fx = await insertFixture(prisma);
    const client = prisma as PrismaClient;
    try {
      const order: string[] = [];
      let observedBySecond: string | null = null;

      const first = client.$transaction(async (tx) => {
        await lockLobbyRow(tx, fx.lobbyId);
        order.push('first:locked');
        // Long enough that the second transaction is provably waiting on the
        // lock rather than simply losing a scheduling coin flip.
        await new Promise((resolve) => setTimeout(resolve, 400));
        await tx.lobby.update({
          where: { id: fx.lobbyId },
          data: { instaPayHandle: 'written.by.first' },
        });
        order.push('first:committed');
      });

      await new Promise((resolve) => setTimeout(resolve, 80));

      const second = client.$transaction(async (tx) => {
        await lockLobbyRow(tx, fx.lobbyId);
        order.push('second:locked');
        const row = await tx.lobby.findUnique({
          where: { id: fx.lobbyId },
          select: { instaPayHandle: true },
        });
        observedBySecond = row?.instaPayHandle ?? null;
      });

      await Promise.all([first, second]);

      expect(order).toEqual([
        'first:locked',
        'first:committed',
        'second:locked',
      ]);
      // The whole point: the second transaction sees the first's write.
      expect(observedBySecond).toBe('written.by.first');
    } finally {
      await deleteFixture(prisma, fx);
    }
  }, 60_000);

  /**
   * Criterion: a race between un-paying and closing out must never leave the
   * lobby settled with money still owed. Fires the two mutations that move a
   * member in opposite directions at the same instant and asserts the
   * invariant on whatever final state they land in.
   */
  it('never settles while an owing member is unpaid, even under a concurrent resolve', async () => {
    if (!prisma || !billing || !payments) {
      return;
    }
    const fx = await insertFixture(prisma);
    const client = prisma as PrismaClient;
    try {
      await billing.finalise(fx.lobbyId, fx.adminUserId, {
        deliveryFee: '0',
        serviceFee: '0',
        discount: '0',
      });
      await payments.claim(fx.lobbyId, fx.memberUserId, {});

      // Reject un-pays the member; settle tries to close out. Whichever wins,
      // the invariant below must hold.
      await Promise.allSettled([
        payments.reject(fx.lobbyId, fx.memberMemberId, fx.adminUserId, {}),
        payments.settle(fx.lobbyId, fx.adminUserId),
      ]);

      const lobby = await client.lobby.findUniqueOrThrow({
        where: { id: fx.lobbyId },
        select: { status: true },
      });
      const board = await payments.getBoard(fx.lobbyId, fx.adminUserId);

      if (lobby.status === 'settled') {
        expect(board.waitingOn).toEqual([]);
        // And nothing may change afterwards.
        await expect(
          payments.claim(fx.lobbyId, fx.memberUserId, {}),
        ).rejects.toMatchObject({ code: 'LOBBY_SETTLED' });
        await expect(
          payments.confirm(fx.lobbyId, fx.memberMemberId, fx.adminUserId, {}),
        ).rejects.toMatchObject({ code: 'LOBBY_SETTLED' });
        await expect(
          payments.settle(fx.lobbyId, fx.adminUserId),
        ).rejects.toMatchObject({ code: 'LOBBY_SETTLED' });
      } else {
        // Not settled: the member was un-paid, so they must still be owing.
        expect(board.waitingOn.length).toBeGreaterThan(0);
      }
    } finally {
      await deleteFixture(prisma, fx);
    }
  }, 60_000);
});

interface Fixture {
  restaurantId: string;
  lobbyId: string;
  adminUserId: string;
  memberUserId: string;
  adminMemberId: string;
  memberMemberId: string;
}

async function insertFixture(prisma: PrismaClient): Promise<Fixture> {
  const suffix = randomUUID().slice(0, 8);
  const restaurantId = randomUUID();
  const lobbyId = randomUUID();
  const adminUserId = randomUUID();
  const memberUserId = randomUUID();
  const adminMemberId = randomUUID();
  const memberMemberId = randomUUID();
  const menuItemId = randomUUID();

  await prisma.restaurant.create({
    data: { id: restaurantId, name: `pay-${suffix}` },
  });
  await prisma.menuItem.create({
    data: {
      id: menuItemId,
      restaurantId,
      name: 'كشري',
      referencePrice: 800n,
    },
  });
  await prisma.user.createMany({
    data: [
      {
        id: adminUserId,
        kind: 'registered',
        email: `admin-${suffix}@pay.test`,
        displayName: 'Admin',
      },
      {
        id: memberUserId,
        kind: 'registered',
        email: `member-${suffix}@pay.test`,
        displayName: 'Member',
      },
    ],
  });
  await prisma.lobby.create({
    data: {
      id: lobbyId,
      restaurantId,
      code: `P${suffix}`,
      status: 'locked',
      instaPayHandle: 'host.instapay',
    },
  });
  await prisma.lobbyMember.createMany({
    data: [
      {
        id: adminMemberId,
        lobbyId,
        userId: adminUserId,
        role: 'admin',
        displayName: 'Admin',
      },
      {
        id: memberMemberId,
        lobbyId,
        userId: memberUserId,
        role: 'member',
        displayName: 'Member',
      },
    ],
  });
  await prisma.orderItem.createMany({
    data: [
      {
        lobbyId,
        lobbyMemberId: adminMemberId,
        menuItemId,
        restaurantId,
        qty: 1,
        actualPrice: 800n,
        delivered: true,
      },
      {
        lobbyId,
        lobbyMemberId: memberMemberId,
        menuItemId,
        restaurantId,
        qty: 1,
        actualPrice: 800n,
        delivered: true,
      },
    ],
  });
  return {
    restaurantId,
    lobbyId,
    adminUserId,
    memberUserId,
    adminMemberId,
    memberMemberId,
  };
}

async function deleteFixture(
  prisma: PaymentsPrisma,
  fx: Fixture,
): Promise<void> {
  await prisma.paymentClaim.deleteMany({ where: { lobbyId: fx.lobbyId } });
  await prisma.orderItem.deleteMany({ where: { lobbyId: fx.lobbyId } });
  await prisma.lobbyBill.deleteMany({ where: { lobbyId: fx.lobbyId } });
  await prisma.lobbyMember.deleteMany({ where: { lobbyId: fx.lobbyId } });
  await prisma.lobby.deleteMany({ where: { id: fx.lobbyId } });
  await prisma.user.deleteMany({
    where: { id: { in: [fx.adminUserId, fx.memberUserId] } },
  });
  await prisma.menuItem.deleteMany({
    where: { restaurantId: fx.restaurantId },
  });
  await prisma.restaurant.deleteMany({ where: { id: fx.restaurantId } });
}
