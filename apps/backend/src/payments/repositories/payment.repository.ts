import type { PaymentClaim as ClaimRow, Prisma } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import { PaymentClaim } from '../entities/payment-claim.entity';

export type ClaimReader = {
  paymentClaim: {
    findFirst(args: Prisma.PaymentClaimFindFirstArgs): Promise<ClaimRow | null>;
    findMany(args: Prisma.PaymentClaimFindManyArgs): Promise<ClaimRow[]>;
    create(args: Prisma.PaymentClaimCreateArgs): Promise<ClaimRow>;
    update(args: Prisma.PaymentClaimUpdateArgs): Promise<ClaimRow>;
  };
};

export type LobbyStatusReader = {
  lobby: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; status: true; instaPayHandle: true };
    }): Promise<{
      id: string;
      status: string;
      instaPayHandle: string | null;
    } | null>;
  };
};

export async function loadLobbyStatus(
  em: LobbyStatusReader,
  lobbyId: string,
): Promise<{ id: string; status: string; instaPayHandle: string | null }> {
  const lobby = await em.lobby.findUnique({
    where: { id: lobbyId },
    select: { id: true, status: true, instaPayHandle: true },
  });
  if (!lobby) {
    throw new AppError('NOT_FOUND', 'Lobby not found');
  }
  return lobby;
}

export async function findPendingClaim(
  em: ClaimReader,
  lobbyMemberId: string,
): Promise<PaymentClaim | null> {
  const row = await em.paymentClaim.findFirst({
    where: { lobbyMemberId, status: 'pending' },
    orderBy: { claimedAt: 'desc' },
  });
  return row ? PaymentClaim.fromPersistence(row) : null;
}

export async function findClaimByIdempotencyKey(
  em: ClaimReader,
  idempotencyKey: string,
): Promise<PaymentClaim | null> {
  const row = await em.paymentClaim.findFirst({
    where: { idempotencyKey },
  });
  return row ? PaymentClaim.fromPersistence(row) : null;
}

export async function listPendingClaims(
  em: ClaimReader,
  lobbyId: string,
): Promise<PaymentClaim[]> {
  const rows = await em.paymentClaim.findMany({
    where: { lobbyId, status: 'pending' },
  });
  return rows.map((row) => PaymentClaim.fromPersistence(row));
}
