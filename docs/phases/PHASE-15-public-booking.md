# Phase 15 — Public Booking Portal

## Status: 🟡 In Progress

## Overview

Adds a public-facing booking website per branch. Guests can browse rooms, check availability, and book directly — without going through reception. Payment is deferred (reserve now, pay via portal link or at check-in).

---

## Flow

```
guest → /book/[branchId]           browse branch + pick dates
       → /book/[branchId]/rooms    room type cards + availability
       → /book/[branchId]/checkout fill name/email/phone
       → POST /api/v1/public/...   reservation created, portal link emailed
       → /book/[branchId]/confirmation  success page
```

---

## Backend

### New: PublicBookingModule (`backend/src/modules/public-booking/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/public/branches/:id` | None | Branch name, address, description, coverPhoto |
| GET | `/api/v1/public/branches/:id/room-types` | None | Room types with photos, amenities, price |
| GET | `/api/v1/public/branches/:id/availability` | None | Available rooms for date range |
| POST | `/api/v1/public/branches/:id/reservations` | None (rate-limited) | Create reservation + send portal link |

### New: UploadsModule (`backend/src/modules/uploads/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/admin/uploads/photo` | manager+ | Upload image, returns `/uploads/filename` URL |

Files stored at `backend/public/` (served as static assets via Express).

### Schema additions (migration `20260714000015_phase15_public_booking`)

```sql
ALTER TABLE branches ADD COLUMN description TEXT;
ALTER TABLE branches ADD COLUMN cover_photo VARCHAR(2048);
ALTER TABLE room_types ADD COLUMN photos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE room_types ADD COLUMN amenities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE reservations ALTER COLUMN created_by DROP NOT NULL;
```

### Schema additions (migration `20260714000016_phase15_guest_enhancements`)

```sql
ALTER TABLE room_types ADD COLUMN bed_type VARCHAR(50);
ALTER TABLE room_types ADD COLUMN room_size INTEGER;
ALTER TABLE branches ADD COLUMN amenities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE branches ADD COLUMN cancellation_policy TEXT;
```

---

## Frontend

### New route group: `app/(booking)/`

| Page | Path | Description |
|---|---|---|
| Layout | `(booking)/layout.tsx` | Clean public header, no sidebar |
| Landing | `book/[branchId]/page.tsx` | Hero, date picker, CTA |
| Rooms | `book/[branchId]/rooms/page.tsx` | Room type cards + availability |
| Checkout | `book/[branchId]/checkout/page.tsx` | Guest form + summary |
| Confirmation | `book/[branchId]/confirmation/page.tsx` | Success + "check email" |

### New API client: `lib/api/public-booking.ts`

Plain `fetch` (no JWT/CSRF) — public endpoints.

### Staff admin additions

- Room types page: photos (URL paste + file upload) + amenities tags + `bedType` select + `roomSize` number input
- Branches page: `description` textarea + `coverPhoto` URL/upload + amenities tags + `cancellationPolicy` textarea

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| No guest login | Reduces friction; existing tokenized portal (Phase 8) handles post-booking |
| Pay later | No Stripe integration required; guest pays via portal or at check-in |
| Photos as URL strings + file upload | Dual mode — URL for external links, file upload stored locally (swap to S3 in production) |
| `created_by` nullable | Public reservations have no staff creator |
| Per-branch URL | Matches existing branch isolation architecture |

---

## Guest Experience Enhancements (Extension)

### Public booking portal — guest-facing additions

| Feature | Location | Details |
|---|---|---|
| Photo gallery | `rooms/page.tsx` | ← → arrows + dot indicators; per-card state |
| Bed type badge | `rooms/page.tsx` | 🛏 badge (בודד/זוגית/טווין/קינג/שתי מיטות) |
| Room size badge | `rooms/page.tsx` | 📐 Xמ״ר badge |
| Urgency indicator | `rooms/page.tsx` | ⚡ "נותרו X חדרים בלבד!" when ≤3 available |
| Google Maps link | `book/[branchId]/page.tsx` | Address links to `maps.google.com/?q=...` |
| Branch amenities | `book/[branchId]/page.tsx` | ✓ badges below description |
| Cancellation policy | `book/[branchId]/page.tsx` | Amber box with 🔄 icon |
| Room thumbnail | `confirmation/page.tsx` | 80×80 rounded image at top of summary card |

### Admin additions

| Feature | Location |
|---|---|
| Bed type select | `room-types/page.tsx` create + edit forms |
| Room size input | `room-types/page.tsx` create + edit forms |
| Branch amenities tags | `admin/branches/page.tsx` create + edit forms |
| Cancellation policy textarea | `admin/branches/page.tsx` create + edit forms |

---

## Exit Criteria

- [ ] `GET /api/v1/public/branches/:id` returns branch info (including amenities, cancellationPolicy)
- [ ] Room types with photos/amenities/bedType/roomSize visible on public page
- [ ] Date picker → room grid (gallery + badges + urgency) → checkout → confirmation (thumbnail) flow works
- [ ] Reservation appears in staff dashboard with `source: website`
- [ ] Guest receives portal link email
- [ ] Photo upload works (file upload + URL paste)
- [ ] Rate limit: 11th POST in 60s → 429
- [ ] TypeScript strict — zero errors (backend + frontend)
- [ ] Lint — zero violations
