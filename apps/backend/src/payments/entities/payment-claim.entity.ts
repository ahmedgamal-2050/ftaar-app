import type { PaymentClaim as PrismaPaymentClaim } from '@prisma/client';
import { Money } from '../../money/money';
import { moneyTransformer } from '../../money/money.transformer';

export class PaymentClaim {
  readonly id: string;
  readonly lobbyId: string;
  readonly lobbyMemberId: string;
  readonly amount: Money;
  readonly status: PrismaPaymentClaim['status'];
  readonly note: string | null;
  readonly claimedAt: Date;
  readonly resolvedAt: Date | null;
  readonly resolvedById: string | null;
  readonly idempotencyKey: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(row: PrismaPaymentClaim) {
    this.id = row.id;
    this.lobbyId = row.lobbyId;
    this.lobbyMemberId = row.lobbyMemberId;
    this.amount = moneyTransformer.from(row.amount) ?? Money.zero();
    this.status = row.status;
    this.note = row.note;
    this.claimedAt = row.claimedAt;
    this.resolvedAt = row.resolvedAt;
    this.resolvedById = row.resolvedById;
    this.idempotencyKey = row.idempotencyKey;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  static fromPersistence(row: PrismaPaymentClaim): PaymentClaim {
    return new PaymentClaim(row);
  }

  toResponse() {
    return {
      id: this.id,
      lobbyId: this.lobbyId,
      lobbyMemberId: this.lobbyMemberId,
      amount: this.amount,
      status: this.status,
      note: this.note,
      claimedAt: this.claimedAt,
      resolvedAt: this.resolvedAt,
      resolvedById: this.resolvedById,
    };
  }
}
