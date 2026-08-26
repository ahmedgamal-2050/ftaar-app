import type { LobbyBill as LobbyBillRow } from '@prisma/client';
import { Money } from '../money/money';
import { moneyTransformer } from '../money/money.transformer';

function requiredMoney(value: bigint | string | null | undefined): Money {
  return moneyTransformer.from(value) ?? Money.zero();
}

/** Nest/application view of the one-to-one lobby bill (money via transformer). */
export class LobbyBillEntity {
  constructor(
    readonly id: string,
    readonly lobbyId: string,
    readonly subtotal: Money,
    readonly tax: Money,
    readonly deliveryFee: Money,
    readonly serviceFee: Money,
    readonly discount: Money,
    readonly total: Money,
    readonly receiptTotal: Money | null,
    readonly paymentStatus: LobbyBillRow['paymentStatus'],
    readonly idempotencyKey: string | null,
  ) {}

  static fromRow(row: LobbyBillRow): LobbyBillEntity {
    return new LobbyBillEntity(
      row.id,
      row.lobbyId,
      requiredMoney(row.subtotal),
      requiredMoney(row.tax),
      requiredMoney(row.deliveryFee),
      requiredMoney(row.serviceFee),
      requiredMoney(row.discount),
      requiredMoney(row.total),
      moneyTransformer.from(row.receiptTotal),
      row.paymentStatus,
      row.idempotencyKey,
    );
  }
}
