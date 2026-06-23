# Phase 8 — Guest Portal

## Purpose

Build the guest-facing self-service portal. Guests access their reservations, complete online check-in, make payments, and download invoices — without front desk assistance. This is explicitly MVP scope (PRD §7, §9.7).

---

## Big Picture

The guest portal is a separate surface from the internal staff application. Guests don't have employee accounts — they access their reservation via a secure, time-limited tokenized link (sent by email after reservation creation). This eliminates a login system for guests while keeping the experience secure.

The portal reduces front desk workload: guests who complete online check-in arrive fully processed — the front desk only needs to hand over the room key.

Architecture ref: ARCHITECTURE.md §10 Guest Portal Architecture, §3.1 Guest Portal Service, PRD §9.7, PRD §3.5 Guests persona

---

## Scope

### In Scope
- Tokenized reservation access link (no guest login required)
- Link generation + email delivery on reservation creation
- Link expiry: 24 hours after expected check-out date
- Guest reservation view (dates, room type, total, status)
- Online check-in flow (complete identity info before arrival)
- Online payment (pay invoice balance via portal)
- Invoice download (PDF)
- Reservation confirmation page
- Guest portal is publicly accessible (no staff JWT required)
- Rate limiting on all portal endpoints

### Out of Scope
- Guest account/login system (future phase)
- Reservation modifications by guest (future phase)
- Guest messaging / chat (future phase)
- Mobile app (future phase)
- Loyalty program (future phase)
- Multi-language (future phase — Hebrew only for MVP)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Access token | Signed JWT with `reservationId`, `guestId`, `exp` (24h after check-out) |
| Token delivery | Email sent on reservation confirmation (via NotificationService) |
| Token scope | Guest can ONLY access their own reservation — enforced server-side |
| Portal isolation | Guest portal routes use `GuestTokenGuard` (not `JwtAuthGuard`) |
| Rate limiting | 20 req/min per IP on all portal endpoints |
| HTTPS required | No portal access over HTTP |
| Online check-in window | Opens 24h before check-in, closes at actual check-in time |
| Expiring links | One-time use for payment; multi-use for viewing |

---

## Database Schema

### `guest_access_tokens`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations |
| guest_id | uuid | FK → guests |
| token_hash | varchar | hashed token |
| purpose | enum | view, checkin, payment |
| expires_at | timestamp | |
| used_at | timestamp | nullable (for one-time tokens) |
| created_at | timestamp | |

### `online_check_ins`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations, unique |
| guest_id | uuid | FK → guests |
| full_name | varchar(255) | confirmed at portal |
| passport_id | varchar(50) | confirmed at portal |
| email | varchar(255) | |
| phone | varchar(30) | |
| estimated_arrival_time | time | nullable |
| special_requests | text | nullable |
| completed_at | timestamp | |

---

## Tasks

### Backend
- [ ] Create `GuestPortalModule` with `GuestPortalService`, `GuestPortalController`
- [ ] `GuestTokenGuard` — validates guest access token (different from `JwtAuthGuard`)
- [ ] Token generation service: `generateGuestToken(reservationId, guestId, purpose)`
- [ ] Token validation: checks hash, expiry, scope
- [ ] Wire token generation into `NotificationService`: send portal link on reservation confirmation

**Guest Portal Endpoints (prefix: `/api/v1/portal/`)**
- [ ] `GET /api/v1/portal/reservation/:token` — view reservation details
  - Returns: dates, room type, guest name, status, invoice summary
  - Validates token scope = `view`
- [ ] `GET /api/v1/portal/reservation/:token/invoice` — invoice detail + PDF link
- [ ] `GET /api/v1/portal/reservation/:token/invoice/pdf` — invoice PDF stream
- [ ] `POST /api/v1/portal/reservation/:token/check-in` — submit online check-in
  - Validates: check-in window open (24h before arrival)
  - Creates `online_check_ins` record
  - Updates guest profile fields if changed
  - Returns confirmation
- [ ] `POST /api/v1/portal/reservation/:token/payment` — process payment via portal
  - Validates token scope = `payment`
  - Delegates to `PaymentService` (same provider abstraction as Phase 7)
  - Token is single-use for payment
- [ ] `POST /api/v1/portal/reservation/:token/resend-link` — resend portal email (rate-limited)

### Frontend — Guest Portal (separate layout, no sidebar/topbar)
- [ ] `app/(portal)/` route group — public layout (no staff navigation)
- [ ] `/portal/:token` — reservation landing page
  - Hotel logo + branch name
  - Reservation card: guest name, room type, dates, status badge
  - Action buttons: Online Check-in / Pay Now / Download Invoice
- [ ] `/portal/:token/check-in` — online check-in form
  - Pre-filled from existing guest profile
  - Fields: full name, passport ID, phone, email, estimated arrival time, special requests
  - Submit → confirmation screen
  - Window check: if too early or too late → show informational message
- [ ] `/portal/:token/payment` — payment page
  - Invoice line items + remaining balance
  - Stripe Elements payment form
  - Success → redirect to confirmation
- [ ] `/portal/:token/confirmation` — post-action confirmation screen
  - "Check-in complete" or "Payment received"
  - Link to download invoice
- [ ] `/portal/expired` — expired/invalid token page
- [ ] Portal pages must work without staff login — public routes

### Internal Staff Integration
- [ ] Front desk can see online check-in status on arrival card
- [ ] Front desk check-in flow: if `online_check_ins` record exists → skip identity step, show "pre-checked-in" badge
- [ ] Admin/manager: `GET /api/v1/portal/tokens/:reservationId` — list active tokens (for support)
- [ ] Admin: `POST /api/v1/portal/tokens/:reservationId/revoke` — revoke all tokens

---

## Expected Deliverables

1. Portal link emailed to guest on reservation confirmation
2. Guest views reservation details via tokenized link (no login)
3. Online check-in form submittable 24h before arrival
4. Guest can pay invoice balance via portal (Stripe)
5. Invoice PDF downloadable from portal
6. Front desk sees online check-in status on arrivals list
7. Expired/invalid token shows clear error page

---

## Validation Checklist

- [ ] Token generated and emailed on reservation confirmation
- [ ] Valid token → reservation details displayed correctly
- [ ] Expired token (past check-out + 24h) → `401 TOKEN_EXPIRED`
- [ ] Token for reservation B cannot access reservation A → `403`
- [ ] Online check-in: too early (> 24h before check-in) → blocked with message
- [ ] Online check-in: after actual check-in already completed → blocked with message
- [ ] Online check-in: `online_check_ins` record created, guest profile updated
- [ ] Front desk arrivals list shows "pre-checked-in" badge for portal check-ins
- [ ] Portal payment: successful charge → invoice marked paid
- [ ] Payment token single-use: second payment attempt returns `400 TOKEN_USED`
- [ ] Rate limit: 21st portal request per minute per IP → `429`
- [ ] Portal pages load without staff JWT (public routes)
- [ ] Portal layout has no sidebar/topbar (separate layout from staff app)
- [ ] Invoice PDF accessible from portal for guest's own reservation only
- [ ] TypeScript strict — zero `any` in portal module

---

## Exit Criteria

All of the following must be true before Phase 9 (Housekeeping) begins:

1. Tokenized guest access works end-to-end (email → view → check-in → payment)
2. Online check-in visible to front desk on arrivals list
3. Guest payment via portal functional
4. Token security validated: expiry, scope isolation, rate limiting
5. Invoice PDF accessible from portal
6. Integration tests: token generation, expiry, scope isolation, online check-in, portal payment
