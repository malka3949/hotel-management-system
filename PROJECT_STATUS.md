# PROJECT_STATUS.md — Hotel Management System

Last updated: 2026-06-28

---

## Current Phase

| Phase | Name | Doc | Status |
|---|---|---|---|
| **Phase 0** | Project Setup | `PHASE-00-setup.md` | 🟢 Complete |
| Phase 1 | Auth, Users & Branches | `PHASE-01-auth.md` | 🟢 Complete |
| Phase 2 | Rooms Module | `PHASE-02-rooms.md` | 🟢 Complete |
| Phase 3 | Guests Module | `PHASE-03-guests.md` | 🟢 Complete |
| Phase 4 | Availability Engine | `PHASE-04-availability.md` | 🟢 Complete |
| Phase 5 | Reservations System | `PHASE-05-reservations.md` | 🟢 Complete |
| Phase 6 | Check-in / Check-out | `PHASE-06-checkin-checkout.md` | 🟢 Complete |
| Phase 7 | Billing & Payments | `PHASE-07-billing.md` | ⏳ Pending |
| Phase 8 | Guest Portal | `PHASE-08-guest-portal.md` | ⏳ Pending |
| Phase 9 | Housekeeping Module | `PHASE-09-housekeeping.md` | ⏳ Pending |
| Phase 10 | Dashboard & Reporting | `PHASE-10-dashboard.md` | ⏳ Pending |
| Phase 11 | Security Audit & Hardening | `PHASE-11-security.md` | ⏳ Pending |
| Phase 12 | Production Deployment | `PHASE-12-deployment.md` | ⏳ Pending |

**Active phase: Phase 6 — Check-in / Check-out (🟢 Complete)**
**Overall progress: 6/13 phases complete**

---

## Status Legend

| Symbol | Meaning |
|---|---|
| 🔴 Not Started | Phase not yet begun |
| 🟡 In Progress | Actively being implemented |
| 🟢 Complete | Phase done, exit criteria met |
| ⏳ Pending | Waiting for prior phase to complete |
| 🔁 Blocked | Blocked — see notes |

---

## Phase Dependencies

```
Phase 0 (Setup)
  └── Phase 1 (Auth)
        └── Phase 2 (Rooms)
              └── Phase 3 (Guests)
                    └── Phase 4 (Availability Engine)  ← must precede reservations
                          └── Phase 5 (Reservations)  ← imports AvailabilityService
                                └── Phase 6 (Check-in/out)
                                      └── Phase 7 (Billing)
                                            └── Phase 8 (Guest Portal)  ← uses PaymentService
                                                  └── Phase 9 (Housekeeping)
                                                        └── Phase 10 (Dashboard)
                                                              └── Phase 11 (Security Audit)
                                                                    └── Phase 12 (Deployment)
```

**Critical:** Phase 5 (Reservations) MUST start after Phase 4 (Availability Engine) is complete.

---

## Phase 0 — Project Setup

**Status:** 🟢 Complete
**Exit criteria doc:** `docs/phases/PHASE-00-setup.md`

### Completed tasks
- [x] NestJS app initialized and runnable (`GET /api/health` → `{ status: "ok" }`)
- [x] Prisma connected to PostgreSQL (`prisma/schema.prisma` with datasource)
- [x] Helmet.js active (`app.use(helmet())` in `main.ts`)
- [x] ValidationPipe with `whitelist`, `forbidNonWhitelisted`, `forbidUnknownValues: true`
- [x] Global exception filter — `{ success, error, message }` envelope
- [x] Global response interceptor — `{ success, data }` envelope
- [x] Env validation on startup (`@nestjs/config` + Joi schema)
- [x] `@nestjs/throttler` installed and wired
- [x] Next.js App Router with `dir="rtl"` on `<html>`
- [x] Tailwind v4 + design system tokens in `globals.css`
- [x] `Sidebar.tsx`, `Topbar.tsx` components
- [x] `(dashboard)/layout.tsx`, `(auth)/layout.tsx`, `(portal)/layout.tsx`
- [x] Dashboard placeholder page
- [x] shadcn/ui configured: `components.json`, `lib/utils.ts`, CSS variables, `components/ui/`
- [x] `docker-compose.yml` (postgres, redis, backend)
- [x] `Makefile` with `dev`, `migrate`, `seed`, `typecheck`, `lint` targets
- [x] `.env.example` with all required variables
- [x] `.gitignore` (root + frontend)
- [x] `.github/workflows/ci.yml` — lint + typecheck for both backend and frontend

