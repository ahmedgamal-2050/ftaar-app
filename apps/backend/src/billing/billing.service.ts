import { Injectable } from '@nestjs/common';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { Money } from '../money/money';
import { moneyTransformer } from '../money/money.transformer';
import type { EntityManager } from '../shared/run-in-transaction';
import {
  buildInvariant,
  deliveredLinesMissingPrice,
  type BillFeesInput,
  type BillLineInput,
  type BillMemberInput,
} from './bill-math';
import type { PatchBillLinesDto, PreviewBillDto } from './dto/billing.dto';
import { FinaliseFault } from './finalise-fault';
import {
  BILLING_ARRIVED_STATUS,
  BILLING_PAYMENT_STATUS,
  LobbyAccessService,
} from './lobby-access.service';
import { LobbyBillEntity } from './lobby-bill.entity';

function requiredMoney(value: bigint | string | null | undefined): Money {
  return moneyTransformer.from(value) ?? Money.zero();
}

function parseFee(value: string): Money {
  return Money.fromEgpString(value);
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LobbyAccessService,
    private readonly fault: FinaliseFault,
  ) {}

  private db(): PrismaService {
    return this.prisma;
  }

  async draft(lobbyId: string, userId: string) {
    await this.access.requireAdmin(lobbyId, userId);
    const ctx = await this.loadBillContext(lobbyId);
    this.assertArrived(ctx.lobby.status);
    return this.presentDraft(lobbyId, ctx);
  }

  async patchLines(lobbyId: string, userId: string, dto: PatchBillLinesDto) {
    await this.access.requireAdmin(lobbyId, userId);
    return this.db().runInTransaction(async (em) => {
      const { lobby, lines } = await this.loadBillContext(lobbyId, em);
      this.assertArrived(lobby.status);
      const byId = new Map(lines.map((line) => [line.id, line]));
      for (const patch of dto.lines) {
        if (!byId.has(patch.id)) {
          throw new AppError(
            'VALIDATION_ERROR',
            'Line does not belong to this lobby',
            { id: patch.id },
          );
        }
      }
      for (const patch of dto.lines) {
        const actualPrice =
          patch.actualPrice === undefined
            ? undefined
            : patch.actualPrice === null
              ? null
              : this.db().moneyToDb(Money.fromEgpString(patch.actualPrice));
        await em.orderItem.update({
          where: { id: patch.id },
          data: {
            ...(actualPrice !== undefined ? { actualPrice } : {}),
            ...(patch.delivered !== undefined
              ? { delivered: patch.delivered }
              : {}),
          },
        });
        if (dto.applyToAllMatching && patch.actualPrice) {
          const source = byId.get(patch.id);
          if (source) {
            await em.orderItem.updateMany({
              where: { lobbyId, menuItemId: source.menuItemId },
              data: {
                actualPrice: this.db().moneyToDb(
                  Money.fromEgpString(patch.actualPrice),
                ),
              },
            });
          }
        }
      }
      const ctx = await this.loadBillContext(lobbyId, em);
      return this.presentDraft(lobbyId, ctx);
    });
  }

  async preview(lobbyId: string, userId: string, dto: PreviewBillDto) {
    await this.access.requireAdmin(lobbyId, userId);
    const { lobby, members, lines } = await this.loadBillContext(lobbyId);
    this.assertArrived(lobby.status);
    return buildInvariant(members, lines, this.feesFromDto(dto));
  }

  async finalise(
    lobbyId: string,
    userId: string,
    dto: PreviewBillDto,
    idempotencyKey?: string,
  ) {
    await this.access.requireAdmin(lobbyId, userId);
    const key = idempotencyKey ?? dto.idempotencyKey ?? null;

    const existing = await this.db().lobbyBill.findUnique({
      where: { lobbyId },
    });
    if (existing) {
      if (key && existing.idempotencyKey === key) {
        return this.getBill(lobbyId, userId);
      }
      throw new AppError('CONFLICT', 'Bill already finalised');
    }
    if (key) {
      const taken = await this.db().lobbyBill.findUnique({
        where: { idempotencyKey: key },
      });
      if (taken) {
        throw new AppError('CONFLICT', 'Idempotency key already used');
      }
    }

    return this.db().runInTransaction(async (em) => {
      const { lobby, members, lines } = await this.loadBillContext(lobbyId, em);
      this.assertArrived(lobby.status);
      const missing = deliveredLinesMissingPrice(lines);
      if (missing.length > 0) {
        throw new AppError(
          'PRICES_INCOMPLETE',
          'Every delivered line needs a price',
          { lineIds: missing },
        );
      }
      const fees = this.feesFromDto(dto);
      const invariant = buildInvariant(members, lines, fees);
      const bill = await em.lobbyBill.create({
        data: {
          lobbyId,
          subtotal: invariant.subtotal.toPiastres(),
          tax: invariant.tax.toPiastres(),
          deliveryFee: invariant.deliveryFee.toPiastres(),
          serviceFee: invariant.serviceFee.toPiastres(),
          discount: invariant.discount.toPiastres(),
          total: invariant.total.toPiastres(),
          receiptTotal:
            invariant.reconciliation.receiptTotal?.toPiastres() ?? null,
          paymentStatus: 'pending',
          idempotencyKey: key,
        },
      });
      this.fault.trip('after-bill');
      for (const line of lines) {
        await em.orderItem.update({
          where: { id: line.id },
          data: {
            actualPrice: line.actualPrice?.toPiastres() ?? null,
            delivered: line.delivered,
          },
        });
      }
      this.fault.trip('after-lines');
      for (const member of invariant.members) {
        await em.lobbyMember.update({
          where: { id: member.id },
          data: { paymentStatus: member.paymentStatus },
        });
      }
      this.fault.trip('after-members');
      await em.lobby.update({
        where: { id: lobbyId },
        data: { status: BILLING_PAYMENT_STATUS },
      });
      this.fault.trip('after-status');
      void bill;
      return { ...invariant, status: BILLING_PAYMENT_STATUS };
    });
  }

  async reopen(lobbyId: string, userId: string) {
    await this.access.requireAdmin(lobbyId, userId);
    return this.db().runInTransaction(async (em) => {
      const { lobby, members } = await this.loadBillContext(lobbyId, em);
      if (lobby.status !== BILLING_PAYMENT_STATUS) {
        throw new AppError('VALIDATION_ERROR', 'Bill is not in payment');
      }
      if (members.some((member) => member.paymentStatus === 'paid')) {
        throw new AppError(
          'BILL_LOCKED',
          'Cannot reopen after a member has paid',
        );
      }
      await em.lobbyBill.deleteMany({ where: { lobbyId } });
      await em.lobbyMember.updateMany({
        where: { lobbyId },
        data: { paymentStatus: 'unpaid' },
      });
      await em.lobby.update({
        where: { id: lobbyId },
        data: { status: BILLING_ARRIVED_STATUS },
      });
      return { lobbyId, status: BILLING_ARRIVED_STATUS };
    });
  }

  async getBill(lobbyId: string, userId: string) {
    await this.access.requireMember(lobbyId, userId);
    return this.readFinalisedBill(lobbyId);
  }

  /** Bill snapshot without a membership check — caller must already be authorized. */
  async readFinalisedBill(
    lobbyId: string,
    em: EntityManager | PrismaService = this.db(),
  ) {
    const { lobby, members, lines } = await this.loadBillContext(lobbyId, em);
    const row = await em.lobbyBill.findUnique({ where: { lobbyId } });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Bill has not been finalised');
    }
    const entity = LobbyBillEntity.fromRow(row);
    const fees: BillFeesInput = {
      deliveryFee: entity.deliveryFee,
      serviceFee: entity.serviceFee,
      discount: entity.discount,
      receiptTotal: entity.receiptTotal,
    };
    const paymentOverride = new Map(
      members.map((member) => [member.id, member.paymentStatus]),
    );
    const invariant = buildInvariant(members, lines, fees, paymentOverride);
    return {
      ...invariant,
      bill: entity,
      status: lobby.status,
    };
  }

  private feesFromDto(dto: PreviewBillDto): BillFeesInput {
    return {
      deliveryFee: parseFee(dto.deliveryFee),
      serviceFee: parseFee(dto.serviceFee),
      discount: parseFee(dto.discount),
      receiptTotal:
        dto.receiptTotal === undefined || dto.receiptTotal === null
          ? null
          : parseFee(dto.receiptTotal),
    };
  }

  private presentDraft(
    lobbyId: string,
    ctx: {
      lobby: { status: string };
      members: BillMemberInput[];
      lines: BillLineInput[];
    },
  ) {
    const groups = new Map<
      string,
      {
        menuItemId: string;
        name: string;
        referencePrice: Money;
        lines: Array<{
          id: string;
          memberId: string;
          qty: number;
          actualPrice: Money | null;
          delivered: boolean;
          suggestedActual: Money;
        }>;
      }
    >();
    for (const line of ctx.lines) {
      const suggestedActual = line.referencePrice.mulInt(line.qty);
      const group = groups.get(line.menuItemId) ?? {
        menuItemId: line.menuItemId,
        name: line.name,
        referencePrice: line.referencePrice,
        lines: [],
      };
      group.lines.push({
        id: line.id,
        memberId: line.memberId,
        qty: line.qty,
        actualPrice: line.actualPrice,
        delivered: line.delivered,
        suggestedActual: line.actualPrice ?? suggestedActual,
      });
      groups.set(line.menuItemId, group);
    }
    return {
      lobbyId,
      status: ctx.lobby.status,
      members: ctx.members,
      groups: [...groups.values()],
    };
  }

  private assertArrived(status: string): void {
    if (status !== BILLING_ARRIVED_STATUS) {
      throw new AppError('VALIDATION_ERROR', 'Lobby must be arrived (locked)', {
        status,
      });
    }
  }

  private async loadBillContext(
    lobbyId: string,
    em: EntityManager | PrismaService = this.db(),
  ): Promise<{
    lobby: { id: string; status: string; instaPayHandle: string | null };
    members: BillMemberInput[];
    lines: BillLineInput[];
  }> {
    const lobby = await em.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: true,
        orderItems: { include: { menuItem: true } },
      },
    });
    if (!lobby) {
      throw new AppError('NOT_FOUND', 'Lobby not found');
    }
    const members: BillMemberInput[] = lobby.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      paymentStatus: member.paymentStatus,
    }));
    const lines: BillLineInput[] = lobby.orderItems.map((item) => ({
      id: item.id,
      memberId: item.lobbyMemberId,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      qty: item.qty,
      referencePrice: requiredMoney(item.menuItem.referencePrice),
      actualPrice: moneyTransformer.from(item.actualPrice),
      delivered: item.delivered,
    }));
    return { lobby, members, lines };
  }
}
