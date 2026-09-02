import { AppError } from '../../core/errors/app-error';
import type { PaymentStatus } from '../../database/enums';

export const PAYMENT_PHASE = 'billed' as const;
export const SETTLED_STATUS = 'settled' as const;

export function assertBoardVisible(status: string): void {
  if (status !== PAYMENT_PHASE && status !== SETTLED_STATUS) {
    throw new AppError('NOT_IN_PAYMENT', 'Lobby is not in payment', {
      status,
    });
  }
}

export function assertCollecting(status: string): void {
  if (status === SETTLED_STATUS) {
    throw new AppError('LOBBY_SETTLED', 'Lobby is already settled');
  }
  if (status !== PAYMENT_PHASE) {
    throw new AppError('NOT_IN_PAYMENT', 'Lobby is not in payment', {
      status,
    });
  }
}

export function isHost(role: string): boolean {
  return role === 'admin';
}

export function memberOwes(role: string, totalPiastres: bigint): boolean {
  return !isHost(role) && totalPiastres > 0n;
}

export function effectivePaymentStatus(
  role: string,
  paymentStatus: PaymentStatus,
  totalPiastres: bigint,
): PaymentStatus {
  if (isHost(role) || totalPiastres === 0n) {
    return 'paid';
  }
  return paymentStatus;
}
