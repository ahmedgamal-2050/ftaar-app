import { Prisma } from '@prisma/client';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { RestaurantsService } from './restaurants.service';

const ID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-08-28T00:00:00.000Z');

function restaurantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'مطعم الفحام',
    phone: '+201001111111',
    image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
    note: 'مشويات على الفحم',
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function buildService() {
  const prisma = {
    restaurant: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lobby: { count: jest.fn() },
  };
  const service = new RestaurantsService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('RestaurantsService', () => {
  describe('list (REST-01, REST-02)', () => {
    it('excludes inactive restaurants by default', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.count.mockResolvedValue(1);
      prisma.restaurant.findMany.mockResolvedValue([restaurantRow()]);

      await service.list({ search: 'كبسة', page: 1, limit: 20 });

      expect(prisma.restaurant.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          name: { contains: 'كبسة', mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      });
    });

    it('caps limit at 100', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.count.mockResolvedValue(0);
      prisma.restaurant.findMany.mockResolvedValue([]);

      const result = await service.list({ page: 2, limit: 500 });

      expect(result.limit).toBe(100);
      expect(prisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100, take: 100 }),
      );
    });

    it('can include inactive when asked', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.count.mockResolvedValue(0);
      prisma.restaurant.findMany.mockResolvedValue([]);

      await service.list({ includeInactive: true });

      expect(prisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('create (REST-03)', () => {
    it('creates a restaurant after trimming fields', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.create.mockResolvedValue(restaurantRow());

      const created = await service.create({
        name: '  مطعم الفحام  ',
        phone: '  +201001111111  ',
        image: '  https://cdn.ftaar.example/restaurants/alfaham.jpg  ',
        note: '  مشويات على الفحم  ',
      });
      expect(created.name).toBe('مطعم الفحام');
      expect(created.phone).toBe('+201001111111');
      expect(created.image).toBe(
        'https://cdn.ftaar.example/restaurants/alfaham.jpg',
      );
      expect(created.note).toBe('مشويات على الفحم');
      expect(prisma.restaurant.create).toHaveBeenCalledWith({
        data: {
          name: 'مطعم الفحام',
          phone: '+201001111111',
          image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
          note: 'مشويات على الفحم',
          isActive: true,
        },
      });
    });

    it('stores an omitted note as null', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.create.mockResolvedValue(restaurantRow({ note: null }));

      await service.create({
        name: 'مطعم الفحام',
        phone: '+201001111111',
        image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
      });

      expect(prisma.restaurant.create).toHaveBeenCalledWith({
        data: {
          name: 'مطعم الفحام',
          phone: '+201001111111',
          image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
          note: null,
          isActive: true,
        },
      });
    });

    it('rejects names shorter than 2 characters', async () => {
      const { service } = buildService();
      await expect(
        service.create({
          name: 'ا',
          phone: '+201001111111',
          image: 'https://cdn.ftaar.example/r.jpg',
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });

    it('returns a field-error list when multiple trimmed values are invalid', async () => {
      const { service } = buildService();

      await expect(
        service.create({
          name: ' ',
          phone: ' ',
          image: ' ',
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: {
          errors: [
            {
              path: 'name',
              code: 'MIN_LENGTH',
              message: 'name must be at least 2 characters',
              meta: { min: 2 },
            },
            {
              path: 'phone',
              code: 'MIN_LENGTH',
              message: 'phone must be at least 5 characters',
              meta: { min: 5 },
            },
            { path: 'image', code: 'REQUIRED', message: 'image is required' },
          ],
        },
      });
    });
  });

  describe('findById (REST-06)', () => {
    it('returns active menu sorted by category then name', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({
        ...restaurantRow(),
        menuItems: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            restaurantId: ID,
            name: 'شاي',
            category: 'مشروبات',
            referencePrice: 1200n,
            isActive: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      });

      const result = await service.findById(ID, false, false);
      expect(result.menu[0]?.name).toBe('شاي');
      expect(prisma.restaurant.findFirst).toHaveBeenCalledWith({
        where: { id: ID, isActive: true },
        include: {
          menuItems: {
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
          },
        },
      });
    });

    it('404s when the restaurant is inactive and inactive rows are hidden', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue(null);
      await expect(service.findById(ID, false, false)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('update (REST-04)', () => {
    it('applies a partial patch including phone, image, and note', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: ID });
      prisma.restaurant.update.mockResolvedValue(
        restaurantRow({
          name: 'ديوان الشام',
          phone: '+201009876543',
          image: 'https://cdn.ftaar.example/restaurants/diwan.jpg',
          note: null,
        }),
      );

      const updated = await service.update(ID, {
        name: 'ديوان الشام',
        phone: '+201009876543',
        image: 'https://cdn.ftaar.example/restaurants/diwan.jpg',
        note: '',
      });
      expect(updated.name).toBe('ديوان الشام');
      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: {
          name: 'ديوان الشام',
          phone: '+201009876543',
          image: 'https://cdn.ftaar.example/restaurants/diwan.jpg',
          note: null,
        },
      });
    });

    it('returns field-error list for invalid patched fields after trim', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: ID });

      await expect(
        service.update(ID, {
          name: ' ',
          phone: ' ',
          image: ' ',
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: {
          errors: [
            {
              path: 'name',
              code: 'MIN_LENGTH',
              message: 'name must be at least 2 characters',
              meta: { min: 2 },
            },
            {
              path: 'phone',
              code: 'MIN_LENGTH',
              message: 'phone must be at least 5 characters',
              meta: { min: 5 },
            },
            { path: 'image', code: 'REQUIRED', message: 'image is required' },
          ],
        },
      });
      expect(prisma.restaurant.update).not.toHaveBeenCalled();
    });
  });

  describe('remove (REST-05)', () => {
    it('returns 409 when an active lobby references the restaurant', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: ID });
      prisma.lobby.count.mockResolvedValue(1);

      await expect(service.remove(ID)).rejects.toBeInstanceOf(AppError);
      await expect(service.remove(ID)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(prisma.restaurant.update).not.toHaveBeenCalled();
    });

    it('soft-deletes when no active lobby references it', async () => {
      const { prisma, service } = buildService();
      prisma.restaurant.findFirst.mockResolvedValue({ id: ID });
      prisma.lobby.count.mockResolvedValue(0);
      prisma.restaurant.update.mockResolvedValue(
        restaurantRow({ isActive: false }),
      );

      const removed = await service.remove(ID);
      expect(removed.isActive).toBe(false);
      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: { isActive: false },
      });
    });
  });

  it('maps unique name conflicts to ALREADY_EXISTS', async () => {
    const { prisma, service } = buildService();
    prisma.restaurant.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create({
        name: 'مطعم الفحام',
        phone: '+201001111111',
        image: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
      }),
    ).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
    });
  });
});
