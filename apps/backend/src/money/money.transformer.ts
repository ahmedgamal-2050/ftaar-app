import { Money } from './money';

/**
 * Maps {@link Money} to a BIGINT column and back.
 * Same shape as a TypeORM ValueTransformer; used with Prisma BigInt fields.
 */
export class MoneyTransformer {
  to(value: Money | null | undefined): bigint | null {
    if (value === null || value === undefined) {
      return null;
    }
    return value.toPiastres();
  }

  from(value: bigint | string | null | undefined): Money | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      return Money.fromPiastres(BigInt(value));
    }
    return Money.fromPiastres(value);
  }
}

export const moneyTransformer = new MoneyTransformer();