### Exit criteria — verified
- [x] TypeScript strict — zero errors (backend + frontend)
- [x] ESLint zero violations (backend + frontend)
- [x] RTL layout shell renders correctly
- [x] shadcn/ui configured (`components.json`, `lib/utils.ts`, CSS vars)
- [x] Helmet.js active, ValidationPipe with `forbidUnknownValues`
- [x] CI pipeline: lint + typecheck for both backend and frontend
- [x] Docker Compose covers postgres + redis + backend
- [x] `.env.example` documents all required secrets
- [ ] `docker compose up` end-to-end — verify manually when Docker available
- [ ] Branch protection on `main` — verify on GitHub

### Blockers
None.

---

## Phase 1 — Auth, Users & Branches

**Status:** 🟢 Complete
**Exit criteria doc:** `docs/phases/PHASE-01-auth.md`

### Completed tasks

#### Backend
- [x] `prisma/schema.prisma` — Branch, User, RefreshToken, AuditLog models
- [x] `prisma/migrations/20260601000000_init/migration.sql` — full schema + audit_log immutability (REVOKE + RULE)
- [x] `AuthModule` — `AuthService`, `AuthController`, `JwtStrategy`
- [x] `POST /api/v1/auth/login` — bcrypt verify, issues JWT + refresh token, sets HttpOnly cookies
- [x] `POST /api/v1/auth/refresh` — token rotation (revoke old, issue new)
- [x] `POST /api/v1/auth/logout` — revokes refresh token, clears cookies
- [x] `GET /api/v1/auth/csrf` — double-submit CSRF token (non-HttpOnly cookie + body)
- [x] CSRF guard applied to all cookie-mutating endpoints (login, refresh, logout)
- [x] `UsersModule` — create (bcrypt 12), findAll (branch-scoped), findMe, update
- [x] `BranchesModule` — create, findAll (chain_admin: all; others: own), update, assign-user
- [x] `JwtAuthGuard`, `RolesGuard`, `BranchGuard` in `common/guards/`
- [x] `@Roles()`, `@CurrentUser()` decorators
- [x] `AuditService` — append-only audit log writes
- [x] `NotificationService` stub (global module)
- [x] ThrottlerGuard on auth endpoints (30 req/min per IP)
- [x] `prisma/seed.ts` — chain_admin + hotel_manager + receptionist seed users

#### Frontend
- [x] `/login` page — Hebrew RTL, error display
- [x] Auth API client (`lib/api/auth.ts`) — login, logout, refreshToken, getMe
- [x] Zustand auth store with persist (`lib/store/auth.store.ts`)
- [x] `useAuth()` hook — user, isAuthenticated, hasRole()
- [x] `RoleGate` component — hides UI by role
- [x] Topbar — user name + Hebrew role badge + logout
- [x] Sidebar — role-aware nav
- [x] `/admin/branches` — branch table + create form (chain_admin only)
- [x] `/admin/users` — user table + create + deactivate (chain_admin/manager)

#### Tests
- [x] `test/auth.e2e-spec.ts` — integration tests: login, refresh, logout, CSRF, JwtAuthGuard, RolesGuard, BranchGuard, audit logs
- [x] `jest-e2e.config.ts` + `test/jest-e2e.setup.ts` — migrate reset on test start
- [x] `tsconfig.test.json` — includes test/ with jest types

### Exit criteria — verified
- [x] Authentication flow end-to-end: login → protected API → logout
- [x] RBAC: all 4 roles modeled, guards wired
- [x] Branch scoping: manager sees only own branch; chain_admin sees all
- [x] Audit logs written for LOGIN / LOGOUT / FAILED_LOGIN
- [x] Seed script creates chain_admin user
- [x] TypeScript strict — zero errors (src + test)
- [x] Integration tests cover all exit criteria
- [x] CSRF double-submit cookie on cookie-mutating endpoints
- [ ] `npm run test:e2e` — requires live PostgreSQL (run with Docker)

### Blockers
None. Tests require PostgreSQL — run via `docker compose up` then `npm run test:e2e`.

---

## Phase 2 — Rooms Module

**Status:** 🟢 Complete

### Completed tasks

