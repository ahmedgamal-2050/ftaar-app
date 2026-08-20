# Money (FOUNDATION-BE MONEY-01–MONEY-06)

Status: **done** in `apps/backend/src/money`. Amounts are stored as integer **piastres** (`bigint`), never floats.

1 EGP = 100 piastres. Database columns stay `BIGINT`; the `Money` class is the only way application code should talk about money.

## Task checklist

| ID       | Task                     | Done when                                                                     |
| -------- | ------------------------ | ----------------------------------------------------------------------------- |
| MONEY-01 | Money class skeleton     | Private `bigint` piastres; `fromPiastres`; `zero()`                           |
| MONEY-02 | `fromEgpString` parser   | Accepts `"36.87"`, `"36"`, `"36.8"`; rejects `"1.234"`, `"abc"`, `""`, `null` |
| MONEY-03 | Arithmetic               | `add`, `sub`, `mulInt`; all return new instances                              |
| MONEY-04 | `toEgpString` + `toJSON` | `3687n` → `"36.87"`; JSON responses serialise automatically                   |
| MONEY-05 | BIGINT transformer       | `Money` ↔ `BIGINT` round-trips; null-safe (Prisma, TypeORM-shaped API)       |
| MONEY-06 | Unit test suite          | 100% branch coverage on `money.ts`                                            |

## Usage

```ts
import { Money } from '../money/money';

Money.fromEgpString('36.87'); // 3687 piastres
Money.fromPiastres(3687n);
Money.zero();

const total = Money.fromEgpString('10').add(Money.fromEgpString('2.50'));
total.mulInt(3).toEgpString(); // "37.50"
```

Invalid parse throws `AppError` with `VALIDATION_ERROR`.

## JSON

`Money.toJSON()` returns the EGP string. `ResponseWrapInterceptor` also walks payloads and converts `Money` and leftover `bigint` values, so every HTTP envelope serialises money as `"36.87"`.

```json
{ "success": true, "data": { "total": "36.87" } }
```

## Prisma / BIGINT

`MoneyTransformer` (`to` / `from`) is the TypeORM-style mapper. Prisma has no column transformers; use it when reading or writing BigInt money fields:

```ts
prisma.menuItem.create({
  data: {
    referencePrice: moneyTransformer.to(price) ?? 0n,
  },
});

const price = moneyTransformer.from(row.referencePrice);
```

`PrismaService.moneyToDb` / `moneyFromDb` are the same helpers.

`to(null \| undefined)` and `from(null \| undefined)` return `null`. `from` also accepts a numeric string (how `pg` sometimes returns `BIGINT`).

## Tests

```sh
npx nx run backend:test
```

Jest collects coverage for `src/money/money.ts` and fails if branch coverage is below 100%.
