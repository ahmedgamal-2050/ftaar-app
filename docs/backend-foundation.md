# Backend foundation (FOUNDATION-BE)

Status: **done** in `apps/backend`, mapped from `backend_modules_foundation.csv`.

The API lives under the global prefix `/api`. Swagger UI is at `/docs` (not under `/api`).

## How to run

```sh
npm run start:dev
```

Equivalent: `npx nx run backend:serve`.

Nx injects `NODE_ENV`, `PORT`, and `LOG_LEVEL` for serve. If you run the built binary yourself, copy `apps/backend/.env.example` to `apps/backend/.env`.

| Variable       | Required | Notes                                   |
| -------------- | -------- | --------------------------------------- |
| `NODE_ENV`     | yes      | `development` \| `production` \| `test` |
| `PORT`         | yes      | HTTP port                               |
| `LOG_LEVEL`    | no       | Defaults to `info` (`silent` in Jest)   |
| `DATABASE_URL` | yes      | Postgres URL (`postgres://…`)           |

Missing required variables print their names and exit with a non-zero code.

## Task checklist

| ID      | Task                              | Done when                                                |
| ------- | --------------------------------- | -------------------------------------------------------- |
| CORE-01 | Scaffold NestJS app               | `start:dev` boots; `strict` + `noUncheckedIndexedAccess` |
| CORE-02 | ESLint, Prettier, pre-commit hook | Lint passes; husky blocks a failing commit               |
| CORE-03 | Joi-validated config module       | Typed `AppConfigService`; no `process.env` at call sites |
| CORE-04 | Error code union + `AppError`     | 17 codes; missing HTTP status is a compile error         |
| CORE-05 | Global exception filter           | One error envelope for all failure types                 |
| CORE-06 | Response wrap interceptor         | `{ success, data }`; no double-wrap; 204 untouched       |
| CORE-07 | Global validation pipe            | Unexpected body field → 400                              |
| CORE-08 | Pino logger with request-ID ALS   | Request ID on logs; passwords/tokens redacted            |
| CORE-09 | Throttler                         | 100/min global; 10/min on `/auth/*`; `/health` skipped   |
| CORE-10 | Swagger + `openapi.json` export   | `/docs`; CI exports spec for Prism                       |

## Layout

```
apps/backend/src/
  main.ts
  core/
    setup-app.ts                 # prefix, validation pipe, request ID, Swagger
    config/                      # CORE-03
    errors/                      # CORE-04
    http/                        # filter, wrap, logger, Swagger, ALS
  app/
    app.module.ts
    health.controller.ts
    todos.controller.ts
    auth.controller.ts           # placeholder; stricter throttle
    dto/
```

## CORE-01 — TypeScript and boot

`apps/backend/tsconfig.app.json` and `tsconfig.spec.json` set:

- `strict: true`
- `noUncheckedIndexedAccess: true`

Root script: `"start:dev": "npx nx run backend:serve"`.

## CORE-02 — Lint and pre-commit

- ESLint: workspace flat config + `apps/backend/eslint.config.mjs`
- Prettier: `.prettierrc` (`singleQuote: true`)
- Husky: `.husky/pre-commit` runs `npx lint-staged`
- `lint-staged` in root `package.json` runs ESLint (`--max-warnings=0 --fix`) and Prettier on staged files

A commit that still fails ESLint after `--fix` is blocked.

## CORE-03 — Config

- Schema: `apps/backend/src/core/config/env.schema.ts` (Joi)
- Module: `AppConfigModule` (`@nestjs/config` + `validateEnv`)
- Typed access: inject `AppConfigService` (`nodeEnv`, `port`, `logLevel`, `isProduction`)

Do not read `process.env` in controllers or services. `validateEnv` is only for bootstrap.

## CORE-04 — Error codes and `AppError`

Seventeen codes in `apps/backend/src/core/errors/error-codes.ts`. `ERROR_HTTP_STATUS` uses `satisfies Record<ErrorCode, number>`, so a new code without a status fails typecheck.

