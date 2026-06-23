# CLAUDE.md — Hotel Management System

## Project Overview

Hotel chain management system. Multi-branch, RTL Hebrew UI, NestJS backend + Next.js 16 frontend + PostgreSQL + Redis.

**Stack:**
- Backend: NestJS 11, TypeScript strict, Prisma ORM, PostgreSQL 16, Redis 7
- Frontend: Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, shadcn/ui
- Auth: JWT (HttpOnly cookie), bcrypt, RBAC
- Real-time: WebSockets (`socket.io`)
- Payments: Stripe (primary) + Tranzila (Israel) behind `PaymentService` abstraction
- Notifications: `NotificationService` (SendGrid or AWS SES) — wired Phase 1, used Phase 5+
- Guest Portal: public tokenized access (no guest login system)

---

## Phase Discipline

**Work one phase at a time. Never start Phase N+1 until Phase N exit criteria are met.**

Current phase and status tracked in `PROJECT_STATUS.md`.
Phase docs: `docs/phases/PHASE-{NN}-{name}.md`

When a phase is complete:
1. Verify all exit criteria in the phase doc
2. Update `PROJECT_STATUS.md` (status → 🟢, next phase → 🔴)
3. Ask before starting next phase

---

## Architecture Rules (Non-Negotiable)

### Branch Isolation
Every DB entity must have `branch_id`. Every query must be filtered by `branch_id` from the JWT. No exceptions.

```typescript
// Every service method must scope by branchId
async findAll(branchId: string) {
  return this.prisma.room.findMany({ where: { branchId } });
}
```

### Reservation Integrity
Reservation creation and any date/room change delegates availability checking to `AvailabilityService`. Never duplicate availability logic inside `ReservationsService`. `AvailabilityService` owns `SELECT FOR UPDATE`.

### Audit Logs
`audit_logs` table is append-only — enforced at DB level (REVOKE UPDATE/DELETE on app user). Never UPDATE or DELETE audit log records in application code. Every financial operation, reservation mutation, and auth event must write an audit log.

### Payments
All payment operations go through `PaymentService`. No direct Stripe or Tranzila calls from controllers or other services. Every payment operation uses an idempotency key.

### Notifications
All email sending goes through `NotificationService`. No direct SendGrid/SES calls elsewhere. `NotificationService` is a stub in Phase 1 and gains real implementations as phases add notification triggers.

### Guest Portal
Guest portal routes use `GuestTokenGuard` (not `JwtAuthGuard`). Guest tokens are time-limited JWTs scoped to a single reservation. Never grant guest tokens access to staff endpoints.

---

## Design System

Design system doc: `design-system/` (see hook context for full spec).

**Do not invent colors, components, or patterns not in the design system.**
If a needed component is missing → flag it to the user.

Key tokens:
| Token | Hex | Usage |
|---|---|---|
| primary | `#1E3A8A` | Main actions, nav active |
| primary-light | `#3B82F6` | Hover, secondary buttons |
| accent | `#CA8A04` | CTA buttons only |
| bg-base | `#F8FAFC` | Page background |
| bg-surface | `#FFFFFF` | Cards, panels |
| border-default | `#E2E8F0` | All borders |
| text-primary | `#0F172A` | Headings |
| text-secondary | `#475569` | Supporting text |

**RTL:** All pages use `dir="rtl"`. Hebrew is the default UI language. Never hardcode LTR layout assumptions.

---

## Code Standards

### TypeScript
- `strict: true` — no `any`, no type bypasses
- All DTO fields decorated with `class-validator`
- `forbidUnknownValues: true` on global `ValidationPipe`

### NestJS Backend Structure
```
src/
  modules/
    auth/
    users/
    branches/
    rooms/
    guests/
    reservations/
    check-in/
    availability/
    housekeeping/
    reports/
    billing/       ← future
    notifications/ ← future
  common/
    guards/        ← JwtAuthGuard, RolesGuard, BranchGuard
    interceptors/  ← AuditInterceptor, ResponseInterceptor
    filters/       ← GlobalExceptionFilter
    decorators/    ← @Roles(), @CurrentUser(), @BranchId()
    dto/           ← shared DTOs
  config/          ← env validation, config module
  prisma/          ← PrismaService
```

### Next.js Frontend Structure
```
src/
  app/
    (auth)/        ← login, forgot-password, reset-password
    (dashboard)/   ← all protected pages
      layout.tsx   ← Sidebar + Topbar wrapper
      page.tsx     ← dashboard home
      rooms/
      guests/
      reservations/
      front-desk/
      housekeeping/
      reports/
  components/
    layout/        ← Sidebar, Topbar
    ui/            ← shadcn/ui components
    shared/        ← GuestSearchCombobox, ReservationStatusBadge, etc.
  lib/
    api/           ← typed API clients per module
    socket.ts      ← WebSocket client
    store/         ← Zustand stores
  hooks/           ← useAuth, useBranch, useReservations, etc.
```

### API Conventions
- Versioned: `/api/v1/`
- REST: plural nouns, HTTP verbs
- Response envelope: `{ success: true, data: ... }` or `{ success: false, error: "CODE", message: "..." }`
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests

---

## Testing Requirements

- Unit tests mandatory for: services, availability logic, status transition validators
- Integration tests mandatory for: auth flows, reservation creation, branch isolation, role guards
- **No DB mocks** — integration tests use a real test PostgreSQL instance
- Minimum coverage: 80%
- Reservation conflict tests are mandatory (concurrent request scenarios)

---

## Git Workflow

- `main` — production only, protected
- `develop` — staging auto-deploy
- Feature branches: `feature/phase-{N}-{short-name}`
- PR required to merge into `develop`
- No `--no-verify` unless explicitly requested

---

## Security Rules

- Passwords: bcrypt, rounds ≥ 12
- JWT: stored in HttpOnly cookie, not localStorage
- Never log passwords, tokens, or full card numbers
- SQL: always use Prisma parameterized queries — no raw string concatenation
- Rate limit auth endpoints: 30 req/min per IP
- HTTPS enforced in all non-local environments
- Secrets: environment variables only — never committed to git

---

## What NOT to Do

- Do not build Phase N+1 features inside Phase N
- Do not add error handling for scenarios that cannot happen
- Do not add backwards-compatibility shims for unused code
- Do not use mocks for DB in integration tests
- Do not invent UI components not in the design system
- Do not add comments that explain WHAT the code does — only WHY when it's non-obvious
- Do not bypass auth guards for "testing convenience"
- Do not store sensitive data in localStorage or cookies without HttpOnly

---

## Update This File When

- A new architectural decision is made (log it in `PROJECT_STATUS.md` too)
- A new shared utility or pattern is established
- A phase is completed and new patterns emerged
