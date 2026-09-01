import type {
  OrderItem as PrismaOrderItem,
  MenuItem as PrismaMenuItem,
  LobbyMember as PrismaLobbyMember,
} from '@prisma/client';
import { Money } from '../../money/money';
import { moneyTransformer } from '../../money/money.transformer';

export type OrderItemProps = {
  id: string;
  lobbyId: string;
  lobbyMemberId: string;
  menuItemId: string;
  restaurantId: string;
  qty: number;
  actualPrice: Money;
  createdAt: Date;
  menuItem?: {
    id: string;
    name: string;
    category: string;
  };
  lobbyMember?: {
    id: string;
    displayName: string;
  };
};

export class OrderItem {
  readonly id: string;
  readonly lobbyId: string;
  readonly lobbyMemberId: string;
  readonly menuItemId: string;
  readonly restaurantId: string;
  readonly qty: number;
  readonly actualPrice: Money;
  readonly createdAt: Date;
  readonly menuItem?: {
    id: string;
    name: string;
    category: string;
  };
  readonly lobbyMember?: {
    id: string;
    displayName: string;
  };

  private constructor(props: OrderItemProps) {
    this.id = props.id;
    this.lobbyId = props.lobbyId;
    this.lobbyMemberId = props.lobbyMemberId;
    this.menuItemId = props.menuItemId;
    this.restaurantId = props.restaurantId;
    this.qty = props.qty;
    this.actualPrice = props.actualPrice;
    this.createdAt = props.createdAt;
    this.menuItem = props.menuItem;
    this.lobbyMember = props.lobbyMember;
  }

  get lineTotal(): Money {
    return this.actualPrice.mulInt(this.qty);
  }

  static fromPersistence(
    row: PrismaOrderItem & {
      menuItem?: PrismaMenuItem;
      lobbyMember?: PrismaLobbyMember;
    },
  ): OrderItem {
    const actualPrice = moneyTransformer.from(row.actualPrice) ?? Money.zero();
    return new OrderItem({
      id: row.id,
      lobbyId: row.lobbyId,
      lobbyMemberId: row.lobbyMemberId,
      menuItemId: row.menuItemId,
      restaurantId: row.restaurantId,
      qty: row.qty,
      actualPrice,
      createdAt: row.createdAt,
      menuItem: row.menuItem
        ? {
            id: row.menuItem.id,
            name: row.menuItem.name,
            category: row.menuItem.category,
          }
        : undefined,
      lobbyMember: row.lobbyMember
        ? {
            id: row.lobbyMember.id,
            displayName: row.lobbyMember.displayName,
          }
        : undefined,
    });
  }

  toResponse() {
    return {
      id: this.id,
      lobbyId: this.lobbyId,
      lobbyMemberId: this.lobbyMemberId,
      menuItemId: this.menuItemId,
      restaurantId: this.restaurantId,
      qty: this.qty,
      actualPrice: this.actualPrice.toEgpString(),
      lineTotal: this.lineTotal.toEgpString(),
      createdAt: this.createdAt,
      ...(this.menuItem ? { menuItem: this.menuItem } : {}),
      ...(this.lobbyMember ? { lobbyMember: this.lobbyMember } : {}),
    };
  }
}
