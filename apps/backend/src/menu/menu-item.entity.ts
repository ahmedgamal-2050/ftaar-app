import type { MenuItem as PrismaMenuItem } from '@prisma/client';
import { AppError } from '../core/errors/app-error';
import { Money } from '../money/money';
import { moneyTransformer } from '../money/money.transformer';

export type MenuItemProps = {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  referencePrice: Money;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function assertNonNegativePrice(price: Money): void {
  if (price.toPiastres() < 0n) {
    throw new AppError('VALIDATION_ERROR', 'referencePrice must be >= 0');
  }
}

/** Domain menu row. `referencePrice` is always a {@link Money} value ≥ 0. */
export class MenuItem {
  readonly id: string;
  readonly restaurantId: string;
  readonly name: string;
  readonly category: string;
  readonly referencePrice: Money;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: MenuItemProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this.name = props.name;
    this.category = props.category;
    this.referencePrice = props.referencePrice;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static fromPersistence(row: PrismaMenuItem): MenuItem {
    const referencePrice = moneyTransformer.from(row.referencePrice);
    if (!referencePrice) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Menu item is missing referencePrice',
      );
    }
    assertNonNegativePrice(referencePrice);
    return new MenuItem({
      id: row.id,
      restaurantId: row.restaurantId,
      name: row.name,
      category: row.category,
      referencePrice,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static create(props: MenuItemProps): MenuItem {
    assertNonNegativePrice(props.referencePrice);
    return new MenuItem(props);
  }

  toResponse() {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      name: this.name,
      category: this.category,
      referencePrice: this.referencePrice,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function parseReferencePrice(value: unknown): Money {
  const money = Money.fromEgpString(value);
  assertNonNegativePrice(money);
  return money;
}
