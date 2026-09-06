import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from './orders.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LOBBY_ID = '22222222-2222-4222-8222-222222222222';
const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const MEMBER_ID = '44444444-4444-4444-8444-444444444444';
const MENU_ITEM_ID = '55555555-5555-4555-8555-555555555555';
const ORDER_ITEM_ID = '66666666-6666-4666-8666-666666666666';
const NOW = new Date('2026-08-26T00:00:00.000Z');

function buildService() {
  const prisma = {
    lobby: { findUnique: jest.fn() },
    lobbyMember: { findUnique: jest.fn() },
    menuItem: { findFirst: jest.fn() },
    orderItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const service = new OrdersService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('OrdersService', () => {
  describe('addItem', () => {
    it('adds a new order item to open lobby using reference price', async () => {
      const { prisma, service } = buildService();

      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'open',
        restaurantId: RESTAURANT_ID,
      });
      prisma.lobbyMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        lobbyId: LOBBY_ID,
        userId: USER_ID,
      });
      prisma.menuItem.findFirst.mockResolvedValue({
        id: MENU_ITEM_ID,
        restaurantId: RESTAURANT_ID,
        isActive: true,
        referencePrice: 2500n, // 25.00 EGP
      });
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.orderItem.create.mockResolvedValue({
        id: ORDER_ITEM_ID,
        lobbyId: LOBBY_ID,
        lobbyMemberId: MEMBER_ID,
        menuItemId: MENU_ITEM_ID,
        restaurantId: RESTAURANT_ID,
        qty: 2,
        actualPrice: 2500n,
        createdAt: NOW,
      });
      prisma.orderItem.findMany.mockResolvedValue([
        {
          id: ORDER_ITEM_ID,
          lobbyId: LOBBY_ID,
          lobbyMemberId: MEMBER_ID,
          menuItemId: MENU_ITEM_ID,
          restaurantId: RESTAURANT_ID,
          qty: 2,
          actualPrice: 2500n,
          createdAt: NOW,
          menuItem: {
            id: MENU_ITEM_ID,
            name: 'فول',
            category: 'أطباق',
          },
        },
      ]);

      const result = await service.addItem(USER_ID, LOBBY_ID, {
        menuItemId: MENU_ITEM_ID,
        qty: 2,
      });

      expect(prisma.orderItem.create).toHaveBeenCalledWith({
        data: {
          lobbyId: LOBBY_ID,
          lobbyMemberId: MEMBER_ID,
          menuItemId: MENU_ITEM_ID,
          restaurantId: RESTAURANT_ID,
          qty: 2,
          actualPrice: 2500n,
        },
      });
      expect(result.items).toHaveLength(1);
      expect(result.subtotal).toBe('50.00');
    });

    it('inherits updated lobby price when another member item has been overridden', async () => {
      const { prisma, service } = buildService();

      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'open',
        restaurantId: RESTAURANT_ID,
      });
      prisma.lobbyMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        lobbyId: LOBBY_ID,
        userId: USER_ID,
      });
      prisma.menuItem.findFirst.mockResolvedValue({
        id: MENU_ITEM_ID,
        restaurantId: RESTAURANT_ID,
        isActive: true,
        referencePrice: 2000n, // 20.00 EGP default
      });
      // Existing item in lobby has overridden price of 3000n (30.00 EGP)
      prisma.orderItem.findFirst
        .mockResolvedValueOnce({
          id: 'existing-lobby-item',
          lobbyId: LOBBY_ID,
          menuItemId: MENU_ITEM_ID,
          actualPrice: 3000n,
        })
        .mockResolvedValueOnce(null); // no existing item for current user

      prisma.orderItem.create.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue([]);

      await service.addItem(USER_ID, LOBBY_ID, {
        menuItemId: MENU_ITEM_ID,
        qty: 1,
      });

      expect(prisma.orderItem.create).toHaveBeenCalledWith({
        data: {
          lobbyId: LOBBY_ID,
          lobbyMemberId: MEMBER_ID,
          menuItemId: MENU_ITEM_ID,
          restaurantId: RESTAURANT_ID,
          qty: 1,
          actualPrice: 3000n, // inherited 30.00 EGP
        },
      });
    });

    it('throws CONFLICT if lobby is not open', async () => {
      const { prisma, service } = buildService();
      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'locked',
      });

      await expect(
        service.addItem(USER_ID, LOBBY_ID, {
          menuItemId: MENU_ITEM_ID,
          qty: 1,
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateItem', () => {
    it('updates quantity of an existing item', async () => {
      const { prisma, service } = buildService();

      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'open',
      });
      prisma.lobbyMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        lobbyId: LOBBY_ID,
        userId: USER_ID,
      });
      prisma.orderItem.findFirst.mockResolvedValue({
        id: ORDER_ITEM_ID,
        lobbyId: LOBBY_ID,
        lobbyMemberId: MEMBER_ID,
      });
      prisma.orderItem.update.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.updateItem(
        USER_ID,
        LOBBY_ID,
        ORDER_ITEM_ID,
        {
          qty: 5,
        },
      );

      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: ORDER_ITEM_ID },
        data: { qty: 5 },
      });
      expect(result.items).toEqual([]);
    });
  });

  describe('removeItem', () => {
    it('deletes an item from the order', async () => {
      const { prisma, service } = buildService();

      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'open',
      });
      prisma.lobbyMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        lobbyId: LOBBY_ID,
        userId: USER_ID,
      });
      prisma.orderItem.findFirst.mockResolvedValue({
        id: ORDER_ITEM_ID,
        lobbyId: LOBBY_ID,
        lobbyMemberId: MEMBER_ID,
      });
      prisma.orderItem.delete.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.removeItem(USER_ID, LOBBY_ID, ORDER_ITEM_ID);

      expect(prisma.orderItem.delete).toHaveBeenCalledWith({
        where: { id: ORDER_ITEM_ID },
      });
      expect(result.items).toEqual([]);
    });
  });

  describe('overridePrice (Lobby-wide)', () => {
    it('allows lobby admin to override menu item price across all lobby orders', async () => {
      const { prisma, service } = buildService();

      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'open',
        restaurantId: RESTAURANT_ID,
      });
      prisma.lobbyMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        lobbyId: LOBBY_ID,
        userId: USER_ID,
        role: 'admin',
      });
      prisma.menuItem.findFirst.mockResolvedValue({
        id: MENU_ITEM_ID,
        restaurantId: RESTAURANT_ID,
      });
      prisma.orderItem.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.overridePrice(
        USER_ID,
        LOBBY_ID,
        MENU_ITEM_ID,
        { actualPrice: '35.00' },
      );

      expect(prisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: { lobbyId: LOBBY_ID, menuItemId: MENU_ITEM_ID },
        data: { actualPrice: 3500n },
      });
      expect(result).toEqual({
        lobbyId: LOBBY_ID,
        menuItemId: MENU_ITEM_ID,
        updatedCount: 3,
        newPrice: '35.00',
      });
    });

    it('rejects price override if user is not admin', async () => {
      const { prisma, service } = buildService();

      prisma.lobby.findUnique.mockResolvedValue({
        id: LOBBY_ID,
        status: 'open',
      });
      prisma.lobbyMember.findUnique.mockResolvedValue({
        id: MEMBER_ID,
        lobbyId: LOBBY_ID,
        userId: USER_ID,
        role: 'member',
      });

      await expect(
        service.overridePrice(USER_ID, LOBBY_ID, MENU_ITEM_ID, {
          actualPrice: '30.00',
        }),
      ).rejects.toThrow(AppError);
    });
  });
});
