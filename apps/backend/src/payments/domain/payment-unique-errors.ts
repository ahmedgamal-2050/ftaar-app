import { isUniqueOn } from '../../lobbies/domain/lobby-unique-errors';

export function isPendingClaimConflict(error: unknown): boolean {
  return (
    isUniqueOn(error, 'lobby_member_id') ||
    isUniqueOn(error, 'one_pending') ||
    isUniqueOn(error, 'uq_payment_claims_one_pending')
  );
}

export function isClaimIdempotencyConflict(error: unknown): boolean {
  return (
    isUniqueOn(error, 'idempotency_key') ||
    isUniqueOn(error, 'uq_payment_claims_idempotency_key')
  );
}
