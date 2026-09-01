import { Money } from '../money/money';
import { allocateFees, type FeeAllocation } from './allocator';

export interface BillLineInput {
  id: string;
  memberId: string;
  menuItemId: string;
  name: string;
  qty: number;
  referencePrice: Money;
  actualPrice: Money | null;
  delivered: boolean;
}

export interface BillMemberInput {
  id: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed';
}

export interface BillFeesInput {
  deliveryFee: Money;
  serviceFee: Money;
  discount: Money;
  receiptTotal: Money | null;
}

export interface Reconciliation {
  receiptTotal: Money | null;
  computedTotal: Money;
  difference: Money | null;
  warns: boolean;
}

export interface InvariantMember {
  id: string;
  userId: string;
  displayName: string;
  itemsSubtotal: Money;
  feesShare: Money;
  total: Money;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed';
}

export interface InvariantBlock {
  subtotal: Money;
  deliveryFee: Money;
  serviceFee: Money;
  discount: Money;
  netFees: Money;
  tax: Money;
  total: Money;
  members: InvariantMember[];
  allocations: FeeAllocation[];
  reconciliation: Reconciliation;
}

export function netFees(fees: BillFeesInput): Money {
  return fees.deliveryFee.add(fees.serviceFee).sub(fees.discount);
}

export function memberSubtotals(
  members: BillMemberInput[],
  lines: BillLineInput[],
): Map<string, Money> {
  const totals = new Map<string, Money>();
  for (const member of members) {
    totals.set(member.id, Money.zero());
  }
  for (const line of lines) {
    if (!line.delivered || line.actualPrice === null) {
      continue;
    }
    const current = totals.get(line.memberId) ?? Money.zero();
    totals.set(line.memberId, current.add(line.actualPrice));
  }
  return totals;
}

export function deliveredLinesMissingPrice(lines: BillLineInput[]): string[] {
  return lines
    .filter((line) => line.delivered && line.actualPrice === null)
    .map((line) => line.id);
}

export function reconcile(
  computedTotal: Money,
  receiptTotal: Money | null,
): Reconciliation {
  if (receiptTotal === null) {
    return {
      receiptTotal: null,
      computedTotal,
      difference: null,
      warns: false,
    };
  }
  const difference = computedTotal.sub(receiptTotal);
  return {
    receiptTotal,
    computedTotal,
    difference,
    warns: difference.toPiastres() !== 0n,
  };
}

export function buildInvariant(
  members: BillMemberInput[],
  lines: BillLineInput[],
  fees: BillFeesInput,
  paymentOverride?: Map<string, InvariantMember['paymentStatus']>,
): InvariantBlock {
  const subtotals = memberSubtotals(members, lines);
  const parties = members.map((member) => ({
    id: member.id,
    subtotal: subtotals.get(member.id) ?? Money.zero(),
  }));
  const feesNet = netFees(fees);
  const allocations = allocateFees(parties, feesNet);
  const allocationById = new Map(allocations.map((row) => [row.id, row]));
  const subtotal = parties.reduce(
    (sum, party) => sum.add(party.subtotal),
    Money.zero(),
  );
  const total = subtotal.add(feesNet);
  const invariantMembers: InvariantMember[] = members.map((member) => {
    const allocation = allocationById.get(member.id);
    const itemsSubtotal = allocation?.subtotal ?? Money.zero();
    const feesShare = allocation?.feesShare ?? Money.zero();
    const noDelivered = !lines.some(
      (line) => line.memberId === member.id && line.delivered,
    );
    const autoPaid = noDelivered ? 'paid' : member.paymentStatus;
    const paymentStatus = paymentOverride?.get(member.id) ?? autoPaid;
    return {
      id: member.id,
      userId: member.userId,
      displayName: member.displayName,
      itemsSubtotal,
      feesShare,
      total: itemsSubtotal.add(feesShare),
      paymentStatus,
    };
  });

  return {
    subtotal,
    deliveryFee: fees.deliveryFee,
    serviceFee: fees.serviceFee,
    discount: fees.discount,
    netFees: feesNet,
    tax: fees.serviceFee,
    total,
    members: invariantMembers,
    allocations,
    reconciliation: reconcile(total, fees.receiptTotal),
  };
}
