# CLAUDE.md — Hotel Management System

Detail docs in `CLAUDE/` — read on demand. Phase status in `PROJECT_STATUS.md`.

## Scope

- **Working directory:** `/home/runner/hotel-management-system` only.
- **Never access:** `/home/runner/MY PROJECT` or any path outside this repo.
- Before any read/write — verify the path is under `hotel-management-system`.

## Communication

- עברית כברירת מחדל; קוד, שמות קבצים, לוגים — באנגלית.
- תשובות קצרות — אין להסביר מה שברור מהקוד.
- אין פיצ'רים, ריפקטורינג, או הפשטות מעבר למה שהמשימה דורשת.

## Golden Rules

- **PROGRESS.txt** — append after every significant change (timestamp, session_id, tasks, files). NEVER overwrite. Too big → `PROGRESS_OLD_{date}.txt`.
- **FOLLOWUPS.md / BACKLOG.md** — read both at session start. P0/P1 in FOLLOWUPS → surface before new work. Out-of-scope bug → append to FOLLOWUPS (P0–P3, file:line, repro). Out-of-scope idea → append to BACKLOG.
- **Past work lookup order:** (1) `PROGRESS.txt` + archives, (2) `git log --grep=…`, (3) memory search, (4) `CLAUDE/*.md`.
- **Update docs with code.** After each completed build part → update this file + `PROJECT_STATUS.md`. New port/service/schema/endpoint → same commit as the code.
- **READ INVARIANTS FIRST.** Before auth, reservations, payments, audit logs → read `CLAUDE/invariants.md`.
- **"Verified" = real run.** Type-check/build = "compiles, untested" until tests or live run pass.
- **Workflow:** read relevant files before editing; prefer `Edit` over `Write`; run independent tools in parallel; check for existing files before creating new ones.
- **Destructive ops** (delete, force push, reset) — ask user first.
- **Commit/push** only when explicitly requested. New commit always — no `--amend` unless asked. No `--no-verify` unless asked. Commit message: why, not what.

## Project Overview

Hotel chain management system. Multi-branch, RTL Hebrew UI, NestJS backend + Next.js 16 frontend + PostgreSQL + Redis.

**Stack:**
- Backend: NestJS 11, TypeScript strict, Prisma ORM, PostgreSQL 16, Redis 7
- Frontend: Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, shadcn/ui
- Auth: JWT (HttpOnly cookie), bcrypt, RBAC
- Real-time: WebSockets (`socket.io`)
- Payments: Stripe (primary) + Tranzila (Israel) via `PaymentService`
- Notifications: `NotificationService` (SendGrid or AWS SES) — stub Phase 1, used Phase 5+
- Guest Portal: tokenized public access (no guest login)

## Phase Discipline

**One phase at a time. Never start Phase N+1 until Phase N exit criteria are met.**

- Status: `PROJECT_STATUS.md`
- Docs: `docs/phases/PHASE-{NN}-{name}.md`

When a phase completes:
1. Verify all exit criteria in the phase doc
2. Update `PROJECT_STATUS.md` (status → 🟢, next → 🔴)
3. Update this file if new patterns emerged
4. Ask before starting the next phase

## Architecture Rules (Non-Negotiable)

Full detail: `CLAUDE/invariants.md`.

- **Branch isolation** — every entity has `branch_id`; every query filtered by JWT branch. No exceptions.
- **Reservations** — availability only via `AvailabilityService` (owns `SELECT FOR UPDATE`). Never duplicate in `ReservationsService`.
- **Audit logs** — append-only at DB level. Never UPDATE/DELETE in app code.
- **Payments** — only through `PaymentService` + idempotency key. No direct Stripe/Tranzila calls.
- **Notifications** — only through `NotificationService`. No direct SendGrid/SES elsewhere.
- **Guest portal** — `GuestTokenGuard` only; time-limited, single-reservation scope. No staff endpoints.

## Design System

Doc: `design-system/`. **Do not invent colors, components, or patterns outside the design system.** Missing component → flag to user.

| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#1E3A8A` | Main actions, nav active |
| primary-light | `#3B82F6` | Hover, secondary buttons |
| accent | `#CA8A04` | CTA buttons only |
| bg-base | `#F8FAFC` | Page background |
| bg-surface | `#FFFFFF` | Cards, panels |
| border-default | `#E2E8F0` | All borders |
| text-primary | `#0F172A` | Headings |
| text-secondary | `#475569` | Supporting text |

**RTL:** `dir="rtl"` on all pages. Hebrew default UI. No hardcoded LTR assumptions.

## Code Standards

- TypeScript `strict: true` — no `any`. DTOs with `class-validator`. `forbidUnknownValues: true` on global `ValidationPipe`.
- Validation only at system boundaries (user input, external APIs).
- Comments only for non-obvious WHY — never WHAT.
- Node.js available in environment (`node_modules` in home dir).

**Backend:** `src/modules/` (auth, users, branches, rooms, guests, reservations, check-in, availability, housekeeping, reports, billing*, notifications*), `src/common/` (guards, interceptors, filters, decorators, dto), `src/config/`, `src/prisma/`.

**Frontend:** `src/app/(auth)/`, `src/app/(dashboard)/`, `src/components/{layout,ui,shared}/`, `src/lib/{api,socket,store}/`, `src/hooks/`.

**API:** `/api/v1/`, REST plural nouns, envelope `{ success, data }` / `{ success: false, error, message }`.

## Testing

- Unit tests: services, availability logic, status validators.
- Integration tests: auth, reservation creation, branch isolation, role guards.
- **No DB mocks** — real test PostgreSQL. Minimum 80% coverage.
- Mandatory: reservation conflict / concurrent request tests.
- UI changes: verify with real run, not compile-only.

## Git Workflow

- `main` — production, protected. `develop` — staging auto-deploy.
- Branches: `feature/phase-{N}-{short-name}`
- PR required to merge into `develop`
- Docs in the same commit as the code they describe

## Security

- bcrypt rounds ≥ 12; JWT in HttpOnly cookie (not localStorage)
- Never log passwords, tokens, or full card numbers
- Prisma parameterized queries only — no string concatenation
- Auth rate limit: 30 req/min per IP; HTTPS in non-local envs
- Secrets in env vars only — never in git

## What NOT to Do

- Phase N+1 features inside Phase N
- Error handling for impossible scenarios
- Backwards-compatibility shims for unused code
- DB mocks in integration tests
- UI components not in design system
- Bypass auth guards for "testing convenience"
- Sensitive data in localStorage or non-HttpOnly cookies

## Detail Docs (read when relevant)

| File | When to read |
|------|--------------|
| `CLAUDE/invariants.md` | Before auth, reservations, payments, audit, guest portal |
| `CLAUDE/git-workflow.md` | Before commit or parallel work |
| `CLAUDE/services.md` | Ports, containers, dev commands |
| `CLAUDE/db.md` | Schemas, connections, Redis keys |
| `CLAUDE/lessons-learned.md` | After incidents — backward-looking log |
| `docs/phases/PHASE-*.md` | Current phase scope and exit criteria |
| `PROJECT_STATUS.md` | Current phase and overall status |
