import { Money } from './money';

export function serializeMoney(value: unknown): unknown {
  if (value instanceof Money) {
    return value.toJSON();
  }
  if (typeof value === 'bigint') {
    return Money.fromPiastres(value).toJSON();
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(serializeMoney);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        serializeMoney(nested),
      ]),
    );
  }
  return value;
}
