# dev-phase9.md — Phase 9: Housekeeping Module

## Phase Identifier
Phase 9 — Housekeeping Module

## Status
STATUS: COMPLETE

## Source References
- `docs/phases/PHASE-09-housekeeping.md`
- `CLAUDE/invariants.md`

## Implementation Summary
Full housekeeping task system. Auto-creates urgent task on check-out (atomic, inside the same DB transaction). Housekeeper dashboard (mobile-friendly) for own tasks with start/complete lifecycle. Manager view with table, filters, inline assign dropdown, manual task creation, and skip action. Room cleaning status synced atomically on task state changes. WebSocket push via existing `RoomStatusGateway` (`housekeeping:task:updated` + `room:status:updated`). Branch isolation enforced throughout.

## Implemented Milestones

| Milestone | Completed | Notes |
|---|---:|---|
| Prisma schema: HousekeepingTaskStatus + HousekeepingPriority enums | Yes | |
| Prisma schema: HousekeepingTask model + back-relations | Yes | Branch, Room, Reservation, User (×2) |
| Migration 20260708000008_phase9_housekeeping | Yes | Table + 3 indexes + 5 FK constraints |
| HousekeepingModule: service, controller, DTOs | Yes | |
| GET /housekeeping/tasks (housekeeper: own; manager: all branch) | Yes | |
| POST /housekeeping/tasks (manager+) | Yes | |
| PATCH /tasks/:id/assign (manager+) | Yes | Validates assignee is housekeeping role in branch |
| PATCH /tasks/:id/start → room in_progress, WS emit | Yes | Atomic transaction |
| PATCH /tasks/:id/complete → room clean+available, WS emit | Yes | Atomic transaction |
| PATCH /tasks/:id/skip (manager+) | Yes | |
| CheckInService.checkOut auto-creates urgent task | Yes | Inside checkout $transaction |
| RoomStatusGateway.emitHousekeepingTaskUpdated() | Yes | Emits housekeeping:task:updated |
| CheckInModule imports HousekeepingModule | Yes | |
| HousekeepingModule registered in AppModule | Yes | |
| Frontend: /housekeeping housekeeper dashboard | Yes | Mobile-friendly, today/all filter |
| Frontend: /housekeeping/manage manager view | Yes | Table, filters, inline assign, create dialog, skip |
| Frontend: HousekeepingTaskCard component | Yes | Auto-created 🧹 vs manual ✏️ indicator |
| Frontend: PriorityBadge component | Yes | urgent=red, normal=gray |
| Frontend: lib/api/housekeeping.ts | Yes | |
| Sidebar links (ניקיון + ניהול ניקיון) | Yes | Role-gated |
| Integration tests: housekeeping.e2e-spec.ts (10 tests) | Yes | Requires live DB |

## Files Changed

### Backend — New
- `backend/prisma/migrations/20260708000008_phase9_housekeeping/migration.sql`
- `backend/src/modules/housekeeping/housekeeping.module.ts`
- `backend/src/modules/housekeeping/housekeeping.service.ts`
- `backend/src/modules/housekeeping/housekeeping.controller.ts`
- `backend/src/modules/housekeeping/dto/create-task.dto.ts`
- `backend/src/modules/housekeeping/dto/assign-task.dto.ts`
- `backend/src/modules/housekeeping/dto/skip-task.dto.ts`
- `backend/src/modules/housekeeping/dto/filter-tasks.dto.ts`
- `backend/test/housekeeping.e2e-spec.ts`

### Backend — Modified
- `backend/prisma/schema.prisma` — new enums, HousekeepingTask model, back-relations on Branch/Room/Reservation/User
- `backend/src/modules/check-in/check-in.service.ts` — inject HousekeepingService, call createTaskInTransaction in checkOut
- `backend/src/modules/check-in/check-in.module.ts` — import HousekeepingModule
- `backend/src/modules/rooms/room-status.gateway.ts` — add emitHousekeepingTaskUpdated()
- `backend/src/app.module.ts` — register HousekeepingModule

### Frontend — New
- `frontend/app/(dashboard)/housekeeping/manage/page.tsx`
- `frontend/components/shared/HousekeepingTaskCard.tsx`
- `frontend/components/shared/PriorityBadge.tsx`
- `frontend/lib/api/housekeeping.ts`

### Frontend — Modified
- `frontend/app/(dashboard)/housekeeping/page.tsx` — replaced placeholder
- `frontend/components/layout/Sidebar.tsx` — added ניקיון + ניהול ניקיון links

## Dependencies Installed

| Dependency / Tool | Command Used | Reason |
|---|---|---|
| None new | — | Phase 9 uses only existing stack |

## Unit Tests

| Field | Value |
|---|---|
| Command | `npx jest --config jest-e2e-local.config.ts --testPathPattern=housekeeping --runInBand --forceExit` |
| Result | NOT RUN — requires live PostgreSQL at localhost:5432 |
| Notes | 10 tests written covering: auto-task on checkout, housekeeper scope, manager scope, branch isolation, manual create, assign (RBAC), start→room in_progress, housekeeper can't start other's task, complete→room clean, skip (RBAC) |

## Lint

| Field | Value |
|---|---|
| Command (housekeeping module) | `npx eslint src/modules/housekeeping/ --max-warnings=0` |
| Result | PASS — 0 errors, 0 warnings |
| Command (modified backend files) | `npx eslint src/modules/check-in/ src/modules/rooms/room-status.gateway.ts src/app.module.ts --max-warnings=0` |
| Result | PASS — 0 errors, 0 warnings |

## Functional Testability Evidence

| Field | Value |
|---|---|
| Method | TypeScript compile (backend + frontend) + ESLint |
| Backend tsc | `npx tsc --noEmit` → 0 errors |
| Frontend tsc | `npx tsc --noEmit` → 0 errors |
| Prisma generate | PASS — HousekeepingTask, HousekeepingPriority, HousekeepingTaskStatus generated |
| API routes | 6 routes wired under /api/v1/housekeeping/ |
| E2E test file | Compiles clean; requires PostgreSQL to execute |

## Documentation Update Evidence

| Field | Value |
|---|---|
| Documentation Updated | YES |
| Files Updated | PROJECT_STATUS.md, team-Yuri/dev-phase9.md |
| Reason if Not Required | — |

## Known Issues / Limitations
- Integration tests require live PostgreSQL (`docker compose up` → `npm run test:e2e`)
- `createTask` for `chain_admin` role throws `BRANCH_ID_REQUIRED_IN_BODY_FOR_ADMIN` — chain_admin must pass `branchId` in a future body field (not yet in CreateHousekeepingTaskDto); documented in BACKLOG
- Manager view room picker uses raw UUID input (future: room selector dropdown)

## Scope Compliance
All deliverables from `docs/phases/PHASE-09-housekeeping.md` implemented. No Phase 10 features included.

## Developer Declaration
Phase 9 PASS — 0 backend TypeScript errors, 0 frontend TypeScript errors, 0 ESLint errors. Prisma client generated. 10 e2e tests written and type-valid; runtime execution requires live PostgreSQL.
