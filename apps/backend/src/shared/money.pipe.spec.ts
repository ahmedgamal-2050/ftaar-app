import { MoneyPipe } from './money.pipe';
import { Money } from '../money/money';
import { AppError } from '../core/errors/app-error';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('parses an EGP string', () => {
    expect(pipe.transform('36.87').toPiastres()).toBe(3687n);
  });

  it('passes through a Money instance', () => {
    const amount = Money.fromPiastres(100n);
    expect(pipe.transform(amount)).toBe(amount);
  });

  it('rejects an invalid amount', () => {
    expect(() => pipe.transform('1.234')).toThrow(AppError);
  });
});
