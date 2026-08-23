#!/bin/sh
set -eu

npx prisma migrate deploy --schema prisma/schema.prisma

if [ "${RUN_SEED:-false}" = "true" ]; then
  node seed.cjs
fi

exec node main.cjs
