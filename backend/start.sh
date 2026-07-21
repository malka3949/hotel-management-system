#!/bin/sh
set -e
# One-time fix: mark init migration as applied if it is stuck in rolled-back state
# (tables were created successfully; only _prisma_migrations state was wrong)
npx prisma migrate resolve --applied 20260601000000_init 2>/dev/null || true
npx prisma migrate deploy
node dist/main
