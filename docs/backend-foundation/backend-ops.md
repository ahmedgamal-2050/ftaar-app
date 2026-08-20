# Backend ops (FOUNDATION-BE OPS-01–OPS-08)

Status: **done**. Docker image, compose stack, CI, Terminus probes, staging publish, Helmet/CORS/body limits, file-based secrets, and a high-severity audit gate.

## Quick start

From a fresh clone (no `.env` required):

```sh
docker compose up --build
```

API: `http://localhost:3000`  
Liveness: `GET /health`  
Readiness: `GET /health/db`  
Swagger: `http://localhost:3000/docs`  
OpenAPI JSON (local Nx): `npx nx run backend:openapi`

Local Nest (`npm run start:dev`) still uses Postgres only:

```sh
npm run db:up
npm run db:migrate
```

Copy `apps/backend/.env.example` to `apps/backend/.env` for that path.

## Task checklist

| ID     | Task                      | Done when                                                                 |
| ------ | ------------------------- | ------------------------------------------------------------------------- |
| OPS-01 | Multi-stage Dockerfile    | Production image builds and runs                                          |
| OPS-02 | docker compose dev stack  | `docker compose up` with no extra manual steps                            |
| OPS-03 | GitHub Actions CI         | Lint, typecheck, unit + e2e vs Postgres; under 5 min; blocks PRs          |
| OPS-04 | Health + readiness        | `/health` and `/health/db` via Terminus; readiness fails if Postgres down |
| OPS-05 | Staging deploy            | Merge to `main` publishes GHCR; entrypoint migrates; optional seed        |
| OPS-06 | Helmet, CORS, body limits | Known origins only; JSON body size capped                                 |
| OPS-07 | Secrets                   | DB + JWT from `/run/secrets` or `*_FILE`, not committed env files         |
| OPS-08 | Dependency audit          | CI `npm audit --omit=dev --audit-level=high` on the pruned backend graph  |

## Image and compose (OPS-01, OPS-02)

- Dockerfile: `apps/backend/Dockerfile` (Nx prune → production `npm ci` → `prisma generate`).
- Entrypoint: `apps/backend/docker-entrypoint.sh` runs `prisma migrate deploy`, then `node seed.cjs` when `RUN_SEED=true`, then `node main.cjs`.
- Compose: `postgres` (healthy) + `api` on port 3000 with seed on first boot.

## CI (OPS-03, OPS-08)

`.github/workflows/ci.yml` runs on pull requests and `main`. It starts a Postgres 16 service, applies migrations, then `lint`, `typecheck`, `test`, `e2e`, and `openapi` for `backend` and `api-e2e` only (mobile is skipped so the job stays under five minutes). Enable **Require status checks** for this workflow so it blocks merge.

Audit is scoped to `dist/apps/backend` after prune so Expo/mobile high findings do not fail the API gate. `deepmerge-ts` is overridden to `^8.0.1` so the Prisma CLI in the production image is not flagged for GHSA-ggr8-5vv4-36mx.

## Health (OPS-04)

Both routes are **outside** the `/api` prefix and skip the throttler.

| Route            | Meaning                     | Failure                          |
| ---------------- | --------------------------- | -------------------------------- |
| `GET /health`    | Process is up (no database) | 503 if Terminus reports down     |
| `GET /health/db` | Postgres answers `SELECT 1` | **503** when Prisma cannot query |

## Staging (OPS-05)

`.github/workflows/staging.yml` on push to `master`:

1. Builds `apps/backend/Dockerfile` and pushes `ghcr.io/<org>/<repo>/backend:master`.
2. Writes the staging URL to the job summary.

Create a GitHub Environment named `staging` (optional protection) and set repository or environment:

| Kind     | Name           | Purpose                                    |
| -------- | -------------- | ------------------------------------------ |
| Variable | `STAGING_URL`  | Public URL (default documented below)      |
| Secret   | `DATABASE_URL` | Staging Postgres (host env / secret store) |
| Secret   | `JWT_SECRET`   | Signing key                                |

**Staging URL:** `https://staging.ftaar.example` (override with `STAGING_URL`).

Run the published image with `RUN_SEED=true` so migrations and seed run on container start. Do not bake secrets into the image.

## HTTP hardening (OPS-06)

`setupApp` applies Helmet, CORS from `CORS_ORIGINS` (comma-separated), and Express JSON/urlencoded limits from `BODY_LIMIT` (default `256kb`). Nest’s default body parser is disabled so the cap is the only parser.

## Secrets (OPS-07)

`hydrateSecretsFromStore()` runs during env validation. It fills `DATABASE_URL` and `JWT_SECRET` from:

1. `$DATABASE_URL_FILE` / `$JWT_SECRET_FILE`, or
2. `$SECRETS_DIR` (default `/run/secrets`) files `database_url` and `jwt_secret`

Compose/CI may still inject env for local convenience. Production should mount Docker/Kubernetes secrets and omit those values from committed files. `apps/backend/.env` is local-only.

## Environment

| Variable       | Required | Notes                                       |
| -------------- | -------- | ------------------------------------------- |
| `NODE_ENV`     | yes      | `development` \| `production` \| `test`     |
| `PORT`         | yes      | HTTP port                                   |
| `LOG_LEVEL`    | no       | Default `info`                              |
| `DATABASE_URL` | yes\*    | Postgres URL, or from the secret store      |
| `JWT_SECRET`   | yes\*    | Min 16 characters, or from the secret store |
| `CORS_ORIGINS` | no       | Default `http://localhost:3000`             |
| `BODY_LIMIT`   | no       | Default `256kb`                             |
| `RUN_SEED`     | no       | Image entrypoint only; `true` to seed       |
| `SECRETS_DIR`  | no       | Default `/run/secrets`                      |
