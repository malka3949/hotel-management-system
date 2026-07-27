# Servers

## Environments

| Env | Host | Port range | Notes |
|-----|------|------------|-------|
| dev | localhost (Docker) | 3000–5678 | safe for destructive tests; seed data only |
| prod | TBD | TBD | **real customer data — no destructive tests** |

No staging environment defined yet.

## Dev — Docker containers

| Container | Image | Port (host) | Network alias |
|---|---|---|---|
| `hotel_frontend` | next.js build | 3000 | `frontend` |
| `hotel_backend` | nestjs build | 3001 | `backend` |
| `hotel_postgres` | postgres:16-alpine | 5432 | `postgres` |
| `hotel_redis` | redis:7.4.3-alpine | 6379 (internal only) | `redis` |
| `hotel_n8n` | n8nio/n8n:latest | 5678 | `n8n` |

Network: `hotel_internal` (bridge). Postgres and Redis not exposed beyond dev.

## SSH

No SSH setup in dev — Docker only (`make dev`).
Production SSH: TBD when prod server provisioned.

## Quick access (dev)

| What | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Backend health | http://localhost:3001/api/health |
| n8n workflows | http://localhost:5678 |
| Prisma Studio | `make studio` → http://localhost:5555 |
