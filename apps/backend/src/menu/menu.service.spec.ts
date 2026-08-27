import { Prisma } from '@prisma/client';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { MenuService } from './menu.service';

const RESTAURANT_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-08-26T00:00:00.000Z');

function prismaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    restaurantId: RESTAURANT_ID,
    name: 'شاي',
    category: 'مشروبات',
    referencePrice: 1200n,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function buildService() {
  const prisma = {
    restaurant: { findUnique: jest.fn() },
    menuItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: { count: jest.fn() },
    runInTransaction: jest.fn(),
  };

  prisma.runInTransaction.mockImplementation(
    async (work: (em: typeof prisma) => Promise<unknown>) => work(prisma),
  );

  const service = new MenuService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('MenuService', () => {
  describe('create (MENU-02)', () => {
    it('creates an item for an existing restaurant', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.menuItem.create.mockResolvedValue(prismaRow());

      const item = await service.create(RESTAURANT_ID, {
        name: 'شاي',
        category: 'مشروبات',
        referencePrice: '12.00',
      });

      expect(item.name).toBe('شاي');
      expect(item.referencePrice.toEgpString()).toBe('12.00');
      expect(prisma.menuItem.create).toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the restaurant is missing', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.create(RESTAURANT_ID, {
          name: 'شاي',
          referencePrice: '12.00',
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('list (MENU-03)', () => {
    it('sorts by category then name and hides inactive by default', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.menuItem.findMany.mockResolvedValue([prismaRow()]);

      await service.list(RESTAURANT_ID, false);

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurantId: RESTAURANT_ID, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('includes inactive items when asked', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.menuItem.findMany.mockResolvedValue([]);

      await service.list(RESTAURANT_ID, true);

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurantId: RESTAURANT_ID },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('update (MENU-04)', () => {
    it('applies a partial patch', async () => {
      const { prisma, service } = buildService();
      prisma.menuItem.findUnique.mockResolvedValue(prismaRow());
      prisma.menuItem.update.mockResolvedValue(
        prismaRow({ name: 'شاي أحمر', referencePrice: 1500n }),
      );

      const item = await service.update(ITEM_ID, {
        name: 'شاي أحمر',
        referencePrice: '15.00',
      });

      expect(item.name).toBe('شاي أحمر');
      expect(item.referencePrice.toEgpString()).toBe('15.00');
    });
  });

  describe('remove (MENU-05)', () => {
    it('returns 409 without force when the item is referenced', async () => {
      const { prisma, service } = buildService();
      prisma.menuItem.findUnique.mockResolvedValue(prismaRow());
      prisma.orderItem.count.mockResolvedValue(2);

      await expect(service.remove(ITEM_ID, false)).rejects.toBeInstanceOf(
        AppError,
      );
      await expect(service.remove(ITEM_ID, false)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(prisma.menuItem.update).not.toHaveBeenCalled();
    });

    it('soft-deletes when force=true even if referenced', async () => {
      const { prisma, service } = buildService();
      prisma.menuItem.findUnique.mockResolvedValue(prismaRow());
      prisma.orderItem.count.mockResolvedValue(1);
      prisma.menuItem.update.mockResolvedValue(prismaRow({ isActive: false }));

      const item = await service.remove(ITEM_ID, true);
      expect(item.isActive).toBe(false);
      expect(prisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
        data: { isActive: false },
      });
    });
  });

  describe('bulkCreate (MENU-06)', () => {
    it('rejects more than 200 items', async () => {
      const { service } = buildService();
      const items = Array.from({ length: 201 }, (_, i) => ({
        name: `item-${i}`,
        referencePrice: '1.00',
      }));

      await expect(
        service.bulkCreate(RESTAURANT_ID, items),
      ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    });

    it('rejects duplicate names in the payload with row indexes', async () => {
      const { service } = buildService();

      try {
        await service.bulkCreate(RESTAURANT_ID, [
          { name: 'شاي', referencePrice: '10.00' },
          { name: 'شاي', referencePrice: '11.00' },
        ]);
        fail('expected AppError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('UNPROCESSABLE_ENTITY');
        expect((error as AppError).details).toEqual({
          errors: [
            { index: 0, message: 'Duplicate name in payload' },
            { index: 1, message: 'Duplicate name in payload' },
          ],
        });
      }
    });

    it('inserts all rows in one transaction', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.menuItem.findMany.mockResolvedValue([]);
      prisma.menuItem.create
        .mockResolvedValueOnce(prismaRow({ id: 'a', name: 'شاي' }))
        .mockResolvedValueOnce(prismaRow({ id: 'b', name: 'قهوة' }));

      const created = await service.bulkCreate(RESTAURANT_ID, [
        { name: 'شاي', referencePrice: '12.00', category: 'مشروبات' },
        { name: 'قهوة', referencePrice: '15.00', category: 'مشروبات' },
      ]);

      expect(prisma.runInTransaction).toHaveBeenCalledTimes(1);
      expect(created).toHaveLength(2);
    });

    it('maps unique violations to a per-row error', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID });
      prisma.menuItem.findMany.mockResolvedValue([]);
      prisma.menuItem.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.bulkCreate(RESTAURANT_ID, [
          { name: 'شاي', referencePrice: '12.00' },
        ]),
      ).rejects.toMatchObject({
        code: 'UNPROCESSABLE_ENTITY',
        details: {
          errors: [{ index: 0, message: 'Name already exists: شاي' }],
        },
      });
    });
  });
});
