#!/bin/sh
set -e

# Render's internal DATABASE_URL lacks sslmode=require; NestJS config validator rejects it.
if [ -n "$DATABASE_URL" ] && ! echo "$DATABASE_URL" | grep -q "sslmode=require"; then
  case "$DATABASE_URL" in
    *\?*) DATABASE_URL="${DATABASE_URL}&sslmode=require" ;;
    *)    DATABASE_URL="${DATABASE_URL}?sslmode=require" ;;
  esac
  export DATABASE_URL
fi

npx prisma migrate resolve --applied 20260601000000_init 2>/dev/null || true
npx prisma migrate deploy

# Seed if rooms are missing or incomplete (full set = 44 rooms across 3 branches)
node -e "
(async () => {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const n = await p.room.count();
    if (n < 44) {
      console.log('Rooms incomplete (' + n + '/44) — running seed...');
      const { execSync } = require('child_process');
      execSync('node prisma/seed-prod.js', { stdio: 'inherit' });
    } else {
      console.log('DB already has full data (' + n + ' rooms) — skipping seed.');
    }
  } catch (e) {
    console.warn('Seed check failed:', e.message);
  } finally {
    await p.\$disconnect();
  }
})();
" || true

node dist/main