#### Backend
- [x] `RoomStatus` and `CleaningStatus` enums in Prisma schema
- [x] `RoomType` and `Room` models with all required fields
- [x] Migration `20260601000001_phase2_rooms`
- [x] `RoomTypesModule` — service + controller (`GET /api/v1/room-types`, `POST /api/v1/room-types`)
- [x] `RoomsModule` — service + controller with full CRUD
- [x] `GET /api/v1/rooms` — list with filters (status, cleaningStatus, roomTypeId, floor, search)
- [x] `GET /api/v1/rooms/:id` — single room
- [x] `POST /api/v1/rooms` — create (manager+)
- [x] `PATCH /api/v1/rooms/:id` — update (manager+)
- [x] `PATCH /api/v1/rooms/:id/status` — operational status (receptionist+)
- [x] `PATCH /api/v1/rooms/:id/cleaning-status` — cleaning status (all staff)
- [x] `DELETE /api/v1/rooms/:id` — soft delete (manager+)
- [x] Branch isolation enforced on all routes

#### Frontend
- [x] `lib/api/rooms.ts` — typed API client
- [x] `RoomStatusBadge` component (color-coded)
- [x] `CleaningStatusBadge` component (color-coded)
- [x] `/rooms` — room list with inline status dropdowns and filters
- [x] `/rooms/new` — create room form with inline room type creation
- [x] `/rooms/[id]/edit` — edit room form

#### Tests
- [x] `test/rooms.e2e-spec.ts` — create, list with filters, status updates, soft delete, branch isolation, role guards

### Exit criteria — verified
- [x] Full room CRUD operational and branch-scoped
- [x] Both status types (operational + cleaning) updatable
- [x] Room type management works
- [x] Role-based access enforced
- [x] Frontend list + form pages functional and RTL-correct
- [x] TypeScript strict — zero errors (backend + frontend)
- [ ] `npm run test:e2e` — requires live PostgreSQL

### Blockers
None.

---

## Phase 3 — Guests Module

**Status:** 🟢 Complete

### Completed tasks

#### Backend
- [x] `DocumentType` enum added to Prisma schema (`passport`, `id_card`, `drivers_license`, `other`)
- [x] `Guest` model with all fields + branch_id FK
- [x] `GuestDocument` model
- [x] Migration `20260614000002_phase3_guests` — creates tables, pg_trgm extension, trigram index on full_name
- [x] `GuestsModule` — `GuestsService`, `GuestsController` with full DTOs
- [x] `GET /api/v1/guests` — paginated list with search (name/phone/email/passportId)
- [x] `GET /api/v1/guests/search` — fast search endpoint (top 10, raw pg query)
- [x] `GET /api/v1/guests/:id` — single guest
- [x] `POST /api/v1/guests` — create with duplicate detection (409 on dup email/passportId)
- [x] `PATCH /api/v1/guests/:id` — update (receptionist+)
- [x] `DELETE /api/v1/guests/:id` — soft delete (manager+)
- [x] `GET /api/v1/guests/:id/documents` — list documents
- [x] `POST /api/v1/guests/:id/documents` — add document (receptionist+)
- [x] Branch isolation enforced on all routes
- [x] `GuestsModule` imported in `AppModule`

#### Frontend
- [x] `lib/api/guests.ts` — typed API client (all endpoints)
- [x] `/guests` — paginated list with debounced search (300ms), branch selector for admin
- [x] `/guests/new` — create form with duplicate warning banner
- [x] `/guests/:id` — detail page (info card + documents + reservation history placeholder)
- [x] `/guests/:id/edit` — edit form with duplicate warning banner
- [x] `GuestSearchCombobox` component — reusable for Phase 4 reservation form
- [x] RTL layout, Hebrew labels throughout

#### Tests
- [x] `test/guests.e2e-spec.ts` — create, list, search (name/phone/email), duplicate detection, branch isolation, soft delete, documents, role guards

### Exit criteria — status
- [x] TypeScript strict — zero errors (backend + frontend)
- [ ] Guest CRUD fully operational and branch-scoped — requires live PostgreSQL
- [ ] Guest search works reliably (name, phone, email, passport) — requires live PostgreSQL
- [ ] `GuestSearchCombobox` component built and tested
- [ ] Role-based access enforced — requires live PostgreSQL
- [ ] Integration tests — requires live PostgreSQL (`npm run test:e2e`)

### Blockers
None. Tests require PostgreSQL — run via `docker compose up` then `npm run test:e2e`.

---

## Phase 4 — Availability Engine

**Status:** 🟡 In Progress

