# Backend database (FOUNDATION-BE DB-01–DB-12)

Status: **done** with **Prisma**. Schema changes go through `prisma migrate` only (`db push` / auto-sync is not used).

## Quick start

```sh
npm run db:up
npm run db:migrate
npm run db:seed
npm run start:dev
```

`DATABASE_URL` is required (see `apps/backend/.env.example`):

```
postgres://ftaar:ftaar@127.0.0.1:5432/ftaar
```

## Scripts

| Command                                 | What it does                                           |
| --------------------------------------- | ------------------------------------------------------ |
| `npm run db:up`                         | Starts Postgres 16 via `docker-compose.yml`            |
| `npx nx run backend:prisma-generate`    | Generate `PrismaClient`                                |
| `npx nx run backend:migration-generate` | `prisma migrate dev --create-only` from schema drift   |
| `npm run db:migrate`                    | `prisma migrate deploy`                                |
| `npm run db:revert`                     | Runs the last migration’s `down.sql` and un-records it |
| `npm run db:seed`                       | Idempotent seed (runs migrate first)                   |

Each folder under `apps/backend/prisma/migrations/` has `migration.sql` (up) and `down.sql` (revert).

## Task checklist

| ID    | Task                            | Done when                                                                               |
| ----- | ------------------------------- | --------------------------------------------------------------------------------------- |
| DB-01 | Data source + migration scripts | Generate, run, and revert work; no schema auto-sync                                     |
| DB-02 | Enums                           | `lobby_status`, `member_role`, `payment_status`                                         |
| DB-03 | `users`                         | Email/device nullable per kind                                                          |
| DB-04 | `restaurants` + `menu_items`    | `reference_price` BIGINT; `is_active` default true                                      |
| DB-05 | `lobbies` + `lobby_members`     | `restaurant_id` NOT NULL; `code` unique                                                 |
| DB-06 | `order_items` + `lobby_bill`    | Money columns BIGINT; `lobby_bill.lobby_id` unique                                      |
| DB-07 | Unique indexes                  | Admin, lower(name), one membership/user, lower(email), guest device                     |
| DB-08 | Check constraints               | `ck_user_kind`, `ck_qty`, `ck_actual_price`                                             |
| DB-09 | Composite FK                    | Cross-restaurant `order_items` insert fails                                             |
| DB-10 | Performance indexes             | Lobby-detail `EXPLAIN` has no sequential scan (`enable_seqscan=off`)                    |
| DB-11 | Constraint tests                | Eight unique/check constraints each have a failing insert test                          |
| DB-12 | Seed                            | 3 restaurants, 15–40 Arabic items each, 6 mixed users, one lobby per status; idempotent |

Partial unique indexes, check constraints, and composite FKs live in SQL migrations (Prisma schema cannot express `WHERE` / `CHECK` / overlapping composite keys). The database still enforces them.

## Enums

- `lobby_status`: `open`, `locked`, `billed`, `settled`, `cancelled`
- `member_role`: `admin`, `member`
- `payment_status`: `unpaid`, `pending`, `paid`, `failed`

User kind is not a Postgres enum. It is `registered` \| `guest` with `ck_user_kind`:

- registered → `email` required
- guest → `device_id` required

## Composite foreign keys (DB-09)

`order_items` stores `restaurant_id` and must match both:

- `menu_items (id, restaurant_id)`
- `lobbies (id, restaurant_id)`

## Money

All prices and bill amounts are **BIGINT** integer minor units (for example halalas).

## Tests

`apps/backend/src/database/database.constraints.spec.ts` uses a real Postgres when migrations have been applied. If the database is down, those cases return early.

```sh
npm run db:up
npm run db:migrate
npx nx run backend:test
```

## Nest wiring

Inject `PrismaService` (extends `PrismaClient`). `DatabaseModule.forRoot()` is skipped when:

- the process is started with `--export-openapi`, or
- `SKIP_DB=true` (Jest sets this so HTTP tests do not need Postgres)
