# Phase 7 — Billing & Payments

## Purpose

Build the complete financial operations layer: payment processing, POS integration, pre-payments, service charges, refunds, and payment reconciliation. This phase closes the gap between invoice generation (Phase 6) and actual money movement.

---

## Big Picture

Phase 6 initializes invoices at check-in and finalizes them at check-out. Phase 7 makes those invoices payable — connecting to a payment provider (Stripe or Tranzila), handling POS terminal interactions, tracking payment attempts, and supporting partial pre-payments and refunds.

**All payment operations are abstracted behind a `PaymentService` layer.** No controller or feature service calls Stripe or Tranzila directly. This is mandatory (ARCHITECTURE.md §2.6) to allow future provider replacement and multi-currency expansion.

Architecture ref: ARCHITECTURE.md §2.6 Payments, §3.1 Billing & Payments Service, §5.1 Financial domain (Invoice, Payment, Charge, Refund), §18 Critical Risk: Payment Failure States

---

## Scope

### In Scope
- `PaymentService` abstraction layer (provider-agnostic interface)
- Stripe integration (primary provider)
- Tranzila integration (Israel market support)
- Credit card payment at check-out
- Pre-arrival partial payment (deposit)
- Service charge additions to invoice (minibar, room service, etc.)
- Refund workflow (full and partial)
- Payment attempt tracking with status history
- Automatic invoice generation (status → paid on successful payment)
- POS terminal support (physical terminal at front desk)
- Payment reconciliation view (payments vs. invoices)
- Invoice PDF generation / download

### Out of Scope
- Multi-currency support (future phase)
- Advanced accounting system integrations (future phase)
- Dynamic pricing / automated discounts (future phase)
- Online payment via guest portal (ARCH Phase 4 → Phase 8)
- Automated payment retry (future phase)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Provider abstraction | `IPaymentProvider` interface; Stripe + Tranzila implement it |
| Idempotency | Every payment operation uses idempotency keys (critical — ARCH §18) |
| Retry safety | Operations must be safe to retry without duplicate charges |
| Atomic state | Payment status + invoice status updated in single transaction |
| Webhook handling | Stripe webhooks for async payment confirmation |
| PCI compliance | Never store raw card numbers — use provider tokenization only |
| Audit trail | Every payment, refund, and failed attempt logged to `audit_logs` |
| Branch isolation | All financial records scoped to `branch_id` |

---

## Database Schema

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| invoice_id | uuid | FK → invoices |
| reservation_id | uuid | FK → reservations |
| amount | decimal(10,2) | |
| currency | varchar(3) | default 'ILS' |
| status | enum | pending, processing, succeeded, failed, cancelled, refunded |
| payment_method | enum | credit_card, cash, bank_transfer, pos_terminal |
| provider | enum | stripe, tranzila, manual |
| provider_payment_id | varchar | provider's transaction ID |
| idempotency_key | varchar | unique per attempt |
| metadata | jsonb | provider response snapshot |
| paid_at | timestamp | nullable |
| created_by | uuid | FK → users |
| created_at | timestamp | |
| updated_at | timestamp | |

### `charges`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| invoice_id | uuid | FK → invoices |
| description | varchar(255) | |
| amount | decimal(10,2) | |
| charge_type | enum | room_service, minibar, laundry, telephone, parking, other |
| added_by | uuid | FK → users |
| created_at | timestamp | |

### `refunds`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| payment_id | uuid | FK → payments |
| amount | decimal(10,2) | |
| reason | text | |
| status | enum | pending, succeeded, failed |
| provider_refund_id | varchar | nullable |
| approved_by | uuid | FK → users (manager+) |
| created_at | timestamp | |

### `payment_attempts`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| payment_id | uuid | FK → payments |
| attempt_number | int | |
| status | enum | pending, succeeded, failed |
| error_code | varchar | nullable |
| error_message | text | nullable |
| provider_response | jsonb | full provider response |
| attempted_at | timestamp | |

**Indexes:** `(branch_id, invoice_id)`, `(branch_id, reservation_id)`, `(provider_payment_id)` unique where not null

---

## Tasks

### Backend — Payment Abstraction
- [ ] Create `PaymentModule` with `PaymentService`, `PaymentController`
- [ ] Define `IPaymentProvider` interface:
  ```typescript
  interface IPaymentProvider {
    charge(amount: number, currency: string, token: string, idempotencyKey: string): Promise<ChargeResult>;
    refund(providerPaymentId: string, amount: number): Promise<RefundResult>;
    createPaymentIntent(amount: number, currency: string): Promise<PaymentIntentResult>;
  }
  ```
