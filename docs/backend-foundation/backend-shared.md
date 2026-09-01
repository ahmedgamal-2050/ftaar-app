# Backend shared helpers (FOUNDATION-BE SHR-01–SHR-03)

Status: **done**. Prisma-aware `runInTransaction`, nested join, and shared HTTP pipes/decorators.

The CSV names an “entity manager”. With Prisma that is `Prisma.TransactionClient` (`EntityManager` in code), not TypeORM.

## Task checklist

| ID     | Task                      | Done when                                                                         |
| ------ | ------------------------- | --------------------------------------------------------------------------------- |
| SHR-01 | `runInTransaction` helper | Callback receives an entity manager; documented with an example                   |
| SHR-02 | Nested transaction join   | A nested call joins the outer transaction; a test proves `$transaction` runs once |
| SHR-03 | Common pipes / decorator  | `ParseUuidPipe`, `MoneyPipe`, `@Public()`                                         |

## SHR-01 / SHR-02 — transactions

```ts
import { runInTransaction } from './shared/run-in-transaction';

await runInTransaction(prisma, async (em) => {
  const restaurant = await em.restaurant.create({
    data: { name: 'Demo Kitchen' },
  });
  await addMenuItem(em, restaurant.id);
});

async function addMenuItem(em: EntityManager, restaurantId: string) {
  await runInTransaction(prisma, async (inner) => {
    // `inner` is the same client as `em`; no second BEGIN
    await inner.menuItem.create({
      data: {
        restaurantId,
        name: 'شاي',
        referencePrice: 1200n,
      },
    });
  });
}
```

`PrismaService.runInTransaction(work)` is the same helper bound to the Nest client.

Nested calls use `AsyncLocalStorage`. After the outer callback finishes, the next `runInTransaction` opens a new transaction.

## SHR-03 — pipes and `@Public()`

| Symbol          | Use                                                             |
| --------------- | --------------------------------------------------------------- |
| `ParseUuidPipe` | Route/query param must be UUID v4; otherwise `VALIDATION_ERROR` |
| `MoneyPipe`     | Parses an EGP string (`"36.87"`) into `Money`                   |
| `@Public()`     | Sets `isPublic`; global `JwtAuthGuard` skips those handlers     |

```ts
@Get(':id')
findOne(@Param('id', ParseUuidPipe) id: string) { /* ... */ }

@Get('quote')
quote(@Query('amount', MoneyPipe) amount: Money) { /* ... */ }

@Public()
@Post('auth/login')
login() { /* ... */ }
```

`JwtAuthGuard` is global (`AppModule` `APP_GUARD`). It reads `IS_PUBLIC_KEY` (`'isPublic'`) via `Reflector`. Prefer `apps/backend/src/auth/decorators/public.decorator.ts` on routes; `src/shared/public.decorator.ts` uses the same key.
