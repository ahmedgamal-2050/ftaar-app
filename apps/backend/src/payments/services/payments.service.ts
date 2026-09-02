import { Injectable } from '@nestjs/common';
import { BillingService } from '../../billing/billing.service';
import { LobbyAccessService } from '../../billing/lobby-access.service';
import { AppError } from '../../core/errors/app-error';
import type { MemberRole, PaymentStatus } from '../../database/enums';
import { PrismaService } from '../../database/prisma.service';
import { Money } from '../../money/money';
import type { EntityManager } from '../../shared/run-in-transaction';
import {
  isClaimIdempotencyConflict,
  isPendingClaimConflict,
} from '../domain/payment-unique-errors';
import {
  assertBoardVisible,
  assertCollecting,
  effectivePaymentStatus,
  isHost,
  memberOwes,
} from '../domain/payment-rules';
import type {
  ClaimPaymentDto,
  ResolveClaimDto,
} from '../dto/claim-payment.dto';
import {
  findClaimByIdempotencyKey,
  findPendingClaim,
  listPendingClaims,
  loadLobbyStatus,
  type ClaimReader,
  type LobbyStatusReader,
} from '../repositories/payment.repository';

type MemberRow = {
  id: string;
  role: MemberRole;
  paymentStatus: PaymentStatus;
};

type PaymentDb = ClaimReader &
  LobbyStatusReader & {
    lobbyMember: {
      findFirst(args: {
        where: { id: string; lobbyId?: string };
      }): Promise<MemberRow | null>;
      update(args: {
        where: { id: string };
        data: { paymentStatus: PaymentStatus };
      }): Promise<unknown>;
    };
    lobby: LobbyStatusReader['lobby'] & {
      update(args: {
        where: { id: string };
        data: { status: string };
      }): Promise<unknown>;
    };
    lobbyBill: {
      update(args: {
        where: { lobbyId: string };
        data: { paymentStatus: PaymentStatus };
      }): Promise<unknown>;
    };
    runInTransaction<T>(work: (em: PaymentDb) => Promise<T>): Promise<T>;
  };

type BoardMember = {
  id: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  total: Money;
  paymentStatus: ReturnType<typeof effectivePaymentStatus>;
  pendingClaimId: string | null;
};

