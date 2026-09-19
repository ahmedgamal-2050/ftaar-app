#!/bin/sh
set -eu

# Migrations run here by default so `docker compose up` works from a clean
# database. On Fly they are handled once per deploy by the release_command in
# fly.toml, which sets RUN_MIGRATIONS=false so every machine boot skips them.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx prisma migrate deploy --schema prisma/schema.prisma
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  node seed.cjs
fi

exec node main.cjs
