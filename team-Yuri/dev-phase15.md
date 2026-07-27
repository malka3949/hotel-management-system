# dev-phase15.md — Public Booking Portal

## Phase Identifier
Phase 15 — Public Booking Portal

## Implementation Summary
Added a public-facing booking portal per branch (`/book/:branchId`). Guests browse rooms, check availability, and book directly without staff involvement. Admin forms extended with photos, amenities, bed type, room size, and cancellation policy.

## Files Changed

### Backend
- `src/modules/public-booking/` — PublicBookingModule (controller + service + DTOs)
- `src/modules/uploads/` — UploadsModule (photo upload to `backend/public/`)
- `prisma/schema.prisma` — branches.description, branches.cover_photo, branches.amenities, branches.cancellation_policy, room_types.photos, room_types.amenities, room_types.bed_type, room_types.room_size; reservations.created_by nullable
- `prisma/migrations/20260714000015_phase15_public_booking/`
- `prisma/migrations/20260714000016_phase15_guest_enhancements/`
- `src/app.module.ts` — PublicBookingModule, UploadsModule imported

### Frontend
- `app/(booking)/layout.tsx` — clean public header
- `app/(booking)/book/[branchId]/page.tsx` — landing: hero, date picker, branch info, amenities, Google Maps link, cancellation policy
- `app/(booking)/book/[branchId]/rooms/page.tsx` — room type cards with gallery, bed type badge, room size badge, urgency indicator (≤3 rooms)
- `app/(booking)/book/[branchId]/checkout/page.tsx` — guest form + booking summary
- `app/(booking)/book/[branchId]/confirmation/page.tsx` — success + portal link info
- `lib/api/public-booking.ts` — plain fetch client (no JWT/CSRF)
- `app/(dashboard)/room-types/page.tsx` — added bed type, room size, photos, amenities fields
- `app/(dashboard)/admin/branches/page.tsx` (checkout) — added amenities, cancellation policy, cover photo, description fields

## Dependencies
None new (existing NestJS multipart support via `@nestjs/platform-express`).

## Unit Test Command / Result
Unit tests: NOT AVAILABLE — backend e2e tests require live PostgreSQL.
Frontend typecheck: `npx tsc --noEmit` → PASS (0 errors)
Backend typecheck: `npx tsc --noEmit` → PASS (0 errors)

## Lint Command / Result
Frontend: `npx eslint . --ext .ts,.tsx --max-warnings 0` → PASS (0 violations)
Backend: `npx eslint "src/**/*.ts" --max-warnings 0` → PASS (0 violations)

## Functional Testability Evidence
- Navigate to `/book/:branchId` → landing page with dates
- Select dates → `/book/:branchId/rooms` → room cards with gallery
- Fill checkout form → `POST /api/v1/public/branches/:id/reservations`
- Reservation appears in staff dashboard with `source: website`
- Rate limit: 11th POST in 60s → 429
- Photo upload: `POST /api/v1/admin/uploads/photo` → returns URL

## Known Issues / Limitations
- Photos stored locally (`backend/public/`) — swap to S3/CDN in production
- Email (portal link) requires RESEND_API_KEY env var; if absent, email silently skipped
- No guest login — existing tokenized portal (Phase 8) handles post-booking management

## Scope Compliance
All items from PHASE-15-public-booking.md implemented including Guest Experience Enhancements extension (gallery, badges, urgency, Google Maps, branch amenities, cancellation policy, confirmation thumbnail).

## Developer Declaration
Phase 15 implementation complete. TypeScript PASS (0 errors), ESLint PASS (0 violations). Public booking flow end-to-end functional.
