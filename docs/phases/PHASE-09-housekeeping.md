# Phase 9 — Housekeeping Module

## Purpose

Build the housekeeping task system: room cleaning workflows, task assignment, and real-time room status updates after check-out. Extracted from the original Phase 8 (Security) because housekeeping is MVP-scoped operational functionality, not security work.

---

## Big Picture

After every check-out, the room transitions to "dirty" status and enters the housekeeping queue. This phase makes that queue actionable: managers assign tasks to housekeeping staff, staff complete tasks via their mobile-friendly dashboard, and room status updates in real time (via WebSocket from Phase 4).

Housekeeping task completion feeds back into the availability engine — a room is not bookable again until it is marked "clean."

PRD ref: §9.6 Housekeeping Module — explicit MVP scope
PHASES.md: Housekeeping not explicitly a standalone phase; previously bundled into Phase 8 (Security)

---

## Scope

### In Scope
- Housekeeping task entity (full CRUD)
- Auto-task creation on check-out (room → dirty → task auto-generated with `priority: urgent`)
- Task assignment: manager selects room + housekeeper + scheduled date
- Housekeeper dashboard: view own tasks, mark start/complete
- Manager view: all tasks for branch, filterable
- Room cleaning status update on task state changes
- WebSocket push: `housekeeping:task:updated` (via Phase 4 WebSocket gateway)
- Priority management: normal / urgent

### Out of Scope
- Advanced maintenance workflows (broken fixtures, repairs — future phase)
- Housekeeping scheduling optimization (future phase)
- Laundry tracking (future phase)
- Cleaning checklists per room type (future phase)
- Guest-requested housekeeping (future phase)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Auto-task trigger | Check-out endpoint (`POST /reservations/:id/check-out`) creates task atomically |
| Room status sync | Task `start` → room `cleaning_status = in_progress`; task `complete` → room `cleaning_status = clean` |
| Atomicity | Task status update + room cleaning status update in single transaction |
| WebSocket | Emit `housekeeping:task:updated` via existing `RoomStatusGateway` (Phase 4) |
| Branch isolation | All tasks scoped to `branch_id` |

---

## Database Schema

### `housekeeping_tasks`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| room_id | uuid | FK → rooms |
| reservation_id | uuid | FK → reservations, nullable (auto-created on checkout) |
| assigned_to | uuid | FK → users (housekeeping role), nullable |
| status | enum | pending, in_progress, completed, skipped |
| priority | enum | normal, urgent |
| notes | text | nullable |
| scheduled_for | date | |
| started_at | timestamp | nullable |
| completed_at | timestamp | nullable |
| created_by | uuid | FK → users, nullable (null = auto-created) |
| created_at | timestamp | |

**Indexes:** `(branch_id, status)`, `(branch_id, assigned_to, status)`, `(branch_id, scheduled_for)`

---

## Tasks

### Backend
- [ ] Create `HousekeepingModule` with `HousekeepingService`, `HousekeepingController`
- [ ] `GET /api/v1/housekeeping/tasks` — for housekeeper: own tasks only; for manager: all branch tasks
- [ ] `POST /api/v1/housekeeping/tasks` — manually create task (manager+)
- [ ] `PATCH /api/v1/housekeeping/tasks/:id/assign` — assign housekeeper (manager+)
- [ ] `PATCH /api/v1/housekeeping/tasks/:id/start`
  - Sets `status = in_progress`, `started_at = now()`
  - Updates `rooms.cleaning_status = in_progress`
  - Emits WebSocket `housekeeping:task:updated`
- [ ] `PATCH /api/v1/housekeeping/tasks/:id/complete`
  - Sets `status = completed`, `completed_at = now()`
  - Updates `rooms.cleaning_status = clean`
  - Emits WebSocket `room:status:updated`
- [ ] `PATCH /api/v1/housekeeping/tasks/:id/skip` — mark skipped with reason (manager+)
- [ ] Update `CheckOutService` (Phase 6): auto-create housekeeping task on check-out
  - `priority: urgent`
  - `scheduled_for: today`
  - `created_by: null` (system-created)
- [ ] Filter tasks: by status, priority, assigned_to, date, room

### Frontend
- [ ] `/housekeeping` — housekeeper dashboard (mobile-friendly layout)
  - Greeting: "Good morning, [name]. You have X tasks today."
  - Task cards: room number + floor, priority badge, status, Start/Complete buttons
  - Filters: today / all pending
- [ ] `/housekeeping/manage` — manager housekeeping view
  - All tasks for branch in table
  - Filters: status, priority, housekeeper, date
  - Create task button
  - Assign housekeeper dropdown per task (inline)
- [ ] `HousekeepingTaskCard` component (used in housekeeper view)
- [ ] `PriorityBadge` component (urgent = red, normal = gray)
- [ ] Auto-created task indicator (different icon from manually created)
- [ ] Task complete confirmation dialog

---

## Expected Deliverables

1. Check-out auto-creates urgent housekeeping task (room → dirty → task in queue)
2. Housekeeper sees their task list and can start/complete tasks
3. Room cleaning status updates in real time on status board
4. Manager can view, assign, and filter all branch tasks
5. Room becomes available (clean) after task completion

---

## Validation Checklist

- [ ] Check-out → `housekeeping_tasks` record created with `priority: urgent`
- [ ] Check-out → `rooms.cleaning_status = dirty`
- [ ] Task `start` → `rooms.cleaning_status = in_progress`
- [ ] Task `complete` → `rooms.cleaning_status = clean`
- [ ] WebSocket emits `housekeeping:task:updated` within 1 second of completion
- [ ] Room status board updates in real time on task completion
- [ ] Housekeeper can only see and action their own tasks
- [ ] Manager can see all tasks for branch; `chain_admin` sees all branches
- [ ] Skipping a task requires manager role
- [ ] Housekeeper cannot access reservations page → `403`
- [ ] Branch isolation: tasks only visible within branch
- [ ] RTL layout correct on housekeeping pages
- [ ] TypeScript strict — zero `any`

---

## Exit Criteria

All of the following must be true before Phase 10 (Dashboard) begins:

1. Auto-task creation on check-out working
2. Task lifecycle (pending → in_progress → completed) updates room cleaning status atomically
3. Real-time WebSocket updates verified in browser
4. Housekeeper and manager views functional
5. Room can be confirmed available (clean) for new reservations after cleaning
6. Integration tests: auto-create on check-out, task completion → room status update, branch isolation
