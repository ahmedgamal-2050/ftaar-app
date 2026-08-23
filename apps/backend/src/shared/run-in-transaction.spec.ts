import {
  currentEntityManager,
  runInTransaction,
  type PrismaTxHost,
} from './run-in-transaction';

function fakePrisma(em: { tag: string }): PrismaTxHost {
  return {
    $transaction: jest.fn(
      async (fn: (tx: { tag: string }) => Promise<unknown>) => fn(em),
    ),
  } as unknown as PrismaTxHost;
}

describe('runInTransaction', () => {
  it('exposes the transaction client as the entity manager', async () => {
    const em = { tag: 'outer' };
    const prisma = fakePrisma(em);

    const result = await runInTransaction(prisma, async (manager) => {
      expect(manager).toBe(em);
      expect(currentEntityManager()).toBe(em);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(currentEntityManager()).toBeUndefined();
  });

  it('joins the outer transaction instead of opening a second', async () => {
    const em = { tag: 'shared' };
    const prisma = fakePrisma(em);

    await runInTransaction(prisma, async (outer) => {
      await runInTransaction(prisma, async (inner) => {
        expect(inner).toBe(outer);
        expect(inner).toBe(em);
      });
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('starts a new transaction after the outer one finishes', async () => {
    const first = { tag: 'first' };
    const second = { tag: 'second' };
    const clients = [first, second];
    const prisma = {
      $transaction: jest.fn(
        async (fn: (tx: { tag: string }) => Promise<unknown>) => {
          const tx = clients.shift();
          if (!tx) {
            throw new Error('unexpected $transaction');
          }
          return fn(tx);
        },
      ),
    } as unknown as PrismaTxHost;

    await runInTransaction(prisma, async (em) => {
      expect(em).toBe(first);
    });
    await runInTransaction(prisma, async (em) => {
      expect(em).toBe(second);
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
