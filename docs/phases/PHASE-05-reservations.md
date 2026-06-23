# Phase 4 — Reservations System

## Purpose

Build the central reservation engine — the most business-critical module. Handles creation, management, and conflict prevention for all hotel bookings. Overbooking prevention is a hard requirement, not optional.

---

## Big Picture

Reservations join a guest + a room + a date range. This module is the operational heart of the system. Front desk staff will create reservations dozens of times per day. Managers monitor the reservation calendar. The availability engine (Phase 6) strengthens the conflict prevention built here.

**Reservation integrity is non-negotiable.** Two concurrent reservation requests for the same room on the same dates must never both succeed. This requires DB-level locking, not just application-level checks.

Architecture ref: ARCHITECTURE.md § 6 Reservation Integrity Rules, § 18 Critical Risks (Race Conditions)

---

## Scope

### In Scope
- Reservation entity with full lifecycle states
- Create reservation (guest + room + dates + occupants)
- Availability check before confirmation (atomic, transactional)
- Double-booking prevention with DB-level locking
- Edit reservation (dates, room reassignment, guest changes)
- Cancel reservation
- Reservation search and filter
- Reservation list page (table + basic calendar view)
- Status workflow: pending → confirmed → checked_in → checked_out → cancelled
- Notes field for special requests

### Out of Scope
- Payment processing (Phase 5 ARCH → handled in check-out flow or billing phase)
- Online check-in via guest portal (ARCH Phase 4)
- External OTA channel reservations (future phase)
- Website booking engine (future phase)
- Multi-room reservations (future phase)
- Group bookings (future phase)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Overbooking prevention | Uses `AvailabilityService` from Phase 4 — `SELECT FOR UPDATE` inside transaction |
| Concurrency safety | Optimistic locking with `version` column on reservations |
| Conflict detection | Delegated to `AvailabilityService.isRoomAvailable()` — atomic |
| Date validation | Check-out must be after check-in; min 1 night |
| Status transitions | Enforced in service layer — invalid transitions rejected |
| Branch isolation | All queries filtered by `branch_id` |
| Audit trail | Every create/edit/cancel logged to `audit_logs` |
| Notifications | Reservation confirmation email sent via `NotificationService` on creation |
| **Dependency** | **Requires Phase 4 (AvailabilityService) complete before starting** |

---

## Database Schema

### `reservations`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| room_id | uuid | FK → rooms |
| guest_id | uuid | FK → guests (primary guest) |
| check_in_date | date | |
| check_out_date | date | |
| status | enum | pending, confirmed, checked_in, checked_out, cancelled, no_show |
| adults | int | default 1 |
| children | int | default 0 |
| total_price | decimal(10,2) | calculated at booking time |
| notes | text | nullable |
| source | enum | walk_in, phone, website, ota |
| cancelled_at | timestamp | nullable |
| cancellation_reason | text | nullable |
| version | int | optimistic locking, default 0 |
| created_by | uuid | FK → users |
| created_at | timestamp | |
| updated_at | timestamp | |

### `reservation_guests`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations |
| guest_id | uuid | FK → guests |
| is_primary | boolean | |

**Indexes:** `(branch_id, room_id, check_in_date, check_out_date)` — critical for conflict detection
**Unique constraint:** enforced via transactional lock, not unique index (overlaps)

---

## Tasks

### Backend
- [ ] Create `ReservationsModule` with `ReservationsService`, `ReservationsController`, `ReservationsRepository`
- [ ] Import `AvailabilityModule` — use `AvailabilityService.isRoomAvailable()` for conflict checks (do NOT duplicate the availability logic)
- [ ] `POST /api/v1/reservations` — create (calls AvailabilityService → atomic insert)
  - `AvailabilityService` handles `SELECT FOR UPDATE` — ReservationsService just calls it
  - Returns `409 ROOM_CONFLICT` if unavailable
- [ ] On successful creation: call `NotificationService.sendReservationConfirmation(reservation)` (async, non-blocking)
- [ ] `GET /api/v1/reservations` — list with filters (status, date range, room, guest)
- [ ] `GET /api/v1/reservations/:id` — full detail with guest and room info
- [ ] `PATCH /api/v1/reservations/:id` — update dates/room/guests (re-validates availability)
- [ ] `PATCH /api/v1/reservations/:id/status` — status transition (validated)
- [ ] `POST /api/v1/reservations/:id/cancel` — cancel with reason
- [ ] `GET /api/v1/reservations/calendar` — returns reservations in date range (calendar view)
- [ ] `GET /api/v1/rooms/:id/reservations` — reservation history for a room
- [ ] `GET /api/v1/guests/:id/reservations` — reservation history for a guest
- [ ] Price calculation service: `nights × room_type.base_price`
- [ ] Status transition validator (e.g. cannot cancel a checked-out reservation)
- [ ] Audit log every create/edit/cancel
- [ ] All routes enforce branch scope

### Frontend
- [ ] `/reservations` — reservation list (table view)
  - Columns: ID, guest name, room, check-in, check-out, nights, status, created by, actions
  - Filters: status, date range, room type
  - Search: guest name or reservation ID
- [ ] `/reservations/new` — create reservation form
  - Guest selector using `GuestSearchCombobox` (built in Phase 3)
  - Room selector (shows available rooms for selected dates)
  - Date range picker (RTL-compatible)
  - Occupants count
  - Source selection
  - Notes field
  - Price preview (auto-calculated)
- [ ] `/reservations/:id` — reservation detail page
  - Full status timeline
  - Guest info card
  - Room info card
  - Edit / Cancel buttons
- [ ] `/reservations/calendar` — basic calendar view (monthly)
  - Room × Date grid
  - Color-coded by status
- [ ] `ReservationStatusBadge` component
- [ ] Conflict error handling: show clear error when room already booked
- [ ] Cancel confirmation dialog with reason input

---

## Expected Deliverables

1. Reservation creation is atomic — double-booking impossible
2. Conflict error shown clearly when room unavailable
3. Full status lifecycle works (pending → confirmed → checked_in → checked_out)
4. Reservation list with filters works
5. Calendar view shows room occupancy at a glance
6. Audit log records every reservation action

---

## Validation Checklist

- [ ] Concurrent reservation requests for same room/dates — only one succeeds
- [ ] `check_out_date <= check_in_date` → `400` validation error
- [ ] Overlap detection: existing confirmed reservation blocks new one
- [ ] Cancelled reservations free the room for re-booking
- [ ] Status transition: `checked_out → confirmed` → `400 INVALID_TRANSITION`
- [ ] Price calculated correctly: nights × base_price
- [ ] Reservation list filtered correctly by all filter combinations
- [ ] Calendar renders correctly with multi-night reservations spanning cells
- [ ] Audit log has entry for every create/edit/cancel
- [ ] Branch isolation: user sees only their branch's reservations
- [ ] RTL layout correct (date picker, form, table)
- [ ] TypeScript strict — zero `any` in reservations module

---

## Exit Criteria

All of the following must be true before Phase 5 begins:

1. Overbooking prevention tested under concurrent load (at minimum: manual concurrent test)
2. Full reservation lifecycle (create → confirm → check-in → check-out → cancel) working
3. Reservation list, detail, and calendar pages functional
4. Guest + room selectors integrated
5. Audit logging for all reservation mutations
6. Integration tests: create, conflict prevention, status transitions, branch isolation