/** Transaction client for bill reads — same connection as the surrounding tx. */
function billClient(em: PaymentDb): EntityManager {
  return em as unknown as EntityManager;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LobbyAccessService,
    private readonly billing: BillingService,
  ) {}

  private db(): PaymentDb {
    return this.prisma as unknown as PaymentDb;
  }

  async getBoard(lobbyId: string, userId: string) {
    await this.access.requireMember(lobbyId, userId);
    return this.buildBoard(lobbyId, userId);
  }

  async claim(
    lobbyId: string,
    userId: string,
    dto: ClaimPaymentDto,
    idempotencyKey?: string,
  ) {
    const membership = await this.access.requireMember(lobbyId, userId);
    if (isHost(membership.role)) {
      throw new AppError(
        'CANNOT_CLAIM_AS_HOST',
        'The host does not pay themselves',
      );
    }
    const key = idempotencyKey ?? dto.idempotencyKey ?? null;
    if (key && key.length > 128) {
      throw new AppError(
        'VALIDATION_ERROR',
        'idempotencyKey must be at most 128 characters',
      );
    }
    if (key) {
      const existing = await findClaimByIdempotencyKey(this.db(), key);
      if (existing) {
        if (
          existing.lobbyId !== lobbyId ||
          existing.lobbyMemberId !== membership.id
        ) {
          throw new AppError('CONFLICT', 'Idempotency key already used');
        }
        // Same key + same member is a replay: return the current board even if
        // that claim was later rejected. Clients should mint a new key per attempt.
        return this.buildBoard(lobbyId, userId);
      }
    }

    try {
      await this.db().runInTransaction(async (em) => {
        const lobby = await loadLobbyStatus(em, lobbyId);
        assertCollecting(lobby.status);
        const current = await em.lobbyMember.findFirst({
          where: { id: membership.id, lobbyId },
        });
        if (!current) {
          throw new AppError('NOT_FOUND', 'Member not found in this lobby');
        }
        if (current.paymentStatus === 'paid') {
          throw new AppError('ALREADY_PAID', 'This share is already paid');
        }
        const pending = await findPendingClaim(em, membership.id);
        if (pending) {
          return;
        }
        const bill = await this.billing.readFinalisedBill(
          lobbyId,
          billClient(em),
        );
        const row = bill.members.find((member) => member.id === membership.id);
        const amount = row?.total ?? Money.zero();
        await em.paymentClaim.create({
          data: {
            lobbyId,
            lobbyMemberId: membership.id,
            amount: amount.toPiastres(),
            status: 'pending',
            note: dto.note ?? null,
            idempotencyKey: key,
          },
        });
        await em.lobbyMember.update({
          where: { id: membership.id },
          data: { paymentStatus: 'pending' },
        });
      });
    } catch (error) {
      if (isPendingClaimConflict(error)) {
        return this.buildBoard(lobbyId, userId);
      }
      if (isClaimIdempotencyConflict(error)) {
        throw new AppError('CONFLICT', 'Idempotency key already used');
      }
      throw error;
    }
    return this.buildBoard(lobbyId, userId);
  }

  async confirm(
    lobbyId: string,
    memberId: string,
    userId: string,
    dto: ResolveClaimDto,
  ) {
    await this.access.requireAdmin(lobbyId, userId);
    await this.db().runInTransaction(async (em) => {
      await this.resolveClaim(em, lobbyId, memberId, userId, 'paid', dto.note);
    });
    return this.buildBoard(lobbyId, userId);
  }

  async reject(
    lobbyId: string,
    memberId: string,
    userId: string,
    dto: ResolveClaimDto,
  ) {
    await this.access.requireAdmin(lobbyId, userId);
    await this.db().runInTransaction(async (em) => {
      await this.resolveClaim(
        em,
        lobbyId,
        memberId,
        userId,
        'unpaid',
        dto.note,
      );
    });
    return this.buildBoard(lobbyId, userId);
  }

  async settle(lobbyId: string, userId: string) {
    await this.access.requireAdmin(lobbyId, userId);
    await this.db().runInTransaction(async (em) => {
      const lobby = await loadLobbyStatus(em, lobbyId);
      assertCollecting(lobby.status);
      const board = await this.buildBoard(lobbyId, userId, em);
      if (board.waitingOn.length > 0) {
        throw new AppError(
          'SETTLEMENT_INCOMPLETE',
          'Waiting on unpaid members',
          { waitingOn: board.waitingOn },
        );
      }
      await em.lobby.update({
        where: { id: lobbyId },
        data: { status: 'settled' },
      });
      await em.lobbyBill.update({
        where: { lobbyId },
        data: { paymentStatus: 'paid' },
      });
    });
    return this.buildBoard(lobbyId, userId);
  }

  private async resolveClaim(
    em: PaymentDb,
    lobbyId: string,
    memberId: string,
    adminUserId: string,
    nextStatus: 'paid' | 'unpaid',
    note?: string,
  ) {
    const lobby = await loadLobbyStatus(em, lobbyId);
    assertCollecting(lobby.status);
    const member = await em.lobbyMember.findFirst({
      where: { id: memberId, lobbyId },
    });
    if (!member) {
      throw new AppError('NOT_FOUND', 'Member not found in this lobby');
    }
    const pending = await findPendingClaim(em, member.id);
    if (!pending) {
      throw new AppError('CLAIM_NOT_PENDING', 'No pending claim to resolve');
    }
    await em.paymentClaim.update({
      where: { id: pending.id },
      data: {
        status: nextStatus === 'paid' ? 'confirmed' : 'rejected',
        resolvedAt: new Date(),
        resolvedById: adminUserId,
        note: note ?? pending.note,
      },
    });
    await em.lobbyMember.update({
      where: { id: member.id },
      data: { paymentStatus: nextStatus },
    });
  }

  private async buildBoard(
    lobbyId: string,
    userId: string,
    em: PaymentDb = this.db(),
  ) {
    const lobby = await loadLobbyStatus(em, lobbyId);
    assertBoardVisible(lobby.status);
    const bill = await this.billing.readFinalisedBill(lobbyId, billClient(em));
    const pending = await listPendingClaims(em, lobbyId);
    const pendingByMember = new Map(
      pending.map((claim) => [claim.lobbyMemberId, claim]),
    );

    const members: BoardMember[] = bill.members.map((member) => {
      const totalPiastres = member.total.toPiastres();
      return {
        id: member.id,
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        total: member.total,
        paymentStatus: effectivePaymentStatus(
          member.role,
          member.paymentStatus,
          totalPiastres,
        ),
        pendingClaimId: pendingByMember.get(member.id)?.id ?? null,
      };
    });

    const youRow = members.find((member) => member.userId === userId);
    if (!youRow) {
      throw new AppError('FORBIDDEN', 'Not a member of this lobby');
    }

    const collected = members.reduce((sum, member) => {
      return member.paymentStatus === 'paid' ? sum.add(member.total) : sum;
    }, Money.zero());

    const waitingOn = members
      .filter((member) => memberOwes(member.role, member.total.toPiastres()))
      .filter((member) => member.paymentStatus !== 'paid')
      .map((member) => member.displayName);

    return {
      lobbyId,
      status: lobby.status,
      instaPayHandle: lobby.instaPayHandle,
      collected,
      grandTotal: bill.total,
      you: {
        memberId: youRow.id,
        amountOwed: youRow.total,
        paymentStatus: youRow.paymentStatus,
        isAdmin: isHost(youRow.role),
      },
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        total: member.total,
        paymentStatus: member.paymentStatus,
        pendingClaimId: member.pendingClaimId,
      })),
      waitingOn,
    };
  }
}
