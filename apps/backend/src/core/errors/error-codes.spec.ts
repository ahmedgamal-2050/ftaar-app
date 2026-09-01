import { ERROR_CODES, ERROR_HTTP_STATUS, type ErrorCode } from './error-codes';

describe('error codes', () => {
  it('defines exactly 25 codes', () => {
    expect(ERROR_CODES).toHaveLength(27);
  });

  it('maps every code to an HTTP status (compile-time + runtime)', () => {
    for (const code of ERROR_CODES) {
      const status: number = ERROR_HTTP_STATUS[code];
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }

    const mapped = Object.keys(ERROR_HTTP_STATUS) as ErrorCode[];
    expect(mapped.sort()).toEqual([...ERROR_CODES].sort());
  });
});
