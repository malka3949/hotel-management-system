# Phase 5 — Check-in / Check-out

## Purpose

Implement the front desk operational workflows: guest check-in and check-out. These are the highest-frequency operations performed by receptionists. Speed and clarity are critical.

---

## Big Picture

Check-in transitions a confirmed reservation into active occupancy. It updates the room to "occupied", records the actual arrival time, and triggers invoice initialization. Check-out finalizes the stay — room goes back to "dirty" (housekeeping queue), the final invoice is generated, and payment is confirmed (basic billing in this phase; full payment integration in ARCH Phase 3).

These workflows drive the real-time room status board that managers monitor throughout the day.

Architecture ref: ARCHITECTURE.md § 9.5 Front Desk Operations, § 5.1 (CheckIn, CheckOut entities)

---

## Scope

### In Scope
- Check-in endpoint: validates reservation, updates room status, records timestamp
- Check-out endpoint: marks reservation complete, sets room to dirty, calculates final total
- Active guests view (currently checked-in guests)
- Check-in form with identity verification step (confirm passport ID)
- Check-out summary screen with total charges
- Basic invoice generation (line items + total) — PDF generation optional
- Room status automatically updated on both operations
- Audit log for every check-in/check-out

### Out of Scope
- Payment processing / POS integration (ARCH Phase 3 — Billing)
- Pre-arrival payments
- Early check-in / late check-out charges
- Online check-in via guest portal (ARCH Phase 4)
- Housekeeping task auto-assignment (Phase 8)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Check-in guard | Reservation must be in `confirmed` status |
| Check-out guard | Reservation must be in `checked_in` status |
| Atomicity | Room status + reservation status updated in single transaction |
| Invoice init | Invoice record created at check-in (status: open) |
| Invoice finalize | Invoice updated at check-out (status: pending_payment) |
| Audit trail | check-in and check-out events in `audit_logs` |

---

## Database Schema

### `check_ins`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations, unique |
| branch_id | uuid | FK → branches |
| actual_check_in_at | timestamp | |
| checked_in_by | uuid | FK → users |
| notes | text | nullable |

### `check_outs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations, unique |
| branch_id | uuid | FK → branches |
| actual_check_out_at | timestamp | |
| checked_out_by | uuid | FK → users |
| notes | text | nullable |

### `invoices`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations |
| branch_id | uuid | FK → branches |
| guest_id | uuid | FK → guests |
| status | enum | open, pending_payment, paid, cancelled |
| subtotal | decimal(10,2) | |
| tax | decimal(10,2) | |
| total | decimal(10,2) | |
| issued_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

### `invoice_line_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| invoice_id | uuid | FK → invoices |
| description | varchar(255) | |
| quantity | int | |
| unit_price | decimal(10,2) | |
| total | decimal(10,2) | |
| item_type | enum | room_charge, service, fee, discount |

---

## Tasks

### Backend
- [ ] Create `CheckInModule` with `CheckInService`, `CheckInController`
- [ ] `POST /api/v1/reservations/:id/check-in`
  - Validates reservation status = `confirmed`
  - Updates reservation status → `checked_in`
  - Updates room status → `occupied`
  - Creates `check_ins` record
  - Initializes invoice with room charge line items
  - Audit log entry
- [ ] `POST /api/v1/reservations/:id/check-out`
  - Validates reservation status = `checked_in`
  - Updates reservation status → `checked_out`
  - Updates room status → `dirty`
  - Creates `check_outs` record
  - Finalizes invoice (status → `pending_payment`)
  - Audit log entry
- [ ] `GET /api/v1/front-desk/active-guests` — all currently checked-in reservations
- [ ] `GET /api/v1/invoices/:id` — invoice detail with line items
- [ ] `GET /api/v1/reservations/:id/invoice` — invoice for a reservation
- [ ] Invoice service: calculates room charges (nights × rate)
- [ ] All operations branch-scoped

### Frontend
- [ ] `/front-desk` — front desk operations hub
  - Active guests panel (checked-in reservations)
  - Arrivals today panel (confirmed reservations with today's check-in date)
  - Departures today panel (checked-in reservations with today's check-out date)
- [ ] Check-in flow:
  - Step 1: Find reservation (search by guest name or reservation ID)
  - Step 2: Confirm guest identity (show passport ID field to verify)
  - Step 3: Confirm check-in → POST to API
  - Step 4: Show success screen with room number
- [ ] Check-out flow:
  - Step 1: Find active reservation
  - Step 2: Show invoice summary (line items + total)
  - Step 3: Confirm check-out → POST to API
  - Step 4: Show completed invoice
- [ ] `InvoiceSummary` component — line items table + totals
- [ ] Quick-action buttons: Check-in / Check-out (prominent, large — front desk ergonomics)
- [ ] Toast confirmations with room number on success

---

## Expected Deliverables

1. Front desk hub page showing today's arrivals, departures, and active guests
2. Check-in flow completes in ≤ 3 steps
3. Check-out flow shows full invoice before confirming
4. Room status updates instantly on both operations
5. Invoice created and finalizable
6. Audit trail for every check-in/check-out

---

## Validation Checklist

- [ ] Check-in on `pending` reservation → `400 INVALID_STATUS`
- [ ] Check-in on already `checked_in` reservation → `409`
- [ ] Check-in updates room status to `occupied`
- [ ] Check-out on `confirmed` (not checked-in) → `400 INVALID_STATUS`
- [ ] Check-out updates room status to `dirty`
- [ ] Invoice created at check-in with correct room charge line items
- [ ] Invoice total correct: nights × nightly rate + tax
- [ ] Active guests list shows only currently checked-in guests
- [ ] Today's arrivals/departures panels accurate
- [ ] Audit log has entry for every check-in and check-out
- [ ] Branch isolation: front desk sees only their branch
- [ ] RTL layout correct on front desk pages
- [ ] TypeScript strict — zero `any`

---

## Exit Criteria

All of the following must be true before Phase 6 begins:

1. Check-in and check-out complete successfully end-to-end
2. Room status updates atomically on both operations
3. Invoice initializes at check-in and finalizes at check-out
4. Front desk hub shows accurate today's arrivals/departures/active guests
5. Audit logs complete for all front desk operations
6. Integration tests: check-in happy path, check-out happy path, invalid status transitions
