import { AppError } from '../core/errors/app-error';

const EGP_PATTERN = /^\d+(\.\d{1,2})?$/;

export class Money {
  private constructor(private readonly piastres: bigint) {}

  static zero(): Money {
    return new Money(0n);
  }

  static fromPiastres(value: bigint): Money {
    if (typeof value !== 'bigint') {
      throw new AppError('VALIDATION_ERROR', 'piastres must be a bigint');
    }
    return new Money(value);
  }

  static fromEgpString(value: unknown): Money {
    if (value === null) {
      throw new AppError('VALIDATION_ERROR', 'EGP amount is required');
    }
    if (typeof value !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'EGP amount must be a string');
    }
    if (value === '') {
      throw new AppError('VALIDATION_ERROR', 'EGP amount is required');
    }
    if (!EGP_PATTERN.test(value)) {
      throw new AppError('VALIDATION_ERROR', `Invalid EGP amount: ${value}`);
    }
    const dot = value.indexOf('.');
    if (dot === -1) {
      return new Money(BigInt(value) * 100n);
    }
    const pounds = value.slice(0, dot);
    const fraction = value.slice(dot + 1);
    const padded = fraction.length === 1 ? `${fraction}0` : fraction;
    return new Money(BigInt(pounds) * 100n + BigInt(padded));
  }

  add(other: Money): Money {
    return new Money(this.piastres + other.piastres);
  }

  sub(other: Money): Money {
    return new Money(this.piastres - other.piastres);
  }

  mulInt(multiplier: number): Money {
    if (!Number.isInteger(multiplier)) {
      throw new AppError('VALIDATION_ERROR', 'multiplier must be an integer');
    }
    return new Money(this.piastres * BigInt(multiplier));
  }

  toPiastres(): bigint {
    return this.piastres;
  }

  toEgpString(): string {
    const negative = this.piastres < 0n;
    const abs = negative ? -this.piastres : this.piastres;
    const pounds = abs / 100n;
    const fraction = abs % 100n;
    const sign = negative ? '-' : '';
    return `${sign}${pounds.toString()}.${fraction.toString().padStart(2, '0')}`;
  }

  toJSON(): string {
    return this.toEgpString();
  }
}
