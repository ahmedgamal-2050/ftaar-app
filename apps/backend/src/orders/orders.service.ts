import { Injectable } from '@nestjs/common';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { Money } from '../money/money';
import { OrderItem } from './entities/order-item.entity';
import type { AddOrderItemDto } from './dto/add-order-item.dto';
import type { UpdateOrderItemDto } from './dto/update-order-item.dto';
import type { OverrideItemPriceDto } from './dto/override-price.dto';

export type MemberOrderSummary = {
  items: ReturnType<OrderItem['toResponse']>[];
  subtotal: string;
};

export type LobbyOrdersSummary = {
  lobbyId: string;
  items: ReturnType<OrderItem['toResponse']>[];
  subtotal: string;
};

export type AggregatedOrderItem = {
  menuItemId: string;
  name: string;
  category: string;
  totalQty: number;
  unitPrice: string;
  totalPrice: string;
};

export type AggregatedOrderSummary = {
  lobbyId: string;
  totalItemsCount: number;
  grandTotal: string;
  items: AggregatedOrderItem[];
};

export type OverridePriceResult = {
  lobbyId: string;
  menuItemId: string;
  updatedCount: number;
  newPrice: string;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Adds an item to the current user's order in an open lobby. Price is strictly default reference or lobby admin override. */
  async addItem(
    userId: string,
    lobbyId: string,
    dto: AddOrderItemDto,
  ): Promise<MemberOrderSummary> {
    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }
    if (lobby.status !== 'open') {
      throw new AppError('CONFLICT', 'Lobby is not open for taking orders');
    }

    const member = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId } },
    });
    if (!member) {
      throw new AppError('FORBIDDEN', 'You are not a member of this lobby');
    }

    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        id: dto.menuItemId,
        restaurantId: lobby.restaurantId,
        isActive: true,
      },
    });
    if (!menuItem) {
      throw new AppError(
        'NOT_FOUND',
        'Menu item not found or not active in this restaurant',
      );
    }

    // Default to restaurant reference price, or inherit existing lobby override price set by admin
    let actualPricePiastres: bigint = menuItem.referencePrice;
    const existingLobbyItem = await this.prisma.orderItem.findFirst({
      where: { lobbyId, menuItemId: dto.menuItemId },
    });
    if (existingLobbyItem) {
      actualPricePiastres = existingLobbyItem.actualPrice;
    }

    const existing = await this.prisma.orderItem.findFirst({
      where: {
        lobbyId,
        lobbyMemberId: member.id,
        menuItemId: dto.menuItemId,
      },
    });

    if (existing) {
      await this.prisma.orderItem.update({
        where: { id: existing.id },
        data: {
          qty: existing.qty + dto.qty,
          actualPrice: actualPricePiastres,
        },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          lobbyId,
          lobbyMemberId: member.id,
          menuItemId: dto.menuItemId,
          restaurantId: lobby.restaurantId,
          qty: dto.qty,
          actualPrice: actualPricePiastres,
        },
      });
    }

    return this.findMine(userId, lobbyId);
  }

  /** Updates quantity of an order item owned by the user in an open lobby. */
  async updateItem(
    userId: string,
    lobbyId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<MemberOrderSummary> {
    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }
    if (lobby.status !== 'open') {
      throw new AppError('CONFLICT', 'Lobby is not open for modifying orders');
    }

    const member = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId } },
    });
    if (!member) {
      throw new AppError('FORBIDDEN', 'You are not a member of this lobby');
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, lobbyId, lobbyMemberId: member.id },
    });
    if (!item) {
      throw new AppError('NOT_FOUND', 'Order item not found in your order');
    }

    await this.prisma.orderItem.update({
      where: { id: item.id },
      data: { qty: dto.qty },
    });

    return this.findMine(userId, lobbyId);
  }

  /** Removes an order item owned by the user from an open lobby. */
  async removeItem(
    userId: string,
    lobbyId: string,
    itemId: string,
  ): Promise<MemberOrderSummary> {
    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }
    if (lobby.status !== 'open') {
      throw new AppError('CONFLICT', 'Lobby is not open for modifying orders');
    }

    const member = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId } },
    });
    if (!member) {
      throw new AppError('FORBIDDEN', 'You are not a member of this lobby');
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, lobbyId, lobbyMemberId: member.id },
    });
    if (!item) {
      throw new AppError('NOT_FOUND', 'Order item not found in your order');
    }

    await this.prisma.orderItem.delete({
      where: { id: item.id },
    });

    return this.findMine(userId, lobbyId);
  }

  /** Finds current user's order items and subtotal in a given lobby. */
  async findMine(userId: string, lobbyId: string): Promise<MemberOrderSummary> {
    const member = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId } },
    });
    if (!member) {
      throw new AppError('FORBIDDEN', 'You are not a member of this lobby');
    }

    const rows = await this.prisma.orderItem.findMany({
      where: { lobbyId, lobbyMemberId: member.id },
      include: { menuItem: true },
      orderBy: { createdAt: 'asc' },
    });

    const items = rows.map((r) => OrderItem.fromPersistence(r));
    let subtotal = Money.zero();
    for (const item of items) {
      subtotal = subtotal.add(item.lineTotal);
    }

    return {
      items: items.map((i) => i.toResponse()),
      subtotal: subtotal.toEgpString(),
    };
  }

  /** Lists all order items in the lobby for admin overview. */
  async listForLobby(
    adminUserId: string,
    lobbyId: string,
  ): Promise<LobbyOrdersSummary> {
    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }

    const member = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId: adminUserId } },
    });
    if (!member || member.role !== 'admin') {
      throw new AppError(
        'FORBIDDEN',
        'Only the lobby admin can view all orders in this lobby',
      );
    }

    const rows = await this.prisma.orderItem.findMany({
      where: { lobbyId },
      include: { menuItem: true, lobbyMember: true },
      orderBy: { createdAt: 'asc' },
    });

    const items = rows.map((r) => OrderItem.fromPersistence(r));
    let subtotal = Money.zero();
    for (const item of items) {
      subtotal = subtotal.add(item.lineTotal);
    }

    return {
      lobbyId,
      items: items.map((i) => i.toResponse()),
      subtotal: subtotal.toEgpString(),
    };
  }

  /** Aggregates order items by menuItem for calling the restaurant (Admin only). */
  async getAggregatedOrderSummary(
    adminUserId: string,
    lobbyId: string,
  ): Promise<AggregatedOrderSummary> {
    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }

    const member = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId: adminUserId } },
    });
    if (!member || member.role !== 'admin') {
      throw new AppError(
        'FORBIDDEN',
        'Only the lobby admin can view the aggregated order summary',
      );
    }

    const rows = await this.prisma.orderItem.findMany({
      where: { lobbyId },
      include: { menuItem: true },
    });

    type MapEntry = {
      menuItemId: string;
      name: string;
      category: string;
      totalQty: number;
      unitPrice: Money;
      totalPrice: Money;
    };

    const map = new Map<string, MapEntry>();

    for (const row of rows) {
      const domainItem = OrderItem.fromPersistence(row);
      const menuItemId = domainItem.menuItemId;
      const unitPrice = domainItem.actualPrice;
      const lineTotal = domainItem.lineTotal;

      const existing = map.get(menuItemId);
      if (existing) {
        existing.totalQty += domainItem.qty;
        existing.totalPrice = existing.totalPrice.add(lineTotal);
      } else {
        map.set(menuItemId, {
          menuItemId,
          name: domainItem.menuItem?.name ?? '',
          category: domainItem.menuItem?.category ?? '',
          totalQty: domainItem.qty,
          unitPrice,
          totalPrice: lineTotal,
        });
      }
    }

    let grandTotal = Money.zero();
    let totalItemsCount = 0;
    const aggregatedItems: AggregatedOrderItem[] = [];

    for (const entry of map.values()) {
      grandTotal = grandTotal.add(entry.totalPrice);
      totalItemsCount += entry.totalQty;
      aggregatedItems.push({
        menuItemId: entry.menuItemId,
        name: entry.name,
        category: entry.category,
        totalQty: entry.totalQty,
        unitPrice: entry.unitPrice.toEgpString(),
        totalPrice: entry.totalPrice.toEgpString(),
      });
    }

    return {
      lobbyId,
      totalItemsCount,
      grandTotal: grandTotal.toEgpString(),
      items: aggregatedItems,
    };
  }

  /** Allows lobby admin to adjust unit price of a menu item across all orders in the lobby. */
  async overridePrice(
    adminUserId: string,
    lobbyId: string,
    menuItemId: string,
    dto: OverrideItemPriceDto,
  ): Promise<OverridePriceResult> {
    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }
    if (lobby.status !== 'open' && lobby.status !== 'locked') {
      throw new AppError(
        'CONFLICT',
        'Prices can only be adjusted while open or locked',
      );
    }

    const adminMember = await this.prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId, userId: adminUserId } },
    });
    if (!adminMember || adminMember.role !== 'admin') {
      throw new AppError(
        'FORBIDDEN',
        'Only the lobby admin can override item prices',
      );
    }

    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId: lobby.restaurantId },
    });
    if (!menuItem) {
      throw new AppError('NOT_FOUND', 'Menu item not found in this restaurant');
    }

    const newPriceMoney = Money.fromEgpString(dto.actualPrice);
    const newPricePiastres = newPriceMoney.toPiastres();

    const result = await this.prisma.orderItem.updateMany({
      where: { lobbyId, menuItemId },
      data: { actualPrice: newPricePiastres },
    });

    return {
      lobbyId,
      menuItemId,
      updatedCount: result.count,
      newPrice: newPriceMoney.toEgpString(),
    };
  }
}
