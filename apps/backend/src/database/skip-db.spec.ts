import { shouldSkipDatabase } from './skip-db';

describe('Prisma database skip (DB-01)', () => {
  it('does not auto-sync schema (migrations only)', () => {
    expect(shouldSkipDatabase()).toBe(true);
  });
});
