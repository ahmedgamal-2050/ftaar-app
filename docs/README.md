# Documentation

Guides for work completed in this workspace.

## Backend

- [Foundation (CORE-01–CORE-10)](./backend-foundation.md) — NestJS core platform: config, errors, logging, throttling, Swagger, and HTTP envelope.
- [Database (DB-01–DB-12)](./backend-database.md) — Prisma client, migrations, constraints, and seed.
- [Money (MONEY-01–MONEY-06)](./backend-money.md) — Piastre `Money` class, EGP parsing, BIGINT mapping, JSON serialisation.
- [Ops (OPS-01–OPS-08)](./backend-ops.md) — Docker, compose, CI, Terminus health, staging, Helmet/CORS, secrets, audit.
- [Shared (SHR-01–SHR-03)](./backend-shared.md) — `runInTransaction`, nested join, UUID/Money pipes, `@Public()`.
- [Catalog menu (MENU-01–MENU-07)](./backend-catalog/backend-menu.md) — MenuItem `Money` price, restaurant menu APIs, bulk import, soft delete.

## Mobile

- [Auth flow](./mobile-auth.md) — Welcome/ChooseName/Register/Login/Profile + the forgot-password flow, wired against the real backend API, with the contract gotchas and bugs found along the way.
