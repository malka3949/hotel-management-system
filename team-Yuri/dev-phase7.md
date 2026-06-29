# dev-phase7.md — Phase 7: Billing & Payments

## Phase Identifier
Phase 7 — Billing & Payments

## Implementation Summary
Payment processing layer on top of Phase 6 invoices. Provider-abstracted architecture (Stripe / Tranzila / Manual). Service charges, refund workflow, invoice PDF generation, POS stub, and reconciliation report.

## Files Changed

### Backend — New
- `backend/prisma/migrations/20260629000006_phase7_billing/migration.sql`
- `backend/src/modules/billing/billing.module.ts`
- `backend/src/modules/billing/billing.controller.ts`
- `backend/src/modules/billing/payment.service.ts`
- `backend/src/modules/billing/charge.service.ts`
- `backend/src/modules/billing/refund.service.ts`
- `backend/src/modules/billing/providers/payment-provider.interface.ts`
- `backend/src/modules/billing/providers/stripe.provider.ts`
- `backend/src/modules/billing/providers/tranzila.provider.ts`
- `backend/src/modules/billing/providers/manual.provider.ts`
- `backend/src/modules/billing/dto/create-payment.dto.ts`
- `backend/src/modules/billing/dto/create-charge.dto.ts`
- `backend/src/modules/billing/dto/create-refund.dto.ts`
- `backend/src/modules/billing/dto/pre-payment.dto.ts`
- `backend/src/modules/billing/pdf/invoice-pdf.service.ts`
- `backend/test/billing.e2e-spec.ts`

### Backend — Modified
- `backend/src/main.ts` — added `rawBody: true` for Stripe webhook
- `backend/src/app.module.ts` — registered BillingModule
- `backend/src/config/env.validation.ts` — added STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET (optional, allow empty)
- `backend/.env.test` — added STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET (empty)
- `backend/package.json` — added stripe, pdfkit, @types/pdfkit

### Frontend — New
- `frontend/lib/api/billing.ts`
- `frontend/components/shared/AddChargeModal.tsx`
- `frontend/components/shared/RefundModal.tsx`

### Frontend — Modified
- `frontend/app/(dashboard)/invoices/[id]/page.tsx` — payment history, PDF download, Add Charge, Refund
- `frontend/app/(dashboard)/payments/checkout/page.tsx` — payment form
- `frontend/app/(dashboard)/reports/page.tsx` — reconciliation report (replaced stub)

## Dependencies Added
| Package | Version | Purpose |
|---------|---------|---------|
| stripe | ^22.3.0 | Stripe Node SDK |
| pdfkit | ^0.19.1 | Server-side PDF generation |
| @types/pdfkit | ^0.17.6 | TypeScript types for pdfkit |

## Unit Test Command / Result
E2E tests (billing module):
```
npm run test:e2e -- --testPathPattern=billing --forceExit
```
**Result: 11/11 PASS** (68.656s)

Tests covered:
1. POST /api/v1/payments — cash payment succeeds, invoice.status = paid ✓
2. POST /api/v1/payments — rejects payment on already-paid invoice ✓
3. POST /api/v1/payments — failed payment recorded in payment_attempts ✓
4. GET /api/v1/payments/:id — returns payment detail ✓
5. POST /api/v1/charges — adds charge to draft invoice, updates total ✓
6. POST /api/v1/refunds — manager refunds succeeded payment ✓
7. POST /api/v1/refunds — receptionist gets 403 ✓
8. GET /api/v1/invoices/:id/pdf — returns PDF content-type ✓
9. GET /api/v1/reports/payment-reconciliation — returns totals ✓
10. POST /api/v1/payments — manager from other branch gets 403 ✓
11. audit logs have entries for payment and refund ✓

## Lint Command / Result
```
npx eslint src/modules/billing/ --max-warnings=0
```
**Result: 0 errors, 0 warnings** (after fixing unused `amount` param → `_amount` in ManualProvider)

Frontend TypeScript:
```
npx tsc --noEmit
```
**Result: 0 errors**

## Functional Testability
- Backend API running at http://localhost:3001
- Endpoints exercised via e2e test suite (all 11 passed)
- PDF download: `GET /api/v1/invoices/:id/pdf` returns `Content-Type: application/pdf`
- Reconciliation report: `GET /api/v1/reports/payment-reconciliation` returns totals

## Architecture Decisions
- `IPaymentProvider` interface → StripeProvider (real), TranzilaProvider (stub), ManualProvider (cash/bank)
- StripeProvider lazy-initializes: `new Stripe(key)` only when `STRIPE_SECRET_KEY` is set
- Idempotency key: `${reservationId}:${invoiceId}:${attemptNumber}`
- TAX_RATE = 0.17 (consistent with Phase 6)
- All payments through `PaymentService` only (no direct provider calls from controller)
- All refunds require `hotel_manager` or `chain_admin` role
- Stripe webhook uses `rawBody: true` + `@SkipThrottle()` + no JWT guard

## Known Issues
- Stripe Elements not integrated on frontend (checkout page uses manual token input)
- POS terminal is a stub (returns mock session, always succeeds)
- No n8n triggers (out of Phase 7 scope)

## Documentation Updated
- `PROJECT_STATUS.md` updated (Phase 6 → 🟢, Phase 7 → 🟡)

## Scope Compliance
All deliverables from plan `effervescent-jingling-dolphin.md` implemented. No Phase 8 features included.

## Declaration
Phase 7 PASS — 11/11 e2e tests passing, 0 lint errors, 0 frontend TS errors.
