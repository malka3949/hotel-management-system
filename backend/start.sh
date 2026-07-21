#!/bin/sh
set -e

# Render's internal DATABASE_URL lacks sslmode=require; NestJS config validator rejects it.
# Append sslmode=require so the validator passes and Prisma uses SSL explicitly.
if [ -n "$DATABASE_URL" ] && ! echo "$DATABASE_URL" | grep -q "sslmode=require"; then
  case "$DATABASE_URL" in
    *\?*) DATABASE_URL="${DATABASE_URL}&sslmode=require" ;;
    *)    DATABASE_URL="${DATABASE_URL}?sslmode=require" ;;
  esac
  export DATABASE_URL
fi

# One-time fix: mark init migration as applied if it is stuck in rolled-back state
# (tables were created successfully; only _prisma_migrations state was wrong)
npx prisma migrate resolve --applied 20260601000000_init 2>/dev/null || true
npx prisma migrate deploy
node dist/main
