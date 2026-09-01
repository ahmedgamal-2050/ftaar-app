import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { moneyTransformer } from '../money/money.transformer';
import { runInTransaction } from '../shared/run-in-transaction';
import { BillingService } from './billing.service';
import { FinaliseFault } from './finalise-fault';
import { LobbyAccessService } from './lobby-access.service';

const DATABASE_URL = process.env['DATABASE_URL'];

function wrapPrisma(client: PrismaClient): PrismaService {
  const wrapped = client as PrismaService;
  wrapped.moneyToDb = (value) => moneyTransformer.to(value);
  wrapped.moneyFromDb = (value) => moneyTransformer.from(value);
  wrapped.runInTransaction = (work) => runInTransaction(client, work);
  return wrapped;
}

describe('billing service (postgres)', () => {
  let prisma: PrismaClient | undefined;
  let billing: BillingService | undefined;
  let fault: FinaliseFault | undefined;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      return;
    }
    const client = new PrismaClient({
      datasourceUrl: DATABASE_URL,
    });
    try {
      await client.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`;
      await client.$queryRaw`SELECT delivered FROM order_items LIMIT 0`;
      prisma = client;
      fault = new FinaliseFault();
      const asService = wrapPrisma(client);
      billing = new BillingService(
        asService,
        new LobbyAccessService(asService),
        fault,
      );
    } catch {
      await client.$disconnect().catch(() => undefined);
      prisma = undefined;
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('drafts, patches applyToAllMatching, previews, finalises, and reopens', async () => {
    if (!prisma || !billing) {
      return;
    }
    const fx = await insertFixture(prisma);
    try {
      const draft = await billing.draft(fx.lobbyId, fx.adminUserId);
      expect(draft.groups).toHaveLength(1);
      const lineA = draft.groups[0]?.lines[0];
      const lineB = draft.groups[0]?.lines[1];
      expect(lineA && lineB).toBeTruthy();
      if (!lineA || !lineB) {
        return;
      }
      expect(lineA.suggestedActual.toPiastres()).toBe(800n);

      await billing.patchLines(fx.lobbyId, fx.adminUserId, {
        lines: [{ id: lineA.id, actualPrice: '10.00' }],
        applyToAllMatching: true,
      });
      const afterPatch = await billing.draft(fx.lobbyId, fx.adminUserId);
      const prices = afterPatch.groups[0]?.lines.map((line) =>
        line.actualPrice?.toPiastres(),
      );
      expect(prices).toEqual([1000n, 1000n]);

      const preview = await billing.preview(fx.lobbyId, fx.adminUserId, {
        deliveryFee: '1.00',
        serviceFee: '0.50',
        discount: '0',
        receiptTotal: '99.00',
      });
      expect(preview.reconciliation.warns).toBe(true);
      expect(
        preview.members.reduce((sum, row) => sum + row.total.toPiastres(), 0n),
      ).toBe(preview.total.toPiastres());

      const finalised = await billing.finalise(
        fx.lobbyId,
        fx.adminUserId,
        {
          deliveryFee: '1.00',
          serviceFee: '0.50',
          discount: '0',
          receiptTotal: '99.00',
        },
        'idem-1',
      );
      expect(finalised.status).toBe('billed');
      const again = await billing.finalise(
        fx.lobbyId,
        fx.adminUserId,
        {
          deliveryFee: '1.00',
          serviceFee: '0.50',
          discount: '0',
        },
        'idem-1',
      );
      expect(again.status).toBe('billed');

      const asMember = await billing.getBill(fx.lobbyId, fx.memberUserId);
      expect(asMember.members).toHaveLength(2);

      await billing.reopen(fx.lobbyId, fx.adminUserId);
      const lobby = await prisma.lobby.findUnique({
        where: { id: fx.lobbyId },
      });
      expect(lobby?.status).toBe('locked');
    } finally {
      await deleteFixture(prisma, fx);
    }
  });

  it('rejects incomplete prices and locks reopen after a paid member', async () => {
    if (!prisma || !billing) {
      return;
    }
    const fx = await insertFixture(prisma, { leaveUnpriced: true });
    try {
      await expect(
        billing.finalise(fx.lobbyId, fx.adminUserId, {
          deliveryFee: '0',
          serviceFee: '0',
          discount: '0',
        }),
      ).rejects.toMatchObject({ code: 'PRICES_INCOMPLETE' });

      await prisma.orderItem.updateMany({
        where: { lobbyId: fx.lobbyId },
        data: { actualPrice: 100n },
      });
      await billing.finalise(fx.lobbyId, fx.adminUserId, {
        deliveryFee: '0',
        serviceFee: '0',
        discount: '0',
      });
      await prisma.lobbyMember.update({
        where: { id: fx.adminMemberId },
        data: { paymentStatus: 'paid' },
      });
      await expect(
        billing.reopen(fx.lobbyId, fx.adminUserId),
      ).rejects.toBeInstanceOf(AppError);
      await expect(
        billing.reopen(fx.lobbyId, fx.adminUserId),
      ).rejects.toMatchObject({
        code: 'BILL_LOCKED',
      });
    } finally {
      await deleteFixture(prisma, fx);
    }
  });

  it('rolls back finalise when a fault is injected (BILL-15)', async () => {
    if (!prisma || !billing || !fault) {
      return;
    }
    const fx = await insertFixture(prisma);
    try {
      await billing.patchLines(fx.lobbyId, fx.adminUserId, {
        lines: [
          { id: fx.lineAdminId, actualPrice: '8.00' },
          { id: fx.lineMemberId, actualPrice: '8.00' },
        ],
      });
      for (const point of [
        'after-bill',
        'after-lines',
        'after-members',
        'after-status',
      ] as const) {
        fault.point = point;
        await expect(
          billing.finalise(fx.lobbyId, fx.adminUserId, {
            deliveryFee: '0',
            serviceFee: '0',
            discount: '0',
          }),
        ).rejects.toThrow(/injected finalise failure/);
        const bills = await prisma.lobbyBill.count({
          where: { lobbyId: fx.lobbyId },
        });
        const lobby = await prisma.lobby.findUnique({
          where: { id: fx.lobbyId },
        });
        expect(bills).toBe(0);
        expect(lobby?.status).toBe('locked');
      }
      fault.point = null;
    } finally {
      await deleteFixture(prisma, fx);
    }
  });
});

interface Fixture {
  restaurantId: string;
  lobbyId: string;
  adminUserId: string;
  memberUserId: string;
  adminMemberId: string;
  memberMemberId: string;
  lineAdminId: string;
  lineMemberId: string;
  menuItemId: string;
}

async function insertFixture(
  prisma: PrismaClient,
  options?: { leaveUnpriced?: boolean },
): Promise<Fixture> {
  const suffix = randomUUID().slice(0, 8);
  const restaurantId = randomUUID();
  const lobbyId = randomUUID();
  const adminUserId = randomUUID();
  const memberUserId = randomUUID();
  const adminMemberId = randomUUID();
  const memberMemberId = randomUUID();
  const menuItemId = randomUUID();
  const lineAdminId = randomUUID();
  const lineMemberId = randomUUID();

  await prisma.restaurant.create({
    data: { id: restaurantId, name: `bill-${suffix}` },
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
        email: `admin-${suffix}@bill.test`,
        displayName: 'Admin',
      },
      {
        id: memberUserId,
        kind: 'registered',
        email: `member-${suffix}@bill.test`,
        displayName: 'Member',
      },
    ],
  });
  await prisma.lobby.create({
    data: {
      id: lobbyId,
      restaurantId,
      code: `B${suffix}`,
      status: 'locked',
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
  const price = options?.leaveUnpriced ? null : 800n;
  await prisma.orderItem.createMany({
    data: [
      {
        id: lineAdminId,
        lobbyId,
        lobbyMemberId: adminMemberId,
        menuItemId,
        restaurantId,
        qty: 1,
        actualPrice: price,
        delivered: true,
      },
      {
        id: lineMemberId,
        lobbyId,
        lobbyMemberId: memberMemberId,
        menuItemId,
        restaurantId,
        qty: 1,
        actualPrice: price,
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
    lineAdminId,
    lineMemberId,
    menuItemId,
  };
}

async function deleteFixture(prisma: PrismaClient, fx: Fixture): Promise<void> {
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
