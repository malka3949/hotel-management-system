# Rollback Procedure

## Application Rollback (Render)

1. Go to Render dashboard → hotel-management-backend → Deploys
2. Find the last known-good deploy
3. Click **Redeploy** on that deploy

Render keeps previous deploys available for 7 days.

## Database Rollback

Render PostgreSQL supports Point-in-Time Recovery (PITR) on paid plans.

For schema rollback:
```bash
# List available migrations
npx prisma migrate status

# Target previous migration (creates a new down-migration)
# NOTE: Prisma does not support automatic rollback — write a manual migration:
npx prisma migrate dev --name rollback_phase_N
```

**Never run `prisma migrate reset` on production.**

## Emergency: Full Revert

If a deployment breaks production and rollback is not enough:

1. Redeploy previous Docker image (see above)
2. If DB migration was applied, restore from Render backup:
   - Render dashboard → hotel-management-db → Backups
   - Select backup from before the bad deploy
   - Click Restore

## Verification After Rollback

```bash
curl https://your-backend.onrender.com/api/health
# db and redis must be "up"

curl https://your-backend.onrender.com/api/ready
# must return 200
```
