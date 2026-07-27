# Backup & Restore

## Automatic Backups (Render PostgreSQL)

Render creates daily backups automatically:
- Retention: 7 days (Starter plan), 30 days (Standard+)
- Location: Render dashboard → hotel-management-db → Backups

## Manual Backup (pg_dump)

```bash
pg_dump "$DATABASE_URL" -Fc -f hotel_backup_$(date +%Y%m%d).dump
```

## Restore from Backup

### Via Render dashboard
1. Render → hotel-management-db → Backups
2. Select backup → Restore
3. Confirm (this creates a new DB instance — update DATABASE_URL in backend service)

### Via pg_restore
```bash
pg_restore -d "$DATABASE_URL" -Fc hotel_backup_YYYYMMDD.dump
```

## Restore Drill (Required Before Go-Live)

1. Take a manual backup of the production DB
2. Create a test DB instance on Render
3. Restore the backup to the test instance
4. Run: `npx prisma migrate status` → confirm all migrations applied
5. Run: `curl test-db-backend/api/health` → confirm `"db": "up"`
6. Document result in team-Yuri/dev-phase12.md
