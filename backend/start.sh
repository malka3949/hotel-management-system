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

# Seed if room types are missing or incomplete (full set = 13 types across 3 branches)
node -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const n = await p.roomType.count();
    if (n < 13) {
      console.log('Room types incomplete (' + n + '/13) — running seed...');
      const { execSync } = require('child_process');
      execSync('node prisma/seed-prod.js', { stdio: 'inherit' });
    } else {
      console.log('DB already has full data (' + n + ' room types) — skipping seed.');
    }
  } catch (e) {
    console.warn('Seed check failed:', e.message);
  } finally {
    await p.\$disconnect();
  }
})();
" || true

node dist/main
