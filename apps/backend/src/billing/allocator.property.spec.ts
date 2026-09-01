import fc from 'fast-check';
import { Money } from '../money/money';
import { allocateFees } from './allocator';

describe('allocator properties (BILL-05)', () => {
  const partyArb = fc.uniqueArray(
    fc.record({
      id: fc.uuid(),
      subtotal: fc.bigInt({ min: 0n, max: 50_000n }),
    }),
    { minLength: 1, maxLength: 8, selector: (party) => party.id },
  );

  it('holds over 10_000 cases', () => {
    fc.assert(
      fc.property(
        partyArb,
        fc.bigInt({ min: -20_000n, max: 20_000n }),
        (rawParties, pool) => {
          const parties = rawParties.map((party) => ({
            id: party.id,
            subtotal: Money.fromPiastres(party.subtotal),
          }));
          const result = allocateFees(parties, Money.fromPiastres(pool));
          const sum = result.reduce(
            (acc, row) => acc + row.feesShare.toPiastres(),
            0n,
          );
          expect(sum).toBe(pool);

          if (pool >= 0n) {
            for (const row of result) {
              expect(row.feesShare.toPiastres() >= 0n).toBe(true);
            }
            const bySubtotal = [...result].sort(
              (a, b) =>
                Number(b.subtotal.toPiastres() - a.subtotal.toPiastres()) ||
                a.id.localeCompare(b.id),
            );
            for (let i = 1; i < bySubtotal.length; i += 1) {
              const larger = bySubtotal[i - 1];
              const smaller = bySubtotal[i];
              if (!larger || !smaller) {
                continue;
              }
              if (
                larger.subtotal.toPiastres() === smaller.subtotal.toPiastres()
              ) {
                continue;
              }
              expect(larger.feesShare.toPiastres()).toBeGreaterThanOrEqual(
                smaller.feesShare.toPiastres(),
              );
            }
          }
        },
      ),
      { numRuns: 10_000 },
    );
  });
});
