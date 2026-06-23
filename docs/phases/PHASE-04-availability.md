# Phase 6 — Availability Engine

## Purpose

Build a dedicated, high-performance availability engine that serves as the single source of truth for room availability. Strengthen the overbooking prevention from Phase 4 and add real-time availability feeds.

---

## Big Picture

Phase 4 built basic availability checking inside the reservation creation flow. Phase 6 extracts this into a standalone, tested, optimized engine that can:
1. Answer "which rooms are available for dates X–Y?" in < 200ms
2. Power the reservation form's room selector
3. Power the dashboard's occupancy view
4. Be the single, trusted source for any future OTA integrations

The availability engine also introduces WebSocket-based real-time updates so that front desk staff see room status changes without refreshing the page.

Architecture ref: ARCHITECTURE.md § 8 Real-Time Requirements, § 6 Reservation Integrity Rules

---

## Scope

### In Scope
- `AvailabilityService` as a standalone reusable service
- `isRoomAvailable(roomId, checkIn, checkOut)` — single room check
- `getAvailableRooms(branchId, checkIn, checkOut, filters)` — bulk query
- Overlap detection algorithm (handles partial overlaps, boundary cases)
- Redis caching for availability results (TTL: 30 seconds, invalidated on reservation change)
- WebSocket gateway for real-time room status push to connected clients
- Availability endpoint for the reservation form
- Occupancy summary endpoint (used by dashboard in Phase 7)

### Out of Scope
- External channel availability sync (OTA — future phase)
- Dynamic pricing based on availability (future phase)
- Forecasting / availability trends (future phase)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Query performance | `getAvailableRooms` must return in < 200ms for 500 rooms |
| Caching | Redis cache with 30s TTL; invalidated on: reservation create/edit/cancel/checkin/checkout |
| WebSocket | `@nestjs/websockets` + `socket.io` |
| Overlap formula | `existing.check_in < new.check_out AND existing.check_out > new.check_in` |
| Locking | `SELECT FOR UPDATE` retained for reservation creation (from Phase 4) |
| Cache key | `availability:{branchId}:{checkIn}:{checkOut}:{roomTypeId?}` |

---

## Overlap Detection Logic

```
Room is UNAVAILABLE if any ACTIVE reservation exists where:
  reservation.check_in_date  < requested.check_out_date
  AND
  reservation.check_out_date > requested.check_in_date
  AND
  reservation.status NOT IN ('cancelled', 'no_show')
```

Boundary case: check-out on day X allows check-in on day X (same day turnover).

---

## Tasks

### Backend
- [ ] Create `AvailabilityModule` with `AvailabilityService`
- [ ] `isRoomAvailable(roomId, checkIn, checkOut): Promise<boolean>`
- [ ] `getAvailableRooms(branchId, checkIn, checkOut, filters): Promise<Room[]>`
  - Filters: roomTypeId, maxOccupancy, floor
- [ ] `getOccupancySummary(branchId, date): Promise<OccupancySummary>`
  - Returns: total rooms, occupied, available, dirty, maintenance
- [ ] `GET /api/v1/availability` — query params: `branchId`, `checkIn`, `checkOut`, `roomTypeId`
- [ ] `GET /api/v1/availability/summary` — occupancy snapshot for a date
- [ ] Redis integration: cache availability responses
- [ ] Cache invalidation: hook into reservation and check-in/out events
- [ ] WebSocket gateway (`RoomStatusGateway`)
  - Event: `room:status:updated` — emits `{ roomId, status, cleaningStatus }`
  - Event: `reservation:created` — emits new reservation summary
  - Authentication: JWT validation on WebSocket connection
- [ ] Concurrency stress test: verify `SELECT FOR UPDATE` holds under parallel requests

### Frontend
- [ ] Upgrade reservation form room selector to use availability endpoint
  - Shows only available rooms for selected dates
  - Refreshes when dates change
  - Shows "no rooms available" state
- [ ] Room status board page (`/rooms/status-board`)
  - Visual grid: rooms × statuses
  - Real-time updates via WebSocket (no page refresh needed)
  - Color-coded cells matching design system badges
- [ ] WebSocket client setup (`src/lib/socket.ts`)
  - Auto-reconnect on disconnect
  - Toast notification on room status change (optional)
- [ ] Occupancy summary widget (used in dashboard Phase 7 — built here as reusable component)

---

## Expected Deliverables

1. `getAvailableRooms` returns accurate results in < 200ms for 500 rooms
2. Double-booking impossible even under concurrent requests (load tested)
3. Redis cache reduces DB load for repeated availability queries
4. Room status board updates in real time without refresh
5. Reservation form only shows available rooms for selected dates

---

## Validation Checklist

- [ ] `isRoomAvailable` returns `false` for overlapping confirmed reservations
- [ ] `isRoomAvailable` returns `true` when check-out date matches new check-in date (same-day)
- [ ] `getAvailableRooms` excludes rooms in `maintenance` and `out_of_order` status
- [ ] Cache invalidated when reservation is created/cancelled
- [ ] WebSocket emits `room:status:updated` within 1 second of status change
- [ ] WebSocket connection rejected without valid JWT
- [ ] Concurrent reservation test: 10 simultaneous requests → exactly 1 succeeds
- [ ] Availability query response < 200ms (measure with timing middleware)
- [ ] Room status board updates in real time in browser
- [ ] TypeScript strict — zero `any` in availability module

---

## Exit Criteria

All of the following must be true before Phase 7 begins:

1. Availability engine returns accurate results — tested against edge cases (boundaries, overlaps)
2. Concurrent overbooking impossible — proven by concurrent test
3. Redis caching working and invalidating correctly
4. WebSocket real-time updates functional in browser
5. Room status board live
6. Integration tests: overlap cases, boundary dates, concurrency, cache invalidation
