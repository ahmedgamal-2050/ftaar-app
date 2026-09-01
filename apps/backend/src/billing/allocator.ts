import { Money } from '../money/money';

export interface AllocationParty {
  id: string;
  subtotal: Money;
}

export interface FeeAllocation {
  id: string;
  subtotal: Money;
  feesShare: Money;
  total: Money;
}

/** Truncate toward −∞ so remainders stay non-negative when `b` is positive. */
export function floorDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    throw new RangeError('division by zero');
  }
  const quotient = a / b;
  const remainder = a % b;
  if (remainder !== 0n && a < 0n !== b < 0n) {
    return quotient - 1n;
  }
  return quotient;
}

/**
 * Split `netFees` across parties in proportion to subtotal (Hamilton / largest remainder).
 * Leftover piastres go largest-fraction first; ties prefer the larger subtotal, then id.
 */
export function allocateFees(
  parties: AllocationParty[],
  netFees: Money,
): FeeAllocation[] {
  if (parties.length === 0) {
    return [];
  }

  const pool = netFees.toPiastres();
  const weights = parties.map((party) => {
    const subtotal = party.subtotal.toPiastres();
    return { id: party.id, subtotal, weight: subtotal };
  });
  const weightSum = weights.reduce((sum, row) => sum + row.weight, 0n);
  const equalSplit = weightSum === 0n;
  const divisor = equalSplit ? BigInt(parties.length) : weightSum;

  const rows = weights.map((row) => {
    const weight = equalSplit ? 1n : row.weight;
    const numerator = pool * weight;
    const floor = floorDiv(numerator, divisor);
    const remainder = numerator - floor * divisor;
    return {
      id: row.id,
      subtotal: row.subtotal,
      floor,
      remainder,
    };
  });

  let leftover = pool - rows.reduce((sum, row) => sum + row.floor, 0n);
  const ranked = [...rows].sort((a, b) => {
    if (a.remainder !== b.remainder) {
      return a.remainder > b.remainder ? -1 : 1;
    }
    if (a.subtotal !== b.subtotal) {
      return a.subtotal > b.subtotal ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });

  const extra = new Map<string, bigint>();
  let index = 0;
  while (leftover > 0n && ranked.length > 0) {
    const row = ranked[index % ranked.length];
    if (!row) {
      break;
    }
    extra.set(row.id, (extra.get(row.id) ?? 0n) + 1n);
    leftover -= 1n;
    index += 1;
  }

  return parties.map((party) => {
    const row = rows.find((item) => item.id === party.id);
    const share = (row?.floor ?? 0n) + (extra.get(party.id) ?? 0n);
    const feesShare = Money.fromPiastres(share);
    return {
      id: party.id,
      subtotal: party.subtotal,
      feesShare,
      total: party.subtotal.add(feesShare),
    };
  });
}
