import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, type PrismaClient } from '@prisma/client';

/** Interactive Prisma client bound to the current transaction (TypeORM EntityManager analogue). */
export type EntityManager = Prisma.TransactionClient;

const transactionAls = new AsyncLocalStorage<EntityManager>();

export type PrismaTxHost = Pick<PrismaClient, '$transaction'>;

/**
 * Run `work` inside a Prisma interactive transaction.
 * Nested calls join the outer transaction instead of opening a second one.
 *
 * @example
 * ```ts
 * await runInTransaction(prisma, async (em) => {
 *   const restaurant = await em.restaurant.create({
 *     data: { name: 'Demo Kitchen' },
 *   });
 *   await addMenuItem(em, restaurant.id); // nested runInTransaction joins

 * });
 * ```
 */
export async function runInTransaction<T>(
  prisma: PrismaTxHost,
  work: (em: EntityManager) => Promise<T>,
): Promise<T> {
  const existing = transactionAls.getStore();
  if (existing) {
    return work(existing);
  }
  return prisma.$transaction((tx) => transactionAls.run(tx, () => work(tx)));
}

export function currentEntityManager(): EntityManager | undefined {
  return transactionAls.getStore();
}
