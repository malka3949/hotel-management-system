# Deployment Runbook

## Prerequisites
- Render.com account with workspace selected
- GitHub repo: `malka3949/hotel-management-system`
- Secrets ready: JWT secrets, Stripe keys, Resend API key, Sentry DSN

## Initial Deploy (First Time)

### 1. Create infrastructure via Render dashboard or render.yaml

Using Render Blueprint (render.yaml):
1. Go to Render dashboard → New → Blueprint
2. Connect repo `malka3949/hotel-management-system`
3. Render detects `render.yaml` and creates all services

Or manually via MCP:
```
create_postgres  → hotel-management-db (PostgreSQL 16, Frankfurt)
create_key_value → hotel-management-redis (Frankfurt)
create_web_service → hotel-management-backend (Docker, backend/Dockerfile)
```

### 2. Set environment variables on backend service

Required (set in Render dashboard → Environment):
```
FRONTEND_URL=https://your-frontend-domain.com
SENTRY_DSN=https://your-key@sentry.io/project
STRIPE_SECRET_KEY=sk_live_...
TRANZILA_TERMINAL=your-terminal
RESEND_API_KEY=re_...
```

Auto-set by render.yaml:
```
DATABASE_URL  ← from hotel-management-db
REDIS_URL     ← from hotel-management-redis
JWT_SECRET    ← generated
JWT_REFRESH_SECRET ← generated
COOKIE_SECRET ← generated
NODE_ENV=production
PORT=3001
```

### 3. Run database migrations

After first deploy, trigger migrations via Render Shell or CI:
```bash
npx prisma migrate deploy
```

### 4. Verify deployment

```bash
curl https://your-backend.onrender.com/api/health
# Expected: { "status": "ok", "db": "up", "redis": "up", ... }

curl https://your-backend.onrender.com/api/ready
# Expected: { "ready": true }
```

## Subsequent Deploys

Push to `develop` → auto-deploy to staging (via deploy.yml workflow)  
Push to `main` → requires manual approval in GitHub → deploy to production

## Health Check URLs
- Liveness: `GET /api/health` → returns status of DB + Redis
- Readiness: `GET /api/ready` → 200 = healthy, 503 = not ready

## Monitoring
- Render dashboard → Logs tab (real-time structured JSON logs)
- Sentry dashboard → Issues (automatic error capture on 5xx)
