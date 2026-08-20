import { AppError } from '../core/errors/app-error';
import { Money } from './money';
import { moneyTransformer } from './money.transformer';

describe('Money', () => {
  describe('fromPiastres + zero', () => {
    it('stores a private piastres amount', () => {
      expect(Money.fromPiastres(3687n).toPiastres()).toBe(3687n);
    });

    it('returns a zero instance', () => {
      expect(Money.zero().toPiastres()).toBe(0n);
    });

    it('rejects a non-bigint', () => {
      expect(() => Money.fromPiastres(36 as unknown as bigint)).toThrow(
        AppError,
      );
    });
  });

  describe('fromEgpString', () => {
    it.each([
      ['36.87', 3687n],
      ['36', 3600n],
      ['36.8', 3680n],
      ['0', 0n],
      ['0.01', 1n],
    ])('parses %s', (input, piastres) => {
      expect(Money.fromEgpString(input).toPiastres()).toBe(piastres);
    });

    it.each([null, '', 'abc', '1.234'])('rejects %j', (input) => {
      expect(() => Money.fromEgpString(input)).toThrow(AppError);
    });

    it('rejects a non-string', () => {
      expect(() => Money.fromEgpString(36.87)).toThrow(AppError);
    });
  });

  describe('arithmetic', () => {
    const a = Money.fromPiastres(100n);
    const b = Money.fromPiastres(40n);

    it('adds without mutating', () => {
      const sum = a.add(b);
      expect(sum.toPiastres()).toBe(140n);
      expect(a.toPiastres()).toBe(100n);
      expect(sum).not.toBe(a);
    });

    it('subtracts without mutating', () => {
      const diff = a.sub(b);
      expect(diff.toPiastres()).toBe(60n);
      expect(a.toPiastres()).toBe(100n);
    });

    it('multiplies by an integer without mutating', () => {
      const product = a.mulInt(3);
      expect(product.toPiastres()).toBe(300n);
      expect(a.toPiastres()).toBe(100n);
    });

    it('rejects a non-integer multiplier', () => {
      expect(() => a.mulInt(1.5)).toThrow(AppError);
    });
  });

  describe('toEgpString + toJSON', () => {
    it('formats 3687n as 36.87', () => {
      const money = Money.fromPiastres(3687n);
      expect(money.toEgpString()).toBe('36.87');
      expect(money.toJSON()).toBe('36.87');
    });

    it('pads a single-digit fraction', () => {
      expect(Money.fromPiastres(3601n).toEgpString()).toBe('36.01');
    });

    it('formats a negative amount', () => {
      expect(Money.zero().sub(Money.fromPiastres(1n)).toEgpString()).toBe(
        '-0.01',
      );
    });

    it('serialises through JSON.stringify', () => {
      expect(JSON.stringify({ total: Money.fromPiastres(3687n) })).toBe(
        '{"total":"36.87"}',
      );
    });
  });
});

describe('MoneyTransformer', () => {
  it('round-trips Money to BIGINT', () => {
    const money = Money.fromPiastres(3687n);
    expect(moneyTransformer.to(money)).toBe(3687n);
    expect(moneyTransformer.from(3687n)?.toPiastres()).toBe(3687n);
    expect(moneyTransformer.from('3687')?.toPiastres()).toBe(3687n);
  });

  it('is null-safe', () => {
    expect(moneyTransformer.to(null)).toBeNull();
    expect(moneyTransformer.to(undefined)).toBeNull();
    expect(moneyTransformer.from(null)).toBeNull();
    expect(moneyTransformer.from(undefined)).toBeNull();
  });
});
