# dev-phase8.md — Phase 8: Guest Portal

## Phase Identifier
Phase 8 — Guest Portal

## Status
STATUS: COMPLETE

## Source References
- `docs/phases/PHASE-08-guest-portal.md`
- `CLAUDE/invariants.md` (guest portal section)

## Implementation Summary
Tokenized guest self-service portal. Guests access reservations, complete online check-in, pay invoices, and download PDFs — via a single SHA-256-hashed random token sent by email on reservation creation. No guest login required. `GuestTokenGuard` enforces separate trust boundary from staff JWT.

Also fixed Phase 7 regression: Prisma schema was missing Phase 7 billing models (Payment, Charge, Refund, etc.) and `BillingModule` was not registered in `AppModule`. Both corrected here.

## Implemented Milestones

| Milestone | Completed | Notes |
|---|---:|---|
| Phase 7 schema fix: billing models in schema.prisma | Yes | Payment, PaymentAttempt, Charge, Refund + enums |
| Phase 7 fix: BillingModule registered in AppModule | Yes | Also exports PaymentService, InvoicePdfService |
| Prisma migration 20260630000007_phase8_guest_portal | Yes | guest_access_tokens, online_check_ins; payments.created_by nullable |
| GuestPortalModule: service, controller, guards, DTOs | Yes | |
| GuestTokenGuard + GuestPaymentTokenGuard | Yes | Hash-based; payment guard enforces single-use |
| Token generated + email sent on reservation creation | Yes | Wired into ReservationsService.create |
| GET /portal/reservation/:token | Yes | Returns full reservation detail |
| GET /portal/reservation/:token/invoice | Yes | Invoice + line items + payments |
| GET /portal/reservation/:token/invoice/pdf | Yes | Streams PDF via InvoicePdfService |
| POST /portal/reservation/:token/check-in | Yes | Creates/updates OnlineCheckIn, updates Guest profile |
| POST /portal/reservation/:token/payment | Yes | Single-use token; delegates payment via Prisma (portal path) |
| GET /portal/tokens/:reservationId (manager) | Yes | Lists active non-revoked tokens |
| POST /portal/tokens/:reservationId/revoke (manager) | Yes | Sets revokedAt on all tokens |
| Frontend: portal layout (existing) | Yes | No sidebar/topbar |
| Frontend: /portal/[token] — landing page | Yes | Reservation card + action buttons |
| Frontend: /portal/[token]/check-in — form | Yes | Pre-filled, window-check, Hebrew RTL |
| Frontend: /portal/[token]/payment — payment page | Yes | Invoice summary + form |
| Frontend: /portal/[token]/confirmation | Yes | Post-action confirmation |
| Frontend: /portal/expired | Yes | Invalid/expired token page |
| Staff: online check-in badge in reservation detail | Yes | Badge + estimated arrival time |
| E2E tests: 12/12 PASS | Yes | guest-portal.e2e-spec.ts |

## Files Changed

### Backend — New
- `backend/prisma/migrations/20260630000007_phase8_guest_portal/migration.sql`
- `backend/src/modules/guest-portal/guest-portal.module.ts`
- `backend/src/modules/guest-portal/guest-portal.service.ts`
- `backend/src/modules/guest-portal/guest-portal.controller.ts`
- `backend/src/modules/guest-portal/guards/guest-token.guard.ts`
- `backend/src/modules/guest-portal/interfaces/guest-token-payload.interface.ts`
- `backend/src/modules/guest-portal/dto/online-check-in.dto.ts`
- `backend/src/modules/guest-portal/dto/portal-payment.dto.ts`
- `backend/test/guest-portal.e2e-spec.ts`
- `backend/jest-e2e-local.config.ts`
- `backend/test/jest-e2e-local.setup.ts`

### Backend — Modified
- `backend/prisma/schema.prisma` — added Phase 7 billing models + Phase 8 portal models; Payment.createdBy nullable
- `backend/src/app.module.ts` — registered BillingModule + GuestPortalModule
- `backend/src/modules/billing/billing.module.ts` — exports PaymentService, InvoicePdfService
- `backend/src/modules/reservations/reservations.module.ts` — imports GuestPortalModule
- `backend/src/modules/reservations/reservations.service.ts` — injects GuestPortalService; calls generateAndSendPortalLink after reservation create; adds onlineCheckIn + checkIn to RESERVATION_INCLUDE

### Frontend — New
- `frontend/lib/api/portal.ts`
- `frontend/app/(portal)/[token]/page.tsx`
- `frontend/app/(portal)/[token]/check-in/page.tsx`
- `frontend/app/(portal)/[token]/payment/page.tsx`
- `frontend/app/(portal)/[token]/confirmation/page.tsx`
- `frontend/app/(portal)/expired/page.tsx`

### Frontend — Modified
- `frontend/lib/api/reservations.ts` — added `onlineCheckIn` to Reservation interface
- `frontend/app/(dashboard)/reservations/[id]/page.tsx` — online check-in badge + estimated arrival time

## Dependencies Installed

| Dependency / Tool | Command Used | Reason |
|---|---|---|
| None new | — | Phase 8 uses only Node.js built-ins (crypto) |

## Unit Tests

| Field | Value |
|---|---|
| Command | `npx jest --config jest-e2e-local.config.ts --testPathPattern=guest-portal --runInBand --forceExit` |
| Result | PASS |
| Notes | 12/12 tests passing (146s). Covers: valid token access, expired token 401, invalid token 401, online check-in creation, invoice retrieval, PDF streaming, portal payment succeeds + invoice marked paid, single-use payment enforcement (403 on second use), already-paid invoice rejection, manager token listing, manager token revocation, audit log entries |

## Lint

| Field | Value |
|---|---|
| Command | `npx eslint src/modules/guest-portal/ --max-warnings=0` |
| Result | PASS — 0 errors, 0 warnings |
| Notes | Also verified: billing module lint 0 errors |

## Functional Testability Evidence

| Field | Value |
|---|---|
| Method | E2E API test suite + backend TS compile |
| Steps | 1. Create reservation → portal link emailed (stub logs). 2. Token hash stored in guest_access_tokens. 3. GET /portal/reservation/:token → reservation detail. 4. POST /portal/reservation/:token/check-in → online_check_ins record created. 5. POST /portal/reservation/:token/payment → invoice.status = 'paid', token.used_at set. 6. Second payment attempt with used token → 403. 7. Manager: GET/POST /portal/tokens/:reservationId |
| Expected Result | All 12 e2e scenarios pass |
| Actual Result | PASS — 12/12 |
| Notes | Frontend TS: 0 errors. Backend TS: 0 errors. ESLint: 0 errors. |

## Documentation Update Evidence

| Field | Value |
|---|---|
| Documentation Updated | YES |
| Files Updated | PROJECT_STATUS.md, PROGRESS.txt |
| Reason if Not Required | — |

## Known Issues / Limitations

- Stripe Elements not integrated on payment page (manual/cash payment only via portal for now)
- Portal throttling (20 req/min per IP) configured via `@Throttle` decorator but not tested in e2e (would require 21 sequential requests)
- `jest-e2e-local.config.ts` added for running e2e tests without Docker; the standard `npm run test:e2e` still expects Docker DB at `postgres:5432`

## Scope Compliance
All deliverables from `docs/phases/PHASE-08-guest-portal.md` implemented. No Phase 9 features included.

## Developer Declaration
Phase 8 PASS — 12/12 e2e tests passing, 0 ESLint errors, 0 frontend TS errors, 0 backend TS errors.