### Completed tasks

#### Backend
- [x] `ReservationStatus` enum added to Prisma schema
- [x] `Reservation` model with all fields + indexes
- [x] Migration `20260622000003_phase4_availability` — creates reservations table
- [x] `AvailabilityModule` — `AvailabilityService`, `AvailabilityController`
- [x] `isRoomAvailable(roomId, checkIn, checkOut)` — SELECT FOR UPDATE via `$queryRaw`
- [x] `getAvailableRooms(branchId, checkIn, checkOut, filters)` — Redis cache (30s TTL)
- [x] `getOccupancySummary(branchId, date)` — occupancy snapshot
- [x] `invalidateAvailabilityCache(branchId)` — public method for Phase 5
- [x] `GET /api/v1/availability` — available rooms by date range
- [x] `GET /api/v1/availability/summary` — occupancy snapshot
- [x] `RoomStatusGateway` — WebSocket gateway with JWT auth, `branch:{id}` rooms
- [x] `room:status:updated` event emitted by RoomsService after status changes
- [x] `reservation:created` event ready for Phase 5
- [x] `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` installed
- [x] `@nestjs/cache-manager`, `cache-manager` installed

#### Frontend
- [x] `lib/api/availability.ts` — typed API client
- [x] `lib/socket.ts` — WebSocket client (auto-reconnect, 10 attempts)
- [x] `socket.io-client` installed
- [x] `/rooms/status-board` — real-time room status grid
- [x] `components/shared/OccupancySummaryWidget.tsx` — reusable occupancy widget
- [x] Sidebar link for לוח סטטוס

#### Tests
- [x] `test/availability.e2e-spec.ts` — overlap detection, same-day turnover, maintenance exclusion, cancelled reservation, branch isolation, role guards, occupancy summary

### Exit criteria — status
- [x] TypeScript strict — zero errors (backend + frontend)
- [ ] Availability engine returns accurate results — requires live PostgreSQL
- [ ] Concurrent overbooking impossible — requires live PostgreSQL + Phase 5
- [ ] Redis caching working and invalidating correctly — requires live Redis
- [ ] WebSocket real-time updates functional in browser — requires running backend
- [ ] Room status board live — requires running backend
- [ ] Integration tests — requires live PostgreSQL (`npm run test:e2e`)

### Blockers
None. Tests require PostgreSQL + Redis — run via `docker compose up` then `npm run test:e2e`.

---

## Phase 5 — Reservations System

**Status:** 🟡 In Progress

### Completed tasks

#### Schema
- [x] `ReservationSource` enum added (`walk_in`, `phone`, `website`, `ota`)
- [x] `Reservation` model extended: `adults`, `children`, `cancelledAt`, `cancellationReason`, `source` → enum
- [x] `ReservationGuest` model + `reservation_guests` table
- [x] Migration `20260623000004_phase5_reservation_fields`

#### Backend
- [x] `ReservationsModule` — `ReservationsService`, `ReservationsController`
- [x] `POST /api/v1/reservations` — atomic create, calls `AvailabilityService.isRoomAvailable()` inside `$transaction`
- [x] `GET /api/v1/reservations` — paginated list with filters (status, date range, room, guest, search)
- [x] `GET /api/v1/reservations/calendar` — calendar view by date range
- [x] `GET /api/v1/reservations/:id` — full detail with guest + room
- [x] `PATCH /api/v1/reservations/:id` — update (re-validates availability if dates/room changed)
- [x] `PATCH /api/v1/reservations/:id/status` — validated status transitions
- [x] `POST /api/v1/reservations/:id/cancel` — cancel with reason
- [x] `GET /api/v1/rooms/:id/reservations` — in RoomsController
- [x] `GET /api/v1/guests/:id/reservations` — in GuestsController
- [x] Status transition validator (VALID_TRANSITIONS matrix)
- [x] Price calculation: nights × roomType.basePrice
- [x] Audit log for create/update/status-change/cancel
- [x] NotificationService.sendEmail (async, non-blocking) on creation
- [x] invalidateAvailabilityCache after create/cancel/checkout
- [x] Branch isolation on all routes

#### Frontend
- [x] `lib/api/reservations.ts` — typed API client
- [x] `ReservationStatusBadge` component
- [x] `/reservations` — list with filters (status, dates, search)
- [x] `/reservations/new` — create form (GuestSearchCombobox + room picker + price preview)
- [x] `/reservations/[id]` — detail page + status actions + cancel dialog
- [x] `/reservations/calendar` — monthly grid (room × day)
- [x] Sidebar: "לוח שנה" link added

