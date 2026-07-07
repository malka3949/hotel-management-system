# Services

## Port map (dev)

| Service  | Port | Container       | Purpose                        |
|----------|------|-----------------|--------------------------------|
| frontend | 3000 | hotel_frontend  | Next.js 16 App Router          |
| backend  | 3001 | hotel_backend   | NestJS API (`/api/v1/`)        |
| postgres | 5432 | hotel_postgres  | PostgreSQL 16 (primary DB)     |
| redis    | 6379 | hotel_redis     | Cache + availability TTL       |

> Redis exposed on host only in dev. In Docker network: `redis:6379`.

## Dev commands

| What                | Command                          |
|---------------------|----------------------------------|
| Start all           | `make dev`                       |
| Stop all            | `make stop`                      |
| Wipe volumes        | `make clean`                     |
| Run migration (dev) | `make migrate`                   |
| Run migration (prod)| `make migrate-deploy`            |
| Seed DB             | `make seed`                      |
| Prisma Studio       | `make studio`                    |
| Tail backend logs   | `make logs`                      |
| Container status    | `make ps`                        |
| Install deps        | `make install`                   |
| Typecheck (both)    | `make typecheck`                 |
| Lint (both)         | `make lint`                      |
| E2E tests           | `cd backend && npm run test:e2e` |

## Project map

- `backend/` — NestJS 11 API. Entrypoint: `src/main.ts`. Health: `GET /api/health`.
- `frontend/` — Next.js 16 App Router. Entrypoint: `src/app/layout.tsx`.
- `backend/prisma/` — Prisma schema + migrations.
- `docker-compose.yml` — postgres + redis + backend + frontend.
- `Makefile` — all common dev commands.
- `.env.example` — all required env vars with comments.
