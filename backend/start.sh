#!/bin/sh
set -e
# If a migration is stuck in "failed" state (e.g. after a partial run that
# PostgreSQL rolled back), mark it as rolled-back so migrate deploy can retry.
npx prisma migrate resolve --rolled-back 20260601000000_init 2>/dev/null || true
npx prisma migrate deploy
node dist/main
