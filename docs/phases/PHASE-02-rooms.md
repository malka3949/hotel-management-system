# Phase 2 — Rooms Module

## Purpose

Build the complete room inventory management system. Rooms are the core operational unit — every reservation, check-in, and housekeeping task references a room.

---

## Big Picture

Rooms belong to a branch. Each room has a type (single/double/suite), a price, and two status dimensions: **operational status** (available/occupied/maintenance) and **cleaning status** (clean/dirty/in-progress). Both statuses update in real time as guests check in/out and housekeeping works.

The room list is used directly by the reservation system (Phase 4), the availability engine (Phase 6), and the housekeeping module (Phase 8). Getting the data model right here prevents rework in those phases.

Architecture ref: ARCHITECTURE.md § 5.1 Core Domain Model (Rooms)

---

## Scope

### In Scope
- Room entity with all required fields
- Room types with associated base pricing
- Operational status management (available / occupied / maintenance / out-of-order)
- Cleaning status tracking (clean / dirty / in-progress)
- Full CRUD API for rooms (admin/manager only)
- Room list page with filters (type, status, floor)
- Room form (create/edit)
- Status badges (real-time visual indicators)
- Branch scoping — rooms isolated per branch

### Out of Scope
- Real-time WebSocket updates (Phase 6)
- Housekeeping task assignment (Phase 8)
- Pricing rules / dynamic pricing (future phase)
- Room images/media uploads

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Branch isolation | Every room query filtered by `branch_id` from JWT |
| Status updates | Atomic — use DB transactions |
| Soft delete | Rooms are deactivated, not deleted (reservations reference them) |
| Permissions | Create/update/delete: manager+ only; read: all staff |

---

## Database Schema

### `room_types`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| name | varchar(100) | e.g. "Standard Double" |
| base_price | decimal(10,2) | per night |
| max_occupancy | int | |
| description | text | nullable |
| created_at | timestamp | |

### `rooms`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| room_type_id | uuid | FK → room_types |
| number | varchar(20) | e.g. "101", "204A" |
| floor | int | nullable |
| status | enum | available, occupied, maintenance, out_of_order |
| cleaning_status | enum | clean, dirty, in_progress |
| notes | text | internal notes, nullable |
| is_active | boolean | soft delete |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes:** `(branch_id, status)`, `(branch_id, room_type_id)`, `(branch_id, number)` unique

---

## Tasks

### Backend
- [ ] Create `RoomsModule` with `RoomsService`, `RoomsController`, `RoomsRepository`
- [ ] Create `RoomTypesModule`
- [ ] `GET /api/v1/rooms` — list rooms with filters (status, type, floor)
- [ ] `GET /api/v1/rooms/:id` — single room detail
- [ ] `POST /api/v1/rooms` — create room (manager+)
- [ ] `PATCH /api/v1/rooms/:id` — update room (manager+)
- [ ] `PATCH /api/v1/rooms/:id/status` — update operational status
- [ ] `PATCH /api/v1/rooms/:id/cleaning-status` — update cleaning status
- [ ] `DELETE /api/v1/rooms/:id` — soft delete (manager+)
- [ ] `GET /api/v1/room-types` — list types for branch
- [ ] `POST /api/v1/room-types` — create type (manager+)
- [ ] All routes enforce branch scope from JWT
- [ ] Input validation via `class-validator` DTOs

### Frontend
- [ ] `/rooms` — room list page (table view)
  - Columns: number, floor, type, status badge, cleaning status badge, price/night, actions
  - Filters: status, room type, floor
  - Search by room number
- [ ] `RoomStatusBadge` component (color-coded per design system)
- [ ] `CleaningStatusBadge` component
- [ ] `/rooms/new` — create room form
- [ ] `/rooms/:id/edit` — edit room form
- [ ] Status update dropdown (inline in table)
- [ ] Confirm dialog for status changes
- [ ] Toast notifications for success/error

---

## Expected Deliverables

1. Branch-scoped room list renders with all status indicators
2. Manager can create/edit/deactivate rooms
3. Any staff member can view room list and current statuses
4. Status update (operational + cleaning) works inline
5. Room type management works for managers

---

## Validation Checklist

- [ ] Room list only shows rooms for the user's branch
- [ ] `chain_admin` can see rooms for any branch (via query param `branchId`)
- [ ] Create room with duplicate number in same branch → `409 Conflict`
- [ ] Deactivated room does not appear in active listings
- [ ] Status change is atomic (no partial updates)
- [ ] Manager role required for create/edit/delete — receptionist gets `403`
- [ ] Status badges match design system colors exactly
- [ ] Filters work correctly (status, type, floor)
- [ ] RTL layout correct on all room pages
- [ ] TypeScript strict — zero `any` in rooms module

---

## Exit Criteria

All of the following must be true before Phase 3 begins:

1. Full room CRUD operational and branch-scoped
2. Both status types (operational + cleaning) can be updated
3. Room type management works
4. Role-based access enforced (manager vs. receptionist)
5. Frontend list + form pages functional and RTL-correct
6. Integration tests cover: create, list with filters, status update, branch isolation