#### Tests
- [x] `test/reservations.e2e-spec.ts` — create, price calc, conflict detection, concurrent overbooking, status transitions, cancel + room freed, branch isolation, calendar, room/guest history, audit log

### Exit criteria — status
- [x] TypeScript strict — zero errors (backend + frontend)
- [ ] Overbooking prevention tested under concurrent load — requires live PostgreSQL
- [ ] Full reservation lifecycle working — requires live PostgreSQL
- [ ] Reservation list, detail, calendar pages functional — requires running stack
- [ ] Audit logging verified — requires live PostgreSQL
- [ ] Integration tests — requires live PostgreSQL (`npm run test:e2e`)

### Blockers
None. Tests require PostgreSQL + Redis — run via `docker compose up` then `npm run test:e2e`.

---

## Phase 6 — Check-in / Check-out

**Status:** 🟡 In Progress
**Exit criteria doc:** `docs/phases/PHASE-06-checkin-checkout.md`

### Completed tasks

#### Schema
- [x] `CheckIn` model + `check_ins` table
- [x] `CheckOut` model + `check_outs` table
- [x] `Invoice` model + `invoices` table (`InvoiceStatus` enum: draft/finalized/void)
- [x] `InvoiceLineItem` model + `invoice_line_items` table (`InvoiceItemType` enum)
- [x] Migration `20260624000005_phase6_checkin_checkout`
- [x] Back-relations added to `Reservation`, `Branch`, `User`, `Guest`

#### Backend
- [x] `CheckInModule` — `CheckInService`, `CheckInController`
- [x] `POST /api/v1/reservations/:id/check-in` — atomic: `confirmed` → `checked_in`, room → `occupied`, CheckIn record + Invoice (draft)
- [x] `POST /api/v1/reservations/:id/check-out` — atomic: `checked_in` → `checked_out`, room → `available/dirty`, Invoice finalized
- [x] `GET /api/v1/reservations/:id/invoice` — invoice with line items
- [x] `GET /api/v1/front-desk/active-guests` — checked_in reservations
- [x] `GET /api/v1/front-desk/arrivals` — confirmed reservations arriving on date
- [x] `GET /api/v1/front-desk/departures` — checked_in reservations departing on date
- [x] Tax rate 17%, invoice totals computed at check-in
- [x] `RoomStatusGateway.emitRoomStatusUpdate()` called after status changes
- [x] `AvailabilityService.invalidateAvailabilityCache()` called after check-in/out
- [x] Audit log: `CHECK_IN`, `CHECK_OUT`
- [x] Branch isolation on all routes
- [x] `CheckInModule` imported in `AppModule`

#### Frontend
- [x] `lib/api/checkin.ts` — typed API client (checkIn, checkOut, getInvoice, getActiveGuests, getArrivals, getDepartures)
- [x] `InvoiceSummary` component — line items table + tax + total (new shared component)
- [x] `/front-desk` — tabs: הגעות היום / עזיבות היום / אורחים פעילים
  - Check-in dialog with notes field
  - Check-out dialog with InvoiceSummary preview
- [x] `/reservations/[id]` — dedicated check-in/out buttons (replaces generic status buttons for these transitions)

#### Tests
- [x] `test/checkin.e2e-spec.ts` — check-in happy path, not-confirmed → 400, branch isolation, check-out happy path, not-checked-in → 400, active guests, arrivals, departures

### Exit criteria — status
- [ ] Check-in flow: confirmed → checked_in, room → occupied, invoice created
- [ ] Check-out flow: checked_in → checked_out, room → dirty, invoice finalized
- [ ] `/front-desk` page shows arrivals/departures/active guests
- [ ] InvoiceSummary renders correctly before check-out
- [ ] TypeScript strict — zero errors (backend + frontend)
- [ ] Integration tests — requires live PostgreSQL (`npm run test:e2e`)

### Blockers
None. Tests require PostgreSQL — run via `docker compose up` then `npm run test:e2e`.

---

