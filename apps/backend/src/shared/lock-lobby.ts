/**
 * Minimal surface needed to take the lock. Deliberately structural rather
 * than `Pick<EntityManager, '$queryRaw'>`: the services model their `em` with
 * hand-written types, which can't reproduce Prisma's branded `PrismaPromise`
 * return value. Widening to `PromiseLike` accepts both.
 */
export interface LobbyRowLocker {
  $queryRaw(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): PromiseLike<unknown>;
}

/**
 * Takes an exclusive row lock on the lobby for the rest of the transaction.
 *
 * Postgres runs at READ COMMITTED by default, so two transactions can each
 * read the same "before" state and then commit contradictory writes. The case
 * that matters here is settlement: `settle` reads "every owing member has
 * paid" while `reopen` concurrently resets everyone to unpaid, and whichever
 * commits second silently wins — leaving a settled lobby with money still
 * owed, or a settled lobby dragged back to `arrived`.
 *
 * Every write whose correctness depends on the lobby's status or its members'
 * payment statuses must call this first, so those transactions serialise
 * instead of interleaving. Contention is scoped to a single lobby — one
 * dinner table — so the lock is never a throughput concern.
 *
 * Must be called inside a transaction; `FOR UPDATE` outside one releases
 * immediately and protects nothing.
 */
export async function lockLobbyRow(
  em: LobbyRowLocker,
  lobbyId: string,
): Promise<void> {
  await em.$queryRaw`SELECT id FROM lobbies WHERE id = ${lobbyId}::uuid FOR UPDATE`;
}