| Code                   | HTTP |
| ---------------------- | ---- |
| `BAD_REQUEST`          | 400  |
| `VALIDATION_ERROR`     | 400  |
| `UNAUTHORIZED`         | 401  |
| `INVALID_CREDENTIALS`  | 401  |
| `TOKEN_EXPIRED`        | 401  |
| `TOKEN_INVALID`        | 401  |
| `FORBIDDEN`            | 403  |
| `NOT_FOUND`            | 404  |
| `CONFLICT`             | 409  |
| `ALREADY_EXISTS`       | 409  |
| `PAYLOAD_TOO_LARGE`    | 413  |
| `UNPROCESSABLE_ENTITY` | 422  |
| `RATE_LIMITED`         | 429  |
| `INTERNAL_ERROR`       | 500  |
| `NOT_IMPLEMENTED`      | 501  |
| `SERVICE_UNAVAILABLE`  | 503  |
| `GATEWAY_TIMEOUT`      | 504  |

Throw domain failures with:

```ts
throw new AppError('NOT_FOUND', `Todo #${id} not found`);
```

## CORE-05 — Exception envelope

`AllExceptionsFilter` maps `AppError`, `HttpException`, throttling, validation, and unknown throws to:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Todo #99 not found"
  },
  "requestId": "…"
}
```

In production, unknown errors hide the original message.

## CORE-06 — Success envelope

`ResponseWrapInterceptor` wraps handler return values:

```json
{
  "success": true,
  "data": { "message": "Hello API" }
}
```

Already-wrapped `{ success: boolean, … }` bodies are not wrapped again. HTTP **204** (for example `DELETE /api/todos/:id`) is left empty.

## CORE-07 — Validation

Global `ValidationPipe`:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

An extra JSON field (for example `{ "title": "ok", "extra": true }` on `POST /api/todos`) returns **400** `VALIDATION_ERROR`.

Body DTOs are class-validator classes under `apps/backend/src/app/dto/`.

## CORE-08 — Logging

- `nestjs-pino` + `pino-http`
- Request ID stored in `AsyncLocalStorage` (`requestAls`) via `requestIdMiddleware`
- Header `x-request-id` is accepted or generated and echoed on the response
- Mixin adds `requestId` to every log line
- Redacted paths include `authorization`, `cookie`, `password`, `token`, `accessToken`, `refreshToken`, `secret`

Pretty printing (`pino-pretty`) is used only when `NODE_ENV=development`.

## CORE-09 — Throttling

- Global: **100** requests per **60s** (`ThrottlerGuard`)
- `/auth/*`: **10** requests per **60s** (`@Throttle` on `AuthController`)
- `/health`: skipped (`@SkipThrottle` and `skipIf` on URL containing `/health`)

`POST /api/auth/login` is a placeholder that validates `LoginDto` and throws `NOT_IMPLEMENTED`.

## CORE-10 — OpenAPI

- UI: `http://localhost:3000/docs`
- Live JSON: `http://localhost:3000/docs/openapi.json`
- Export for CI / Prism:

```sh
npx nx run backend:openapi
```

Writes `dist/apps/backend/openapi.json`. GitHub Actions includes the `openapi` target in `run-many`.

Example Prism mock (after export):

```sh
npx @stoplight/prism-cli mock dist/apps/backend/openapi.json
```

## Useful Nx targets

```sh
npx nx run backend:serve
npx nx run backend:build
npx nx run backend:test
npx nx run backend:lint
npx nx run backend:typecheck
npx nx run backend:openapi
```

## HTTP examples

`GET /api`

```json
{ "success": true, "data": { "message": "Hello API" } }
```

`GET /api/health`

```json
{
  "success": true,
  "data": { "status": "ok", "timestamp": "…", "uptime": 1.23 }
}
```

`POST /api/todos` with `{ "title": "Ship APIs" }` → **201** wrapped todo.

`DELETE /api/todos/:id` → **204** empty body.