- [ ] `StripeProvider` implements `IPaymentProvider`
- [ ] `TranzilaProvider` implements `IPaymentProvider`
- [ ] `PaymentService` selects provider based on branch configuration
- [ ] Idempotency key generation: `${reservationId}:${invoiceId}:${attemptNumber}`

### Backend — Payment Endpoints
- [ ] `POST /api/v1/payments` — initiate payment (creates payment record + calls provider)
- [ ] `GET /api/v1/payments/:id` — payment detail
- [ ] `GET /api/v1/invoices/:id/payments` — all payments for an invoice
- [ ] `POST /api/v1/payments/webhook/stripe` — Stripe webhook handler (async confirmation)
- [ ] `POST /api/v1/reservations/:id/pre-payment` — partial deposit before arrival
- [ ] `POST /api/v1/charges` — add service charge to invoice (receptionist+)
- [ ] `POST /api/v1/refunds` — initiate refund (manager approval required)
- [ ] `GET /api/v1/refunds/:id` — refund status
- [ ] `GET /api/v1/reports/payment-reconciliation` — payments vs. invoices summary
- [ ] Invoice status update: when payment succeeds → `invoice.status = paid`
- [ ] Audit log: every payment attempt, success, failure, refund

### Backend — POS Integration
- [ ] POS terminal endpoint: `POST /api/v1/payments/pos` — triggers terminal charge
- [ ] POS supports: manual card entry + terminal reader (Stripe Terminal or Tranzila POS)
- [ ] POS result polling: `GET /api/v1/payments/pos/:sessionId/status`

### Backend — Invoice PDF
- [ ] `GET /api/v1/invoices/:id/pdf` — generate and stream invoice PDF
- [ ] Use `@react-pdf/renderer` or `pdfkit` for generation
- [ ] Invoice PDF includes: hotel logo, branch address, guest info, line items, totals, payment status

### Frontend
- [ ] `/payments/checkout` — payment form (credit card input via Stripe Elements)
  - Invoice summary (line items + total)
  - Payment method selector (card, cash, POS)
  - Stripe Elements card input (PCI-safe)
  - Pay button (disabled until form valid)
  - Success/failure state
- [ ] `/reservations/:id/pre-payment` — pre-arrival deposit page
  - Partial amount input
  - Stripe payment form
- [ ] Add Charges modal (from front desk or reservation detail):
  - Charge type selector
  - Amount + description
  - Confirms and updates invoice
- [ ] Refund request form (manager only):
  - Amount (full / partial)
  - Reason text
  - Manager approval confirmation
- [ ] Invoice page `/invoices/:id`:
  - All line items
  - Payment history
  - Download PDF button
  - Add charge button (receptionist+)
  - Refund button (manager+)
- [ ] Payment reconciliation page `/reports/reconciliation`:
  - Date range filter
  - Payments list with status
  - Total collected vs. total invoiced

---

## Expected Deliverables

1. Payment processing works end-to-end (credit card → Stripe → invoice marked paid)
2. Pre-arrival deposit accepted and tracked
3. Service charges addable to invoice from front desk
4. Refund workflow: request → manager approval → provider refund → audit trail
5. Invoice PDF downloadable
6. POS terminal charge functional
7. Payment reconciliation report shows accurate totals

---

## Validation Checklist

- [ ] Payment with valid card → `payments.status = succeeded`, `invoices.status = paid`
- [ ] Payment failure → `payment_attempts` records failure; invoice remains `pending_payment`
- [ ] Duplicate payment attempt with same idempotency key → no double charge
- [ ] Stripe webhook delivers async confirmation → invoice status updated
- [ ] Partial pre-payment → invoice balance reduced, not fully paid
- [ ] Service charge added → invoice total increases, line item appears
- [ ] Refund: `refunds.status = succeeded`, `payments.status = refunded`
- [ ] Refund requires manager role — receptionist gets `403`
- [ ] Audit log has entry for every payment and refund
- [ ] Invoice PDF generates and downloads correctly
- [ ] POS terminal session initiates (even if physical terminal not connected — mock response)
- [ ] Raw card numbers never appear in logs or DB
- [ ] Branch isolation: payments scoped to `branch_id`
- [ ] TypeScript strict — zero `any` in payment module

---

## Exit Criteria

All of the following must be true before Phase 8 (Guest Portal) begins:

1. Payment processing end-to-end working (Stripe integration active)
2. Invoice lifecycle complete: open → pending_payment → paid
3. Service charges and refunds functional
4. Audit trail complete for all financial operations
5. Invoice PDF generation working
6. Payment reconciliation report functional
7. Integration tests: successful payment, failed payment, idempotency, refund workflow
