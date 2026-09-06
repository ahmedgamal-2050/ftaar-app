/**
 * Piastre-integer money helpers for the bill screens. Amounts cross the wire
 * as EGP strings ("36.87") but every sum and split here runs on integer
 * piastres, so the running total the host watches never drifts a cent from
 * the total the backend recomputes on finalise.
 */

/** The same shape the backend's `Money.fromEgpString` accepts. */
const EGP_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isValidEgp(value: string): boolean {
  return EGP_PATTERN.test(value.trim());
}

export function toPiastres(egp: string): number {
  return Math.round(parseFloat(egp) * 100);
}

export function fromPiastres(piastres: number): string {
  const negative = piastres < 0;
  const abs = Math.abs(piastres);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${fraction}`;
}

/**
 * Reads a host-typed field. Blank and half-typed values ("12.", "") count as
 * zero rather than NaN — the running total updates on every keystroke, so it
 * has to survive the states a field passes through while being edited.
 */
export function piastresOf(egp: string | null | undefined): number {
  if (!egp || !isValidEgp(egp)) {
    return 0;
  }
  return toPiastres(egp);
}

/**
 * Splits a group's total across its lines by quantity: floor each share, then
 * hand the leftover piastres out largest-remainder first, ties preferring the
 * larger quantity and then the earlier line. Same rule as the backend's fee
 * allocator, so the split always adds back up to exactly the input.
 *
 * Lines with no quantity between them fall back to an equal split.
 */
export function splitByQty(totalPiastres: number, qtys: number[]): number[] {
  if (qtys.length === 0) {
    return [];
  }
  const weights = qtys.some((qty) => qty > 0) ? qtys : qtys.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const shares = weights.map((weight) =>
    Math.floor((totalPiastres * weight) / totalWeight),
  );
  const leftover =
    totalPiastres - shares.reduce((sum, share) => sum + share, 0);

  const order = weights
    .map((weight, index) => ({
      index,
      weight,
      remainder: totalPiastres * weight - shares[index] * totalWeight,
    }))
    .sort(
      (a, b) =>
        b.remainder - a.remainder || b.weight - a.weight || a.index - b.index,
    );

  for (let i = 0; i < leftover; i += 1) {
    shares[order[i % order.length].index] += 1;
  }
  return shares;
}
