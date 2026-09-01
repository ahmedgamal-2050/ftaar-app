import { Money } from '../money/money';
import { allocateFees, floorDiv } from './allocator';

function egp(piastres: bigint): Money {
  return Money.fromPiastres(piastres);
}

describe('allocator', () => {
  describe('floorDiv', () => {
    it('matches integer division for positives', () => {
      expect(floorDiv(10n, 3n)).toBe(3n);
    });

    it('floors negatives toward -∞', () => {
      expect(floorDiv(-10n, 3n)).toBe(-4n);
    });
  });

  it('uses the integer floor of each line share (BILL-02)', () => {
    const result = allocateFees(
      [
        { id: 'a', subtotal: egp(200n) },
        { id: 'b', subtotal: egp(100n) },
      ],
      egp(10n),
    );
    expect(result[0]?.feesShare.toPiastres()).toBe(7n);
    expect(result[1]?.feesShare.toPiastres()).toBe(3n);
  });

  it('hands leftover piastres largest-remainder-first, then larger subtotal (BILL-03)', () => {
    const result = allocateFees(
      [
        { id: 'small', subtotal: egp(10n) },
        { id: 'large', subtotal: egp(20n) },
      ],
      egp(1n),
    );
    expect(
      result.find((row) => row.id === 'large')?.feesShare.toPiastres(),
    ).toBe(1n);
    expect(
      result.find((row) => row.id === 'small')?.feesShare.toPiastres(),
    ).toBe(0n);
  });

  it('splits fees equally when every subtotal is 0 (BILL-04)', () => {
    const result = allocateFees(
      [
        { id: 'a', subtotal: Money.zero() },
        { id: 'b', subtotal: Money.zero() },
      ],
      egp(5n),
    );
    const shares = result.map((row) => row.feesShare.toPiastres()).sort();
    expect(shares).toEqual([2n, 3n]);
    expect(
      result.reduce((sum, row) => sum + row.feesShare.toPiastres(), 0n),
    ).toBe(5n);
  });

  it('allocates a negative pool when discount exceeds fees (BILL-04)', () => {
    const result = allocateFees(
      [
        { id: 'a', subtotal: egp(200n) },
        { id: 'b', subtotal: egp(100n) },
      ],
      egp(-5n),
    );
    expect(
      result.reduce((sum, row) => sum + row.feesShare.toPiastres(), 0n),
    ).toBe(-5n);
    expect(result[0]?.feesShare.toPiastres()).toBeLessThan(0n);
  });
});
