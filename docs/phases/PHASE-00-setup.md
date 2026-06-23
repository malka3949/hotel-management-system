# Phase 0 — Project Setup (Foundation)

## Purpose

Establish a working, deployable skeleton for both backend and frontend before any business logic is written. This phase sets every engineering standard that all future phases must follow.

---

## Big Picture

This is the foundation layer. All 9 subsequent phases build on top of what is established here. A weak foundation means rework in every later phase. Getting Phase 0 right means:
- Consistent folder structure across the entire codebase
- Enforced TypeScript strict mode from day one
- DB connection and migration tooling ready
- CI/CD pipeline operational before the first line of business code
- Design system wired in so all future UI is consistent

Architecture ref: ARCHITECTURE.md → Phase 1 "Platform Foundation" (partial)

---

## Scope

### In Scope
- NestJS backend project structure (modules/controllers/services/middleware/utils)
- PostgreSQL connection via Prisma ORM
- `.env` configuration and secret management pattern
- Global error handler and response envelope
- Next.js frontend project structure
- Main layout: Sidebar + Topbar + Main Content Area
- Tailwind CSS + shadcn/ui wired and configured
- RTL (Hebrew) layout configuration
- ESLint + Prettier enforced
- Docker Compose for local dev (backend + DB + Redis)
- Base CI pipeline (lint + typecheck)

### Out of Scope
- Any business entities or endpoints
- Authentication (Phase 1)
- Any page content beyond shell layout

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Backend runtime | Node.js 20 LTS |
| Backend framework | NestJS 11 (already installed) |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend framework | Next.js 16 (already installed) |
| UI framework | Tailwind CSS v4 + shadcn/ui |
| TypeScript | Strict mode (`strict: true`) |
| Code style | ESLint + Prettier |
| Containerization | Docker Compose (local dev only) |
| Language direction | RTL (Hebrew), `dir="rtl"` on `<html>` |

---

## Tasks

### Backend
- [ ] Initialize NestJS app with `@nestjs/cli`
- [ ] Configure Prisma with PostgreSQL connection
- [ ] Create `prisma/schema.prisma` base file
- [ ] Create folder structure: `src/modules/`, `src/common/`, `src/config/`
- [ ] Global exception filter (returns `{ success, error, message }`)
- [ ] Global response interceptor (wraps `{ success, data }`)
- [ ] `.env.example` with all required variables
- [ ] Health check endpoint `GET /api/health`
- [ ] Validate env on startup (`@nestjs/config` + Joi schema)
- [ ] Install and configure `helmet()` in NestJS bootstrap (security headers from day one)
- [ ] Global `ValidationPipe` with `forbidUnknownValues: true` and `whitelist: true`
- [ ] Install `@nestjs/throttler` (rate limiter wired, rules per-phase)
- [ ] Add `app/(portal)/` route group scaffold to frontend (public layout — no sidebar)

### Frontend
- [ ] Confirm Next.js App Router setup
- [ ] Configure `dir="rtl"` on `<html>` in `layout.tsx`
- [ ] Install and configure shadcn/ui
- [ ] Create design system tokens in Tailwind config (colors from design system doc)
- [ ] Create `components/layout/Sidebar.tsx`
- [ ] Create `components/layout/Topbar.tsx`
- [ ] Create `app/(dashboard)/layout.tsx` using Sidebar + Topbar
- [ ] Create `app/(auth)/layout.tsx` for auth pages (no sidebar)
- [ ] Placeholder home page that renders layout correctly

### Infrastructure
- [ ] `docker-compose.yml` with: postgres, redis, backend services
- [ ] `Makefile` with: `make dev`, `make migrate`, `make seed`
- [ ] `.github/workflows/ci.yml`: lint + typecheck on every PR
- [ ] `.gitignore` covering: `.env`, `node_modules`, `.next`, `dist`

### DevOps
- [ ] Confirm GitHub repo exists with `main` and `develop` branches
- [ ] Branch protection rules on `main`

---

## Expected Deliverables

1. Backend server starts on port 3001, responds `200` at `/api/health`
2. Frontend starts on port 3000, renders layout shell (RTL, Hebrew fonts)
3. `docker-compose up` brings the full local dev environment
4. ESLint + TypeScript compile with zero errors
5. CI pipeline passes on an empty commit

---

## Validation Checklist

- [ ] `npm run build` succeeds in both backend and frontend
- [ ] `npx prisma migrate dev` runs without error on clean DB
- [ ] RTL layout renders correctly (sidebar on right, content flows right-to-left)
- [ ] Design tokens (primary `#1E3A8A`, accent `#CA8A04`, etc.) applied in Tailwind
- [ ] ESLint reports zero violations
- [ ] TypeScript `strict: true` — zero `any` or type errors
- [ ] Health check returns `{ success: true }` at `GET /api/health`
- [ ] Docker Compose starts all services cleanly

---

## Exit Criteria

All of the following must be true before Phase 1 begins:

1. Backend server starts and health check passes
2. Frontend renders layout shell with RTL direction
3. Prisma connects to PostgreSQL successfully
4. ESLint + typecheck pass in CI
5. Docker Compose environment works end-to-end
6. `.env.example` documents all required secrets
7. Branch protection active on `main`
8. Helmet.js active — security headers present in response (verify in browser DevTools)
9. `ValidationPipe` rejects unknown fields and invalid values