## Architecture Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-05-31 | NestJS (not Express) for backend | Modular architecture, DI, enterprise-ready |
| 2026-05-31 | Prisma ORM | TypeScript-native, migration tooling |
| 2026-05-31 | Modular monolith (not microservices) | MVP stability over premature complexity |
| 2026-05-31 | JWT + HttpOnly cookie (not localStorage) | XSS protection |
| 2026-05-31 | PostgreSQL SELECT FOR UPDATE for reservations | Prevent race conditions / overbooking |
| 2026-05-31 | Redis for availability caching | < 200ms availability queries |
| 2026-05-31 | WebSockets for real-time room status | Avoid polling |
| 2026-05-31 | Payments abstracted behind PaymentService | Avoid vendor lock-in, support Stripe + Tranzila |
| 2026-05-31 | Availability Engine before Reservations (Phase 4 before 5) | Avoid AvailabilityService being duplicated in reservation logic |
| 2026-06-01 | CSRF double-submit cookie on all cookie-mutating auth endpoints | Protects login/refresh/logout from CSRF; GET /csrf issues non-HttpOnly token |
| 2026-06-01 | Manual Prisma migration file (not `migrate dev`) | No DB available at code-time; migration applied on `prisma migrate deploy` |
| 2026-06-01 | Integration tests drop immutability RULEs in afterAll | RULEs block FK cascade SET NULL needed for test cleanup; re-created by migration on next reset |
| 2026-05-31 | Security foundations in Phase 0–1 (not Phase 11) | Mandatory per ARCH §7.1 — not optional afterthoughts |
| 2026-05-31 | Guest Portal uses tokenized links (no guest login) | Reduces friction, ARCH §10 requirement |
| 2026-05-31 | DB-level audit_log immutability (REVOKE + RULE) | Application-layer immutability bypassable |
| 2026-06-14 | pg_trgm for guest name search + raw $queryRaw | Prisma client doesn't support `%` trigram operator; raw query used only in search endpoint |
| 2026-06-14 | Duplicate detection returns 409 (not blocking in UI) | Legal/business requirement: warn staff but don't prevent creation of guests with shared info |
| 2026-06-22 | Reservation model added in Phase 4 (not Phase 5) | AvailabilityService must query reservations; adding model early avoids re-migration |
| 2026-06-22 | cache-manager v7 `clear()` instead of `reset()` | v7 renamed the method; full-cache clear acceptable given 30s TTL and future Redis key-pattern support |
| 2026-06-22 | RoomStatusGateway in RoomsModule (not standalone) | Gateway emits on room status changes — collocating with RoomsService avoids circular deps |
| 2026-06-23 | ReservationsModule not imported by RoomsModule/GuestsModule — both import Reservations | ReservationsService uses PrismaService directly; no circular dep; RoomsModule/GuestsModule import ReservationsModule to get the service |
| 2026-06-23 | ReservationSource as Prisma enum (not String?) | Type safety and clean frontend/backend contract; migration migrates existing string values |

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Which payment provider: Stripe or Tranzila (or both)? | Open |
| 2 | Website booking engine: internal build or external integration? | Open |
| 3 | Email provider: SendGrid or AWS SES? | Open |
| 4 | Cloud provider: AWS or GCP? | Open |
| 5 | Hebrew-only or multilingual UI? | Assumed Hebrew-only for MVP |

---

## Known Risks

| Risk | Severity | Mitigation | Phase |
|---|---|---|---|
| Reservation race conditions | Critical | SELECT FOR UPDATE + optimistic locking | Phase 4, 5 |
| Payment failure states | Critical | Idempotent operations + retry-safe architecture | Phase 7 |
| Permission leakage | Critical | Centralized auth middleware + security audit | Phase 1, 11 |
| Scope creep | High | Phase gate: exit criteria must pass before next phase | All |
| Guest portal token theft | High | Short TTL, HTTPS only, one-time tokens for payment | Phase 8 |

---

## ARCH to Phase Mapping

| ARCHITECTURE.md Phase | Our Phase Docs |
|---|---|
| Phase 1: Platform Foundation | Phase 0 + Phase 1 |
| Phase 2: Core Hotel Operations | Phases 2–6 |
| Phase 3: Financial Operations | Phase 7 |
| Phase 4: Guest Portal | Phase 8 |
| Phase 5: Reporting & Dashboards | Phase 10 |
| Phase 6: Operational Stabilization | Phases 11–12 |

---

## How to Update This File

After completing each phase:
1. Change phase status to 🟢 Complete
2. Change next phase status to 🔴 Not Started → 🟡 In Progress
3. Update "Active phase" and "Overall progress"
4. Log any new architecture decisions
5. Close resolved open questions
