import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersService } from './orders.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LOBBY_ID = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '33333333-3333-4333-8333-333333333333';

describe('OrdersControllers', () => {
  let service: jest.Mocked<OrdersService>;
  let controller: OrdersController;
  let adminController: OrdersAdminController;

  beforeEach(() => {
    service = {
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      findMine: jest.fn(),
      listForLobby: jest.fn(),
      getAggregatedOrderSummary: jest.fn(),
      overridePrice: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;

    controller = new OrdersController(service);
    adminController = new OrdersAdminController(service);
  });

  describe('OrdersController', () => {
    it('delegates addItem to service', async () => {
      const dto = { menuItemId: ITEM_ID, qty: 1 };
      service.addItem.mockResolvedValue({ items: [], subtotal: '0.00' });

      await controller.addItem(USER_ID, LOBBY_ID, dto);

      expect(service.addItem).toHaveBeenCalledWith(USER_ID, LOBBY_ID, dto);
    });

    it('delegates updateItem to service', async () => {
      const dto = { qty: 3 };
      service.updateItem.mockResolvedValue({ items: [], subtotal: '0.00' });

      await controller.updateItem(USER_ID, LOBBY_ID, ITEM_ID, dto);

      expect(service.updateItem).toHaveBeenCalledWith(
        USER_ID,
        LOBBY_ID,
        ITEM_ID,
        dto,
      );
    });

    it('delegates removeItem to service', async () => {
      service.removeItem.mockResolvedValue({ items: [], subtotal: '0.00' });

      await controller.removeItem(USER_ID, LOBBY_ID, ITEM_ID);

      expect(service.removeItem).toHaveBeenCalledWith(
        USER_ID,
        LOBBY_ID,
        ITEM_ID,
      );
    });

    it('delegates findMine to service via /orders/items endpoint', async () => {
      service.findMine.mockResolvedValue({ items: [], subtotal: '0.00' });

      await controller.findMine(USER_ID, LOBBY_ID);

      expect(service.findMine).toHaveBeenCalledWith(USER_ID, LOBBY_ID);
    });
  });

  describe('OrdersAdminController', () => {
    it('delegates listForLobby to service', async () => {
      service.listForLobby.mockResolvedValue({
        lobbyId: LOBBY_ID,
        items: [],
        subtotal: '0.00',
      });

      await adminController.listForLobby(USER_ID, LOBBY_ID);

      expect(service.listForLobby).toHaveBeenCalledWith(USER_ID, LOBBY_ID);
    });

    it('delegates getSummary to service', async () => {
      service.getAggregatedOrderSummary.mockResolvedValue({
        lobbyId: LOBBY_ID,
        totalItemsCount: 6,
        grandTotal: '60.00',
        items: [],
      });

      await adminController.getSummary(USER_ID, LOBBY_ID);

      expect(service.getAggregatedOrderSummary).toHaveBeenCalledWith(
        USER_ID,
        LOBBY_ID,
      );
    });

    it('delegates overrideMenuItemPrice to service', async () => {
      const dto = { actualPrice: '35.00' };
      service.overridePrice.mockResolvedValue({
        lobbyId: LOBBY_ID,
        menuItemId: ITEM_ID,
        updatedCount: 2,
        newPrice: '35.00',
      });

      await adminController.overrideMenuItemPrice(
        USER_ID,
        LOBBY_ID,
        ITEM_ID,
        dto,
      );

      expect(service.overridePrice).toHaveBeenCalledWith(
        USER_ID,
        LOBBY_ID,
        ITEM_ID,
        dto,
      );
    });
  });
});
