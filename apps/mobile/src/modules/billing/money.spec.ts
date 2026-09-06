import { fromPiastres, isValidEgp, piastresOf, splitByQty } from './money';

describe('EGP strings', () => {
  it('accepts the shapes the backend accepts and rejects the rest', () => {
    expect(isValidEgp('0')).toBe(true);
    expect(isValidEgp('36.8')).toBe(true);
    expect(isValidEgp('36.87')).toBe(true);
    expect(isValidEgp('36.875')).toBe(false);
    expect(isValidEgp('-1.00')).toBe(false);
    expect(isValidEgp('12.')).toBe(false);
    expect(isValidEgp('abc')).toBe(false);
  });

  it('always renders two decimal places', () => {
    expect(fromPiastres(0)).toBe('0.00');
    expect(fromPiastres(5)).toBe('0.05');
    expect(fromPiastres(3687)).toBe('36.87');
    expect(fromPiastres(-150)).toBe('-1.50');
  });

  /** The running total updates on every keystroke, so half-typed input has to
   * read as zero rather than NaN. */
  it('reads a half-typed or empty field as zero', () => {
    expect(piastresOf('')).toBe(0);
    expect(piastresOf('12.')).toBe(0);
    expect(piastresOf(null)).toBe(0);
    expect(piastresOf('12.34')).toBe(1234);
  });
});

describe('splitByQty', () => {
  it('splits proportionally when it divides evenly', () => {
    expect(splitByQty(6000, [2, 4])).toEqual([2000, 4000]);
  });

  it('never loses or invents a piastre', () => {
    const shares = splitByQty(1000, [1, 1, 1]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1000);
  });

  it('hands leftover piastres to the largest remainder first', () => {
    // 10.00 over 1 + 2 items: both floor down, and the spare piastre goes to
    // the larger remainder (the ×2 line) rather than the first one.
    expect(splitByQty(1000, [1, 2])).toEqual([333, 667]);
  });

  it('breaks a remainder tie on the earlier line', () => {
    expect(splitByQty(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });

  it('splits equally when no line has a quantity', () => {
    expect(splitByQty(900, [0, 0, 0])).toEqual([300, 300, 300]);
  });

  it('returns nothing for no lines', () => {
    expect(splitByQty(500, [])).toEqual([]);
  });
});
