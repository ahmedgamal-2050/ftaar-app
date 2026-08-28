# Build a similar system from scratch

This is a **learning and replication guide**, not a file inventory. It reverse-engineers the architecture of this workspace so you can build a **similar** product later without an AI and without copying this repository.

**What this workspace is:** FTAAR — a group restaurant order (lobby) with split billing. The **real product** is a NestJS API: Postgres, integer money, an admin bill workflow, Docker, and CI.

**What it sits on:** an Nx NestJS + Expo **template**. The README, in-memory todos, shared Todo types, and the mobile welcome screen are leftover scaffolding. Treat them as examples of what *not* to confuse with the architecture.

**How to use this document**

1. Read the overview and technology choices once.
2. Work through phases 0–17 in order. Each phase has exit criteria — do not skip them.
3. When you start a new project months later, use [Keep This Beside Me While Building](#keep-this-beside-me-while-building).
4. Task-ID checklists (CORE-01, BILL-01, …) live in the other `docs/` files. They record *what was shipped here*. This guide records *why and in what order you would rebuild*.

**Principle vs product.** Sentences marked **Principle** apply to any similar API. Sentences marked **FTAAR-specific** are domain details (piastres, lobby statuses, Hamilton split). Do not cargo-cult FTAAR-specific names into an unrelated product.

---

## Table of contents

1. [High-level overview](#1-high-level-overview)
2. [Architecture and how a request travels](#2-architecture-and-how-a-request-travels)
3. [Technology and pattern choices](#3-technology-and-pattern-choices)
4. [Feature dependencies (what to build first)](#4-feature-dependencies-what-to-build-first)
5. [Implementation phases](#5-implementation-phases)
6. [Configuration catalogue](#6-configuration-catalogue)
7. [Honest critique](#7-honest-critique)
8. [Build From Scratch roadmap](#8-build-from-scratch-roadmap)
9. [Concepts I Must Understand](#9-concepts-i-must-understand)
10. [Common Mistakes & Troubleshooting](#10-common-mistakes--troubleshooting)
11. [Code Review Checklist](#11-code-review-checklist)
12. [Project Comparison Checklist](#12-project-comparison-checklist)
13. [What I Should Be Able to Explain Without AI](#13-what-i-should-be-able-to-explain-without-ai)
14. [Progressive learning exercises](#14-progressive-learning-exercises)
15. [Keep This Beside Me While Building](#keep-this-beside-me-while-building)

---

## 1. High-level overview

### What the system does

A **lobby** is a shared order at one **restaurant**. Members add **order lines** (menu items × quantity). When the group has “arrived” (in this product that is database status `locked`), an **admin**:

1. Sees a **draft** grouped by menu item, with suggested prices (`referencePrice × qty`).
2. **Patches** actual prices and delivered flags (optionally applying one price to every line with the same menu item).
3. **Previews** totals and fee shares **without writing**.
4. **Finalises** once: persist a 1:1 `lobby_bill`, allocate fees, move the lobby to `billed`.
5. May **reopen** back to `locked` unless someone has already `paid`.

Any **member** can **GET** the finalised bill (full transparency: everyone sees everyone else’s totals).

**FTAAR-specific:** identity for this slice is header `x-user-id` (UUID). Real JWT auth is not implemented. Payment gateways are not implemented.

### Three layers you must keep distinct

| Layer | Role | In this repo |
| --- | --- | --- |
| **Platform** | Boot, config, HTTP envelope, logging, health, Docker, CI | `apps/backend/src/core`, `src/shared`, ops files |
| **Domain kernel** | Money, schema, transactions, fee math | `src/money`, `prisma/`, `src/billing/allocator.ts`, `bill-math.ts` |
| **Feature HTTP** | Controllers, access checks, DTOs | `src/billing/*`, `src/auth/*`, catalog modules |
| **Clients** | Mobile, shared DTOs | Expo starter + Todo types — **not the product** |

**Principle:** finish the platform and the *pure* domain before HTTP. HTTP should be a thin translation of already-tested math.

### Workspace shape

```
apps/backend     NestJS API (product lives here)
apps/mobile      Expo app (template welcome screen)
apps/api-e2e     Smoke tests against a running server
packages/types   Shared TS interfaces (`HealthResponse`)
```

Nx **tags** (`scope:backend`, `scope:mobile`, `scope:shared`) plus ESLint `@nx/enforce-module-boundaries` exist so a mobile app cannot import backend internals, and shared libs cannot import apps.

---

## 2. Architecture and how a request travels

```
HTTP
  helmet → CORS → json/urlencoded (Nest bodyParser: false)
  → request-id middleware (AsyncLocalStorage)
  → global prefix /api  (except /health*)
  → ThrottlerGuard
  → pipes + param decorators + ValidationPipe
  → controller → service → (optional) runInTransaction → Prisma
  → ResponseWrapInterceptor  { success, data } + Money → "36.87"
  or AllExceptionsFilter     { success: false, error, requestId }
```

### Traced flow: finalise a bill

This is the most important path in the product.

1. Client: `POST /api/lobbies/{lobbyId}/bill/finalise` with EGP fee strings, optional `receiptTotal`, optional `Idempotency-Key`, required `x-user-id`.
2. `setupApp` already applied helmet, CORS, body size cap, request id, ValidationPipe.
3. `ThrottlerGuard` counts this URL toward 100 requests / 60s (health is skipped; `/auth/*` is 10/min — unused by billing).
4. `ParseUuidPipe` on `:lobbyId`. `@CurrentUserId()` reads `x-user-id`, rejects missing header as `UNAUTHORIZED`, then UUID-validates it.
5. `PreviewBillDto` is class-validator’d; extra JSON keys → `VALIDATION_ERROR`.
6. `BillingService.finalise`: `LobbyAccessService.requireAdmin` loads membership; non-admin → `FORBIDDEN`.
7. **Idempotency outside the transaction:** if a bill already exists for the lobby, same key returns the existing bill; otherwise `CONFLICT`. If the key exists on another lobby, `CONFLICT`.
8. `runInTransaction`: reload context; lobby must be `locked`; every **delivered** line must have `actualPrice` or `PRICES_INCOMPLETE` (422).
9. Pure `buildInvariant` (member subtotals of delivered priced lines, `netFees = delivery + service − discount`, Hamilton `allocateFees`).
10. Insert `lobby_bill`, update lines, update member `payment_status` (zero delivered → `paid`), set lobby `billed`. `FinaliseFault.trip(...)` exists so tests can abort mid-transaction and assert **zero** bill rows.
11. Interceptor serialises `Money` / leftover `bigint` to EGP strings and wraps `{ success: true, data }`.

**Principle:** authorization (are you this lobby’s admin?) is **not** authentication (are you who you claim?). This slice only does authorization against `lobby_members` after trusting a header.

**Maps to:** `apps/backend/src/core/setup-app.ts`, `billing/current-user.ts`, `billing/lobby-access.service.ts`, `billing/billing.service.ts`, `billing/bill-math.ts`, `billing/allocator.ts`, `core/http/response-wrap.interceptor.ts`.

---

## 3. Technology and pattern choices

### Nx monorepo

**Why:** multiple deployables (API, future mobile, e2e) with one lockfile, cached `build`/`test`/`lint`, `affected` CI, and **prune** so Docker only installs API production deps.

**Alternatives:** a single Nest repo (simpler until a second app); Turborepo (similar caching, weaker Nest/Expo generators); polyrepo (painful shared types).

**This project:** started from `create-nx-workspace` Nest template, then added Expo and product code. Package names still say `@nestjs-template/*`.

**Principle:** introduce a monorepo when you have (or will soon have) more than one app *or* a shared library that must not import apps. Do not add Expo “just in case” unless you will ship it.

### NestJS

**Why:** modules + DI, global pipes/filters/interceptors/guards, Swagger decorators, a predictable request pipeline.

**Alternatives:** Fastify (faster, more DIY); Express only (you will reinvent the module graph); tRPC (couples clients; weaker for public REST + OpenAPI).

**This project:** Express adapter (`@nestjs/platform-express`) because Helmet, body limits, and swagger-ui are the Express ecosystem.

### Prisma + extra SQL (not TypeORM)

**Why:** typed client, migration files as source of truth, `migrate deploy` in CI and Docker entrypoint.

**Why extra SQL anyway:** Prisma schema cannot express all **CHECK** constraints, **partial unique indexes** (`WHERE`), and some **composite FKs**. Those live in `prisma/migrations/*/migration.sql`. Each folder also has a hand-written `down.sql` for a custom revert script.

**Alternatives:** TypeORM (column transformers map cleanly to `MoneyTransformer` — this repo still *looks* TypeORM in names); Drizzle (SQL-first, less Nest convention); `db push` (forbidden here — no history).

**Principle:** the database is an enforcement layer, not a dump of the ORM. If the ORM cannot say it, say it in SQL and **test the constraint with a failing insert**.

### Integer money (`bigint` piastres)

**Why:** IEEE floats cannot represent `0.10`. Split billing that must **sum exactly** to the fee pool cannot use `number`.

**This product:** 1 EGP = 100 piastres; HTTP speaks strings `"36.87"`; DB columns are `BIGINT`.

**Alternatives:** `decimal.js` / Postgres `NUMERIC` (fine if you never need remainder-of-integer allocation); store strings (painful arithmetic); major-unit integers only (too coarse).

**Principle:** pick the **minor unit of the currency**, store integers, parse/format at the HTTP boundary. Never do money math in `number`.

### Hamilton / largest-remainder allocator

**Why:** proportional split in integer units always leaves leftover minor units after floor division. Hamilton assigns leftover 1s to the largest remainders (tie-break: larger subtotal, then id).

**Alternatives:** give leftover to the admin; round-half-even in decimals (can break “shares sum to pool”); equal split always (unfair when subtotals differ). This project uses **equal split only when all subtotals are zero**.

**FTAAR-specific:** `netFees` may be **negative** (discount > fees). Floor division is defined toward −∞ so remainders stay well-behaved.

### Joi at bootstrap vs class-validator at HTTP

**Why two validators:** env vars are not HTTP DTOs. Joi fails the process with **names of missing vars**. class-validator + `whitelist` + `forbidNonWhitelisted` rejects extra JSON keys with `VALIDATION_ERROR`.

**Alternatives:** Zod for both (one skill graph; this repo chose Joi because `@nestjs/config` recipes often use it); `convict`; raw `process.env` (this project forbids that in services).

### Pino + request id ALS

**Why:** JSON logs in production, pretty in development, mixin `requestId` from `AsyncLocalStorage`, redaction of password/token fields.

**Alternatives:** Nest default logger (not structured); Winston; OpenTelemetry first (heavier).

### Envelope `{ success, data }` / `{ success: false, error }`

**Why:** clients branch on `success` and a **stable `error.code`**, not on inventing meaning from HTTP status alone. Status still maps from code (`satisfies Record<ErrorCode, number>` so a new code without a status is a compile error).

**Alternatives:** RFC 7807 Problem Details (more standard; different client code); unwrapped Nest exceptions (inconsistent).

**This project:** 204 is **not** wrapped (empty body). Already-wrapped bodies are not double-wrapped. Production hides unknown 500 messages.

### Throttling, Helmet, CORS, body limit

**Why:** cheap abuse resistance before you have WAF. Health skipped so probes do not 429. Auth routes (when they exist) get a tighter limit.

**This project:** CORS from `CORS_ORIGINS`; compose already lists Expo `8081` even though mobile does not call the API.

### Terminus: `/health` vs `/health/db`

**Principle:** **liveness** = process up (orchestrator should restart if this fails). **Readiness** = dependencies up (stop sending traffic if Postgres is down). Mixing them causes restart storms.

### Testing pyramid here

| Layer | What | Exhibit |
| --- | --- | --- |
| Unit | Money, pipes, filters, bill-math | `*.spec.ts` beside source; Money **100% branch** coverage gate |
| Property | allocator conservation | `allocator.property.spec.ts` (fast-check) |
| Constraint | real CHECK/unique via `pg` | `database.constraints.spec.ts` |
| HTTP foundation | envelope, validation, health | `http-foundation.spec.ts` with `SKIP_DB=true` |
| Integration | billing service vs Postgres | `billing.integration.spec.ts` |
| E2E smoke | live server hello + health | `apps/api-e2e` — **not** billing routes |

**Principle:** property tests belong on **pure** functions with numeric invariants. HTTP e2e belongs on the contract you will not refactor weekly. This repo is light on billing HTTP tests — a gap.

### tsdown (oxc) instead of webpack/`tsc` emit

**Why:** faster Nest build; still honors `experimentalDecorators` + `emitDecoratorMetadata` via `tsconfig.app.json` so `reflect-metadata` DI works. Output `main.cjs` for Node 22.

**If you drop decorator metadata, Nest routes and DI silently break.**

### Expo in the same workspace

**Why it is here:** template + future client + ESLint tags.

**Why you might skip it on a new clone:** until you have an API contract (OpenAPI or shared types that are *real*), a mobile app is a second product. This repo’s mobile app does not talk to the API.

---

## 4. Feature dependencies (what to build first)

```
Product invariants (paper)
        ↓
Nx + TS + module boundaries
        ↓
HTTP platform (boot, envelope, validation, logs, throttle, swagger)
        ↓
Postgres + migrate-only workflow
        ↓
Money value object
        ↓
Domain schema + SQL constraints + seed
        ↓
Nested transactions + UUID pipes
        ↓
Docker / health / CI / secrets
        ↓
Pure allocator + invariant math + property tests
        ↓
Billing HTTP (access, draft, patch, preview, finalise, reopen)
        ↓
Shared client types (optional)
        ↓
Real mobile + real auth (this repo did not)
```

**Do not** start with lobby REST if you cannot parse `"36.87"` into integers and wrap errors uniformly. **Do not** start with JWT if you have no users table and no “who is admin of this lobby” rule.

Billing **data** prerequisites (FTAAR-specific): restaurant + menu with `referencePrice`; lobby `locked`; members with order lines; `x-user-id` matching an admin `userId`. Seed provides this.

---

## 5. Implementation phases

Each phase: **what**, **why**, **problem it solves**, **concepts**, **steps**, **exhibits**, **exit criteria**.

### Phase 0 — Product invariants on paper

**(1) What.** Write the state machine and money rules before code.

**(2) Why.** Schema and HTTP status codes are encodings of these rules.

**(3) Problem.** Building CRUD first produces `status` strings nobody agrees on.

**(4) Concepts.** Aggregates (lobby owns bill 1:1); invariants; idempotency.

**(5) Steps.**

1. List statuses. Here: `open → locked → billed → settled | cancelled`. Billing only cares about `locked` (arrived) and `billed` (payment).
2. Define admin vs member.
3. Define money: minor units; HTTP strings; no floats.
4. Define finalise: one bill per lobby; delivered lines must be priced; reopen blocked if any member `paid`.
5. Name error codes you will need (`PRICES_INCOMPLETE`, `BILL_LOCKED`) vs generic HTTP.

**(6) Exhibits.** `docs/backend-billing.md`; `prisma/schema.prisma` enums; `lobby-access.service.ts` (`BILLING_ARRIVED_STATUS = locked`).

**(7) Exit.** You can explain why “arrived” is not a database enum value, and why preview must not write.

---

### Phase 1 — Workspace, TypeScript, module boundaries

**(1) What.** Nx workspace, apps/libs, tags, strict TS on the API.

**(2) Why.** Later Docker prune, generators, and “mobile must not import Prisma” depend on this.

**(3) Problem.** Accidental imports across apps; untyped `undefined` access.

**(4) Concepts.** Nx project graph; `namedInputs` for cache; ESLint module boundaries; `noUncheckedIndexedAccess`.

**(5) Steps.**

1. Create an Nx workspace (Nest app is enough; add Expo only if you will ship it).
2. Tag projects: `scope:backend` / `scope:shared` (and `scope:mobile` if present).
3. Enable `@nx/enforce-module-boundaries` with those tags.
4. Set **app** `tsconfig` to `strict` + `noUncheckedIndexedAccess` + decorator flags. Do not rely on a loose root `tsconfig.base.json` (this repo’s base is `strict: false` — **do better**).
5. Add a shared types lib only when you have types worth sharing.

**Simplified example (tags), maps to `eslint.config.mjs`:**

```js
{
  sourceTag: 'scope:backend',
  onlyDependOnLibsWithTags: ['scope:shared', 'scope:backend'],
}
```

**(6) Exhibits.** `nx.json`, `eslint.config.mjs`, `apps/backend/project.json` (`tags`), `apps/backend/tsconfig.app.json`, `package.json` name `@nestjs-template/source`.

**(7) Exit.** `nx graph` shows apps; a forbidden import fails lint; `tsc --noEmit` is strict on the API.

---

### Phase 2 — Nest bootstrap and `setupApp`

**(1) What.** `main.ts`, `AppModule`, one `setupApp()` for prefix, Swagger, security middleware.

**(2) Why.** Every later module assumes one HTTP surface (`/api`, `/docs`, `/health`).

**(3) Problem.** Copy-pasting Helmet/CORS into each controller; health sitting behind `/api` and breaking k8s probes.

**(4) Concepts.** `NestFactory.create`; `bodyParser: false` so **your** JSON limit is the only parser; global prefix `exclude`; `reflect-metadata` **first import**.

**(5) Steps.**

1. Import `reflect-metadata` before any decorated class.
2. `NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false })`.
3. Centralise Helmet, CORS, `json`/`urlencoded` limits, request-id, prefix, ValidationPipe, Swagger in `setupApp`.
4. Exclude liveness/readiness from `/api`.
5. Optional `--export-openapi` path that writes JSON and **exits** (CI). Skip DB in that mode.

**Simplified example:**

```ts
app.setGlobalPrefix('api', {
  exclude: [{ path: 'health', method: RequestMethod.ALL }],
});
```

**(6) Exhibits.** `src/main.ts`, `src/core/setup-app.ts`, `src/core/http/swagger.ts`.

**(7) Exit.** Process listens; `GET /api` works; `/docs` loads; `/health` is not under `/api`.

---

### Phase 3 — Lint, format, pre-commit

**(1) What.** ESLint (incl. boundaries), Prettier, Husky, lint-staged `--max-warnings=0`.

**(2) Why.** Architecture rules that only exist in a wiki will rot.

**(3) Problem.** PRs that mix formatting with logic; warning-only lint that nobody fixes.

**(4) Concepts.** Flat ESLint; lint-staged vs CI `format:check`.

**(5) Steps.** Enable Prettier (`singleQuote` here is a **convention**, not a principle). Husky `pre-commit` → `lint-staged`. CI also runs `nx format:check`.

**(6) Exhibits.** `eslint.config.mjs`, `.prettierrc`, `.husky/pre-commit`, `package.json` `lint-staged` / `prepare`.

**(7) Exit.** A staged file with an extra unused import cannot be committed.

---

### Phase 4 — Validated configuration

**(1) What.** Joi schema, `AppConfigModule`, typed `AppConfigService`. Hydrate secrets from files **before** validate.

**(2) Why.** Missing `DATABASE_URL` should crash at boot with the **variable name**, not at first query.

**(3) Problem.** `process.env.PORT!` scattered; Docker secrets vs local `.env`.

**(4) Concepts.** Fail-fast config; 12-factor; `*_FILE` / `/run/secrets`.

**(5) Steps.**

1. Schema: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`, CORS, body limit. Add `JWT_SECRET` **only when you verify JWTs** (this repo requires it early — see critique).
2. `allowUnknown: true` so Nx injects extra env.
3. Inject `AppConfigService`; never read `process.env` in domain code.
4. `hydrateSecretsFromStore()` for production mounts.

**(6) Exhibits.** `core/config/env.schema.ts`, `app-config.service.ts`, `hydrate-secrets.ts`, `apps/backend/.env.example`, `project.json` `serve.env`.

**(7) Exit.** Unset `PORT` → process exits non-zero listing `PORT`. Controllers do not touch `process.env`.

---

### Phase 5 — Errors and response envelope

**(1) What.** `ErrorCode` union, `ERROR_HTTP_STATUS` with `satisfies`, `AppError`, global filter, wrap interceptor.

**(2) Why.** Mobile and future clients need one JSON shape.

**(3) Problem.** Nest `NotFoundException` vs `throw new Error` vs Prisma errors all looking different.

**(4) Concepts.** Domain errors vs HTTP; leak-safe production 500s.

**(5) Steps.**

1. List codes. Generic REST codes first; add **domain** codes when the client must branch (`PRICES_INCOMPLETE`).
2. `AppError(code, message, details?)` with `get status()`.
3. Filter maps `AppError`, `ThrottlerException`, `HttpException`, unknown.
4. Interceptor wraps successes; skip 204; skip already-wrapped; serialise money later (phase 9) in the same interceptor.

**Simplified example (maps to `app-error.ts` + filter):**

```ts
throw new AppError('NOT_FOUND', `Lobby ${id} not found`);
// → { success: false, error: { code: 'NOT_FOUND', message: '...' }, requestId }
```

**(6) Exhibits.** `core/errors/error-codes.ts`, `app-error.ts`, `all-exceptions.filter.ts`, `response-wrap.interceptor.ts`. Foundation docs still say “17 codes”; billing added two more — **keep the union and the docs in sync**.

**(7) Exit.** You can throw `AppError` from a service and the HTTP body never contains a raw stack in production.

---

### Phase 6 — HTTP validation (DTOs)

**(1) What.** Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) and class-validator DTO classes.

**(2) Why.** Reject garbage before services or SQL.

**(3) Problem.** Open JSON objects that set `role: 'admin'` on a patch they should not.

**(4) Concepts.** DTO ≠ domain entity; implicit conversion pitfalls (`enableImplicitConversion` is on here — know that `"123"` can become a number).

**(5) Steps.** `exceptionFactory` → `AppError('VALIDATION_ERROR', ...)`. One DTO per write body. Swagger decorators on the same classes.

**(6) Exhibits.** `setup-app.ts` ValidationPipe; `app/dto/*`; `billing/dto/billing.dto.ts`.

**(7) Exit.** `{ "title": "x", "extra": 1 }` on a known POST returns 400 `VALIDATION_ERROR`.

---

### Phase 7 — Logging, request id, throttling

**(1) What.** `nestjs-pino`, request-id middleware + ALS mixin, `ThrottlerModule` + `ThrottlerGuard`, skip health, tighter `/auth/*`.

**(2) Why.** Correlate a client screenshot with one log line; blunt brute force.

**(3) Problem.** Logs without ids; health checks exhausting the rate limit.

**(4) Concepts.** ALS vs passing `req` everywhere; `x-request-id` inbound/outbound.

**(5) Steps.** Generate UUID if header missing. Redact `authorization`, `password`, `token`. Pretty transport only in development.

**(6) Exhibits.** `core/http/logger.module.ts`, `request-id.middleware.ts`, `request-context.ts`, `app.module.ts` throttler `skipIf`.

**(7) Exit.** Two parallel requests have different `requestId`s on logs and error bodies. `GET /health` is not throttled.

---

### Phase 8 — Postgres and migrate-only Prisma

**(1) What.** Compose Postgres, Prisma schema location, `migrate deploy` / `migrate dev --create-only`, **no `db push`**.

**(2) Why.** Production and CI must apply the same files as local.

**(3) Problem.** “It works on my machine” schema drift; irreversible production `push`.

**(4) Concepts.** Expand/contract migrations; `prisma generate` as a **build dependency**.

**(5) Steps.**

1. Postgres 16 in Compose; `DATABASE_URL`.
2. `schema.prisma` under the app (this repo: `apps/backend/prisma`).
3. Nx targets: `prisma-generate`, `migration-run`, `migration-generate`, optional revert.
4. `build` **dependsOn** `prisma-generate`.
5. Tests that need the DB migrate first; unit tests set `SKIP_DB=true`.

**(6) Exhibits.** `docker-compose.yml` postgres service; `apps/backend/prisma/`; `project.json` prisma targets; `package.json` `"prisma": { "schema": "..." }`.

**(7) Exit.** Fresh volume: `migrate deploy` then app boots. You never use `db push` in docs or CI.

---

### Phase 9 — Money

**(1) What.** Immutable `Money` (private `bigint`), parse/format EGP strings, transformer to `BIGINT`, JSON walk in the interceptor.

**(2) Why.** Allocator and bills are undefined with floats.

**(3) Problem.** `36.87 * 100` in IEEE; `JSON.stringify(1n)` throws.

**(4) Concepts.** Value objects; parse at the edge; `toJSON`.

**(5) Steps.** Constructor private. `fromEgpString` rejects more than 2 decimals. Arithmetic returns **new** instances. `MoneyTransformer.to/from` null-safe (Prisma has no column transformers — call this at the repository boundary). Coverage gate on the parser.

**Simplified example (maps to `money.ts`):**

```ts
Money.fromEgpString('36.87').add(Money.fromEgpString('1.13')).toEgpString();
// "38.00"
```

**(6) Exhibits.** `src/money/money.ts`, `money.transformer.ts`, `serialize-money.ts`, `jest.config.cts` coverage threshold, `PrismaService.moneyToDb`.

**(7) Exit.** `"1.234"` throws `VALIDATION_ERROR`. A handler returning `Money` yields `"36.87"` in JSON, not a bigint error.

---

### Phase 10 — Domain schema, constraints, seed

**(1) What.** Users, restaurants, menu, lobbies, members, order items, `lobby_bill` 1:1. Enums. Extra SQL. Idempotent seed. Constraint tests.

**(2) Why.** Billing HTTP is just mutations of this graph.

**(3) Problem.** Cross-restaurant order lines; two admins; guest without `device_id`.

**(4) Concepts.** Composite unique `(id, restaurant_id)` so FKs can pin restaurant; CHECK `ck_user_kind`; partial unique on `lower(email)`.

**(5) Steps.** Model in Prisma what it can. Add SQL for the rest **in the same migration**. Write a test that **expects the insert to fail**. Seed Arabic (or your) demo data idempotently; one lobby per status.

**(6) Exhibits.** `schema.prisma`; `prisma/migrations/**`; `database.constraints.spec.ts`; `database/seed.ts`, `arabic-menu.ts`.

**(7) Exit.** Illegal insert fails at the database, not only in Nest. Seed can run twice.

---

### Phase 11 — Transactions and shared HTTP helpers

**(1) What.** `runInTransaction` with ALS so nested calls join. `ParseUuidPipe`, `MoneyPipe`, `@Public()`.

**(2) Why.** Finalise must not leave a bill row if a later update throws.

**(3) Problem.** Nested `$transaction` deadlocks or second BEGIN; UUID typos as 500s.

**(4) Concepts.** Interactive Prisma transactions; ALS; custom param decorators.

**Simplified example (maps to `run-in-transaction.ts`):**

```ts
await runInTransaction(prisma, async (em) => {
  await em.lobbyBill.create({ data: { ... } });
  await runInTransaction(prisma, async (inner) => {
    // inner === em; still one BEGIN
    await inner.lobby.update({ ... });
  });
});
```

**(5) Steps.** Store `Prisma.TransactionClient` in ALS. Test that `$transaction` is invoked once when nested. Pipes throw `AppError('VALIDATION_ERROR')`. `@Public()` only sets metadata — **wire a guard later** or you have theatre.

**(6) Exhibits.** `shared/run-in-transaction.ts` (+ spec), `parse-uuid.pipe.ts`, `money.pipe.ts` (**unused** on billing controllers — they parse in the service), `public.decorator.ts`.

**(7) Exit.** Nested helper test passes. Invalid `:lobbyId` is 400, not a Prisma error.

---

### Phase 12 — Ops: Docker, health, CI, secrets, audit

**(1) What.** Multi-stage Dockerfile with `nx run backend:prune`, entrypoint `migrate deploy` then optional seed, Compose full stack, Terminus probes, GitHub Actions, `hydrate-secrets`, `npm audit` on **pruned** graph.

**(2) Why.** “Works on my laptop” is not a release.

**(3) Problem.** Image contains Expo; CI has no Postgres; probes hit `/api/health` and 404.

**(4) Concepts.** Nx prune; liveness vs readiness; supply-chain audit scope.

**(5) Steps.**

1. Builder: `npm ci`, prune, `prisma generate`. Runner: Node 22 Alpine, OpenSSL, `main.cjs`.
2. Entrypoint: migrate → `RUN_SEED=true` seed → `node main.cjs`.
3. CI: Postgres service → migrate → `format:check` → `lint,typecheck,test,e2e,openapi` for **backend + api-e2e** (this repo skips mobile to stay fast).
4. Staging workflow: **build/push image**; it is not a full deploy.
5. Helmet + CORS + body limit already in `setupApp`.

**(6) Exhibits.** `apps/backend/Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, `docker-compose.yml`, `.github/workflows/ci.yml`, `staging.yml`, `health.controller.ts`, `health.indicator.ts`.

**(7) Exit.** `docker compose up --build` serves `/health` and `/health/db`. CI fails if format or tests fail. Audit does not fail because of a mobile advisory.

---

### Phase 13 — Pure billing math (before HTTP)

**(1) What.** `allocateFees(parties, netFees)` and `buildInvariant(...)`. Unit + property tests. No Nest imports in the allocator.

**(2) Why.** You cannot debug remainder bugs through HTTP.

**(3) Problem.** Off-by-one piastre; negative fees; all-zero subtotals.

**(4) Concepts.** Hamilton method; conservation (`sum(shares) === pool`); property-based testing.

**(5) Steps.** Floor-divide `pool * weight / divisor`. Rank leftover by remainder, then subtotal, then id. Equal weights if all subtotals are 0. Exclude undelivered lines from subtotals (fee **base shrinks** — FTAAR BILL-16). Reconciliation: optional receipt; `warns` if mismatch; **never blocks**. Alias `tax = serviceFee` exists here — **do not copy that name** unless tax is actually service.

**(6) Exhibits.** `billing/allocator.ts`, `allocator.spec.ts`, `allocator.property.spec.ts`, `bill-math.ts`.

**(7) Exit.** You can state the conservation invariant and a 10k-case property test fails if you change floor to truncate-toward-zero incorrectly.

---

### Phase 14 — Billing HTTP

**(1) What.** Module, controller, access service, DTOs, draft/patch/preview/finalise/reopen/get.

**(2) Why.** This is the product. Everything above exists so this stays thin.

**(3) Problem.** Partial writes; double finalise; spoofed users (header auth).

**(4) Concepts.** Idempotency keys; access checks in a dedicated service; test fault injection.

**(5) Steps.** (order inside the feature)

1. `LobbyAccessService.requireMember` / `requireAdmin`.
2. `GET draft` — group by `menuItemId`; suggested = reference × qty.
3. `PATCH lines` — one transaction; lines must belong to lobby; `applyToAllMatching`.
4. `POST preview` — `buildInvariant`, no writes.
5. `POST finalise` — idempotency, invariant, persist, status `billed`.
6. `POST reopen` — `BILL_LOCKED` if any `paid`.
7. `GET /` — any member, full totals.

**(6) Exhibits.** `billing.module.ts`, `billing.controller.ts`, `billing.service.ts`, `lobby-access.service.ts`, `lobby-bill.entity.ts`, `finalise-fault.ts`, `billing.integration.spec.ts`.

**(7) Exit.** You can narrate the finalise trace (section 2) without opening files. Integration test: injected fault → no bill row.

---

### Phase 15 — Shared API types

**(1) What.** Put **stable** client contracts in `packages/types` (or generate from OpenAPI).

**(2) Why.** Mobile and web should not copy DTO classes.

**(3) Problem.** This repo shares **Todo** types while billing DTOs live only on the backend.

**(4) Concepts.** Generated vs hand-written DTOs; OpenAPI as source of truth (`nx run backend:openapi`).

**(5) Steps.** Export OpenAPI; generate TS **or** hand-write bill types after the HTTP shape freezes. Delete Todo types when you delete todos.

**(6) Exhibits.** `packages/types/src/lib/types.ts` (negative example); `tsdown.config.mts` alias `@nestjs-template/types`.

**(7) Exit.** A second client can compile against bill types without importing Nest.

---

### Phase 16 — Mobile (optional; this repo did not)

**(1) What.** Replace Expo welcome UI. Navigation, API client, auth storage, server state.

**(2) Why.** Users do not curl `x-user-id`.

**(3) Problem.** Building screens before OpenAPI exists.

**(4) Concepts.** Expo Router or React Navigation; TanStack Query vs Redux; EAS builds; Metro in a monorepo (`withNxMetro`); EAS `post-install` symlink of workspace `node_modules`.

**(5) Steps.** Point `CORS_ORIGINS` at Expo. Client for `/api`. Do not invent a second money parser — use the same string rules. Add mobile to CI when it has tests worth running.

**(6) Exhibits.** `apps/mobile/src/app/App.tsx` (template), `app.json`, `eas.json`, `metro.config.js`, `tools/scripts/eas-build-post-install.mjs`. Compose CORS includes `8081`.

**(7) Exit.** One screen loads a seeded lobby bill. Until then, skip this phase.

---

### Phase 17 — Real authentication

**(1) What.** Global `AuthGuard`, JWT or session, `@Public()` for login/health, stop trusting `x-user-id`.

**(2) Why.** Header identity is a test stub.

**(3) Problem.** `JWT_SECRET` in env with no verifier; Swagger Bearer button that does nothing.

**(4) Concepts.** Guard + Reflector `IS_PUBLIC_KEY`; refresh vs access; guest `device_id` vs registered email (`ck_user_kind`).

**(5) Steps.** Verify user exists. Map token `sub` to `userId`. Keep `LobbyAccessService` for **authorization**. Stricter throttle on login. Remove header decorator from billing.

**(6) Exhibits.** `auth.controller.ts` (`NOT_IMPLEMENTED`); `public.decorator.ts`; `login.dto.ts`; Joi `JWT_SECRET`; Swagger `addBearerAuth()`.

**(7) Exit.** Spoofing a UUID header cannot act as another member.

---

## 6. Configuration catalogue

What it does, and what breaks if you change it.

| File | Role | If removed or wrongly changed |
| --- | --- | --- |
| `package.json` | Scripts, deps, `lint-staged`, Prisma schema path, `deepmerge-ts` override | Install/CI/hooks break; Prisma CLI looks in the wrong place; audit may fail GHSA on Prisma CLI |
| `package-lock.json` | Reproducible installs | CI drift |
| `.npmrc` (`legacy-peer-deps`) | Expo/RN peer conflicts | `npm ci` may fail |
| `nx.json` | Plugins, cache `namedInputs`, tsdown defaults | Inferred lint/test/expo targets disappear |
| `tsconfig.base.json` | Path alias `@nestjs-template/types` | Backend import of types fails; **strict is off here** — app tsconfig must compensate |
| `apps/backend/tsconfig.app.json` | Strict + decorators | Nest DI/routes break without decorator metadata; unsound indexing without `noUncheckedIndexedAccess` |
| `apps/backend/tsdown.config.mts` | Bundle `main` + `seed` to `dist/apps/backend/*.cjs`, types alias | No `main.cjs`; OpenAPI export and Docker CMD fail |
| `apps/backend/project.json` | serve env, prisma, openapi, prune, typecheck | Local serve missing `JWT_SECRET`/`DATABASE_URL`; build without generate |
| `eslint.config.mjs` | Module boundaries | Cross-app imports slip through |
| `apps/backend/eslint.config.mjs` | Ignore `prisma/**` | SQL files linted as JS |
| `.prettierrc` / `.prettierignore` | Format | CI `format:check` fights you |
| `.husky/pre-commit` | lint-staged | Dirty commits |
| `jest.preset.js` + `apps/backend/jest.config.cts` | Node tests, Money coverage | Tests or coverage gate fail |
| `apps/backend/prisma/schema.prisma` | Models | Client and migrations diverge |
| `prisma/migrations/*/migration.sql` + `down.sql` | Up/down | Deploy/revert wrong; **hand `down.sql` can be stale** |
| `docker-compose.yml` | Postgres + optional API | `db:up` gone; full-stack demo gone |
| `apps/backend/Dockerfile` + `docker-entrypoint.sh` | Production image | Staging/GHCR useless; schema never applied in container |
| `.dockerignore` | Slim context | Slow/huge builds |
| `.github/workflows/ci.yml` | Quality gate (backend only) | Merges without tests; **mobile untested** |
| `.github/workflows/staging.yml` | Push `ghcr.io/.../backend:master` | No image; **not a deploy**; branch is `master` (docs sometimes say `main`) |
| `apps/backend/.env` | Local secrets | Ignored if `serve` injects env (this repo’s serve **does** inject) |
| `babel.config.json` (root) / mobile `.babelrc.js` | Expo/Jest | Mobile tests fail; backend does not use Babel |
| `apps/mobile/metro.config.js` | Monorepo Metro + SVG | Expo bundle fails |
| `apps/mobile/eas.json` | EAS profiles | Cloud builds unconfigured |
| `tools/scripts/eas-build-post-install.mjs` | Symlink workspace node_modules | EAS install breaks |

**Safe to ignore for runtime:** `.agents/`, `.github/skills/`, `tools/ai-migrations/`, `.vscode/`.

**Nx `serve` env vs `.env`:** `project.json` injects `DATABASE_URL`, `JWT_SECRET`, etc. Changing `.env` alone may **not** change `nx run backend:serve`. Production `serve` configuration still uses a **dev JWT string** — do not treat that as a production secret strategy.

---

## 7. Honest critique

Copy the **patterns**. Do not copy these accidents.

| Issue | Why it is a problem | Better default |
| --- | --- | --- |
| README + todos + Todo types + Expo welcome | Looks like the product is a todo API | Delete or quarantine demos; README describes lobbies |
| `@nestjs-template/*` naming | Cognitive tax | Rename when you fork |
| `x-user-id` + required unused `JWT_SECRET` | Spoofable identity; false sense of auth | Stub secret optional until guard exists |
| `@Public()` and Swagger Bearer unused | Dead API | Implement guard or remove |
| `MoneyTransformer` TypeORM shape on Prisma | Misleading comments (`EntityManager`) | Name it `moneyToDb` only |
| `tax` = service fee | Clients will display “tax” wrong | Rename or compute tax |
| `MoneyPipe` unused | Two ways to parse money | Use the pipe in DTOs or delete it |
| `FinaliseFault` in production providers | Test hook in prod graph | Test module / env-gated provider |
| `BillingModule` implicit global Prisma | Optional inject `undefined` | Import `DatabaseModule` explicitly |
| No billing HTTP e2e | Contract can drift | Supertest the controller |
| Manual `down.sql` | Easy to forget | Prefer Prisma migrate discipline + expand/contract |
| `tsconfig.base.json` not strict | Libs can be sloppy | Strict at the root |
| `api-e2e` has no tags | Boundaries don’t apply | Tag `type:e2e` |
| CI skips mobile | Dead app bitrots | Lint mobile or remove the app |
| Staging = image push | “Deployed” is a lie | CD to a real environment |
| `deepmerge-ts` override | Audit workaround | Track upstream Prisma fix |
| Foundation doc “17 codes” | Docs lie | Generate the table from `ERROR_CODES` |

**Strengths to copy:** integer money; constraint tests; nested transactions; property tests on allocation; uniform envelope; migrate in Docker entrypoint; prune + audit; skip DB for OpenAPI export.

---

## 8. Build From Scratch roadmap

Perform these when creating a **new** similar project. No access to this repo required.

1. Write invariants: statuses, roles, money unit, idempotency, what “finalise” means.
2. `create-nx-workspace` (or equivalent) with a Nest API. Tag `scope:backend` / `scope:shared`. Strict TS + decorators.
3. ESLint boundaries, Prettier, husky, lint-staged, CI format check.
4. `main.ts` + `setupApp`: helmet, CORS, body limit, prefix, swagger, ValidationPipe. Health **outside** prefix.
5. Joi (or Zod) env module; typed config service; no `process.env` in services.
6. `ErrorCode` + `AppError` + filter + wrap interceptor.
7. Pino + request id ALS; throttler; skip health.
8. Compose Postgres. Prisma migrate **only**. `generate` on build.
9. `Money` (or your currency) + DB bigint + JSON serialisation + unit tests.
10. Schema + extra SQL + seed + failing-insert constraint tests.
11. `runInTransaction` nested join + UUID pipe.
12. Dockerfile prune, entrypoint migrate, Terminus `/health` and `/health/db`, CI with Postgres, secrets files for prod.
13. Pure split/total math + property tests.
14. Feature module: access service, DTOs, draft → patch → preview → finalise → reopen.
15. Export OpenAPI; share types with clients.
16. Client app only after 15.
17. Real auth last among “user-facing” work, replacing header stubs.

Commands you will actually type (names may differ):

```sh
npm ci
docker compose up -d postgres
npx prisma migrate deploy
npx nx run backend:serve
npx nx run backend:test
npx nx run backend:openapi
npx nx run-many -t lint,typecheck,test --projects=backend
```

---

## 9. Concepts I Must Understand

**Platform**

- Nest modules, DI tokens, `APP_GUARD` / `APP_FILTER` / `APP_INTERCEPTOR`
- Request pipeline order (middleware vs guards vs interceptors vs pipes vs filters)
- `reflect-metadata` and why tsdown must keep `emitDecoratorMetadata`
- AsyncLocalStorage (request id **and** transaction client)
- Liveness vs readiness
- OpenAPI as a CI artifact (`--export-openapi` without a database)

**Money and allocation**

- Why `number` is illegal for currency
- `bigint` division and remainder; floor toward −∞ vs truncate toward zero
- Hamilton / largest-remainder; conservation invariant
- Parse/format at the boundary; value object immutability

**Data**

- Prisma migrate vs `db push`
- Constraints the ORM cannot express
- Interactive transactions vs sequential queries
- Idempotency keys (replay vs conflict)
- Expand/contract schema changes

**Architecture**

- Authentication vs authorization
- DTO vs entity vs invariant block
- Nx project tags and enforce-module-boundaries
- Pruning a monorepo for Docker
- Property-based testing vs example tests

**Clients (when you get there)**

- Expo Metro in a monorepo
- CORS as a **server** policy
- Why shared types should come from OpenAPI or a lib, not copy-paste

---

## 10. Common Mistakes & Troubleshooting

| Mistake | Symptom | Cause | Diagnose / fix |
| --- | --- | --- | --- |
| Float money | Totals off by 0.01; `0.1 + 0.2` | `number` | Store minor units; add a conservation test |
| `JSON.stringify` bigint | 500 on success path | Forgot interceptor walk | Serialise in one place (interceptor) |
| Missing env | Process exits listing var names | Joi `required` | Match `serve` env / `.env.example` / Compose |
| Changed `.env` but serve ignores it | Old DB URL | Nx `project.json` env wins | Change the target env or stop injecting |
| Nest “can’t resolve dependencies” | Boot fail | Missing `reflect-metadata` or metadata emit | Import metadata first; check tsdown tsconfig |
| OpenAPI export hangs / fails DB | Export needs Postgres | Did not skip DB | `shouldSkipDatabase()` on `--export-openapi` |
| Tests need Docker unexpectedly | Connection refused | Forgot `SKIP_DB` | Set in `test-setup.ts`; only integration files connect |
| Constraint tests skip | “passes” without asserting | Early return when DB down | Run migrate; fail CI if skip in CI |
| Nested `$transaction` | Timeouts / unexpected isolation | Second BEGIN | ALS join pattern |
| Extra JSON field 200 | Mass assignment | Pipe not global or `forbidNonWhitelisted` off | Integration test with `extra` |
| Health 429 | Orchestrator flap | Health under throttler | `skipIf` / `@SkipThrottle` / exclude prefix |
| Health 404 | Probe `/api/health` | Prefix applied | Exclude health |
| Finalise 422 `PRICES_INCOMPLETE` | Cannot bill | Delivered line `actual_price` null | Patch lines first |
| Finalise 409 | Retry created duplicate intent | No or different idempotency key | Send the same key |
| Reopen 409 `BILL_LOCKED` | Cannot unlock | A member is `paid` | Product rule; do not “force” in API |
| Spoofed admin | Wrong user billed | Trusted `x-user-id` | Phase 17 |
| Prisma CHECK not in schema | Invalid rows from SQL console | Constraint only in migration | Keep SQL + constraint tests |
| Docker image huge / Expo in API image | Slow deploy | Built whole workspace without prune | `backend:prune` then `npm ci --omit=dev` |
| Audit fails on mobile advisory | CI red | Audited root graph | Audit `dist/apps/backend` after prune |
| `db push` locally | CI missing columns | Never wrote migration | Always `migrate dev --create-only` then review SQL |
| Wrong floor on negative fees | Shares do not sum to pool | Truncate toward zero | Property test; `floorDiv` |
| Module boundary lint ignore | Mobile imports Prisma | Rule disabled | Keep `@nx/enforce-module-boundaries` as error |

---

## 11. Code Review Checklist

Use this on **your** implementation of a similar system.

**Platform**

- [ ] One `setupApp` (or equivalent) owns prefix, security headers, body limit, ValidationPipe, Swagger
- [ ] Success and error envelopes are consistent; 204 unwrapped
- [ ] Error codes map to HTTP in a type-checked table
- [ ] Production 500s do not leak internals
- [ ] Config is validated at boot; services use a typed config API
- [ ] Request id on logs and error bodies; secrets redacted
- [ ] Health is unauthenticated, unthrottled, and not behind the API prefix; readiness checks the DB
- [ ] Rate limit exists; auth endpoints tighter when they exist

**Data and money**

- [ ] No `number` in money arithmetic
- [ ] Migrate-only; no schema auto-sync in prod
- [ ] Invariants enforced in SQL **or** proven in tests why not
- [ ] Multi-row writes that must be atomic use one transaction; nested helpers join
- [ ] Seed is idempotent

**Domain HTTP**

- [ ] Access checks are explicit (member vs admin)
- [ ] Preview does not write
- [ ] Finalise is idempotent and invariant-checked
- [ ] Failure mid-finalise leaves no partial bill (test it)
- [ ] DTOs forbid unknown fields

**Quality**

- [ ] Pure math is unit- and property-tested
- [ ] CI runs migrate then lint/typecheck/test
- [ ] OpenAPI exported in CI
- [ ] Docker entrypoint migrates
- [ ] Production image is pruned
- [ ] Module boundaries enforced
- [ ] Demos (todos) are not required for production paths

**Auth (when claimed “done”)**

- [ ] Guard is global; `@Public` is actually read
- [ ] Identity cannot be spoofed with a header
- [ ] Authorization still checks resource membership

---

## 12. Project Comparison Checklist

Compare a **future** project to this one **without copying names**.

| Question | This project | Your project |
| --- | --- | --- |
| What is the aggregate root? | Lobby + 1:1 bill | |
| Minor currency unit? | Piastre / EGP string | |
| How are leftover integer units assigned? | Hamilton | |
| How does a client see errors? | `{ success, error.code }` | |
| How is config loaded? | Joi + hydrate files | |
| How is schema changed? | Prisma migrate + extra SQL | |
| How are nested writes atomic? | ALS `runInTransaction` | |
| What is the identity stub vs real auth? | `x-user-id` vs unimplemented JWT | |
| What is liveness vs readiness? | `/health` vs `/health/db` | |
| What is in CI vs skipped? | backend + e2e; not mobile | |
| What is template leftover? | todos, Expo welcome, Todo types | |
| Shared types: generated or hand-written? | Hand-written, **stale** | |
| Monorepo tags? | backend / mobile / shared | |
| How is the API image built? | Nx prune + Node 22 Alpine | |

If your answers are “same as FTAAR” for **domain** questions, you may be copying, not designing.

---

## 13. What I Should Be Able to Explain Without AI

Answer out loud. If you cannot, re-read the matching phase.

1. Why does this API refuse floats for money?
2. Why is `db push` banned in CI and production?
3. What happens, step by step, on `POST .../bill/finalise`?
4. Why is idempotency checked **before** the transaction, and what races remain?
5. Why might `netFees` be negative, and what must `floorDiv` do?
6. Why do undelivered items change **other** members’ fee shares?
7. Why is preview a POST that writes nothing?
8. Why is `/health` not under `/api`, and why is `/health/db` separate?
9. Why `bodyParser: false` in `NestFactory.create`?
10. Why does tsdown need `emitDecoratorMetadata`?
11. What does `@nx/enforce-module-boundaries` prevent?
12. What is Nx `prune` for?
13. Why skip the database when exporting OpenAPI?
14. What is the difference between `AppError` and a raw `HttpException`?
15. Why `satisfies Record<ErrorCode, number>`?
16. How does nested `runInTransaction` avoid a second `BEGIN`?
17. Why can CHECK constraints live in SQL but not in `schema.prisma`?
18. Why is `x-user-id` insufficient for production?
19. What would break if you removed the response wrap interceptor?
20. What would break if you throttled `/health`?
21. Why audit `dist/apps/backend` instead of the repo root?
22. Why are property tests a good fit for `allocateFees` and a bad fit for Swagger UI?
23. Why should shared types not include Nest DTO classes?
24. When would you **not** use a monorepo?
25. What is wrong with naming a field `tax` when it stores service fee?

---

## 14. Progressive learning exercises

Do these in a **new empty folder**. Do not look at this repository unless you are stuck for more than an hour. Solutions are intentionally omitted.

**Exercise 1 — Envelope**  
Nest (or equivalent) app: `GET /api/hello` → `{ success: true, data: { message } }`. Throw a domain error → `{ success: false, error: { code, message } }` with mapped HTTP status. Extra JSON key on POST → 400.

**Exercise 2 — Money**  
Parse `"36.87"`, reject `"1.234"`, add/sub/mulInt, `toJSON`. Store in a variable as bigint. 100% branch tests on the parser.

**Exercise 3 — Schema**  
Postgres: `users` with CHECK that registered users have email. Prove with a failing insert test. Migrate only.

**Exercise 4 — Allocator**  
Function `allocate(weights: bigint[], pool: bigint): bigint[]` such that sum equals `pool`. Property test: random weights and pool (including zeros and negatives). Tie-break documented.

**Exercise 5 — Draft + preview**  
In-memory (no HTTP polish required): lines with delivered/price; `preview(fees)` returns member totals. Undelivered line must not count. Receipt mismatch warns.

**Exercise 6 — Atomic finalise**  
Postgres transaction: insert bill, update parent status. Inject a throw after insert; assert no bill row. Same key twice returns the same logical bill.

**Exercise 7 — Auth upgrade**  
Replace a trusted user header with a signed token. Public login route. Resource still checks membership. Prove a forged header is ignored.

**Stretch:** Export OpenAPI without connecting to Postgres. Put the API in Docker that migrates on start.

---

## Keep This Beside Me While Building

### Architecture

Platform (envelope, config, logs, health) → Money + schema + transactions → **pure domain math** → HTTP feature → clients → real auth.

Request: Helmet/CORS/body → request id → prefix → throttle → validate → service → tx/DB → wrap or filter.

### Implementation order

0 invariants → 1 Nx/tags/strict → 2 setupApp → 3 lint/hooks → 4 config → 5 errors/envelope → 6 DTOs → 7 pino/throttle → 8 Prisma migrate → 9 Money → 10 schema/SQL/seed → 11 tx/pipes → 12 Docker/CI → 13 allocator tests → 14 billing HTTP → 15 shared types → 16 client → 17 JWT/guard

### Commands / concepts

- `migrate deploy` in CI and container; never `db push`
- Integer minor units; Hamilton leftover
- `ErrorCode` → HTTP via `satisfies`
- Nested tx via ALS
- `/health` live, `/health/db` ready
- Prune before audit and Docker
- Idempotency + one bill per aggregate
- Preview does not write

### Review checkpoints

- [ ] Envelope + validation extra-field test
- [ ] Money parser tests; no `number` in money paths
- [ ] Constraint failing-insert test
- [ ] Allocator conservation property test
- [ ] Finalise fault → zero rows
- [ ] Health not throttled, not under `/api`
- [ ] OpenAPI export skips DB
- [ ] Image runs migrate then process
- [ ] No spoofable identity if you claim auth is done
- [ ] Demos (todos/welcome screens) not required to bill
