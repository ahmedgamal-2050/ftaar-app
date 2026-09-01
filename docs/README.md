# Documentation

Guides for work completed in this workspace. Task-ID checklists record **what shipped**. [Build from scratch](./build-from-scratch.md) records **why and in what order you would rebuild**.

## Learning

- [Build from scratch](./build-from-scratch.md) — architecture, request pipeline, implementation phases, critique, and exercises.

## Backend

- [Foundation (CORE-01–CORE-10)](./backend-foundation/backend-foundation.md) — NestJS core platform: config, errors, logging, throttling, Swagger, and HTTP envelope.
- [Database (DB-01–DB-12)](./backend-foundation/backend-database.md) — Prisma client, migrations, constraints, and seed.
- [Money (MONEY-01–MONEY-06)](./backend-foundation/backend-money.md) — Piastre `Money` class, EGP parsing, BIGINT mapping, JSON serialisation.
- [Ops (OPS-01–OPS-08)](./backend-foundation/backend-ops.md) — Docker, compose, CI, Terminus health, staging, Helmet/CORS, secrets, audit.
- [Shared (SHR-01–SHR-03)](./backend-foundation/backend-shared.md) — `runInTransaction`, nested join, UUID/Money pipes, `@Public()`.
- [Auth (AUTH-01–AUTH-17, USER-01–USER-03)](./backend-auth.md) — JWT, guest/register/convert, OTP, refresh families, profile.
- [OTP security audit](./auth-otp-security-audit.md) — TTL, attempts, hashing, rate limits, gaps.
- [Catalog menu (MENU-01–MENU-07)](./backend-catalog/backend-menu.md) — MenuItem `Money` price, restaurant menu APIs, bulk import, soft delete.
- [Catalog restaurants (REST-01–REST-06)](./backend-catalog/backend-restaurants.md) — Restaurant CRUD, Arabic search, pagination, nested menu.
- [Lobbies (LOBBY-01–LOBBY-08)](./backend-lobbies.md) — Create, join by code, lock / reopen, leave / kick.
- [Orders (ORD-01–ORD-07)](./backend-orders.md) — Member cart, admin roster / kitchen summary, price override.
- [Billing (BILL-01–BILL-17)](./backend-billing.md) — Fee allocator, draft / lines / preview / finalise / reopen; JWT identity.

## Mobile

- [Auth flow](./mobile-auth.md) — Welcome / guest name / register / login / profile / forgot-password, against the real `/api/auth` contract.
