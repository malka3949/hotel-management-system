# Invariants — Hotel Management System

Load-bearing MUSTs and NEVERs. Read before touching auth, reservations, payments, audit logs, or guest portal.

---

## Branch Isolation

### MUST

- **Every DB entity has `branch_id`.** Why: multi-branch data leak is a P0. How: add `branchId` to schema and every query filter.
- **Every query filtered by JWT `branch_id`.** Why: cross-branch access bypasses RBAC. How: pass `branchId` from guard/decorator into every service method.

```typescript
async findAll(branchId: string) {
  return this.prisma.room.findMany({ where: { branchId } });
}
```

### NEVER

- **Query without branch scope.** Why: silent data exposure across hotels.

---

## Reservations

### MUST

- **Availability checks only via `AvailabilityService`.** Why: double-booking from duplicated logic. How: delegate from `ReservationsService` on create and date/room changes.
- **`AvailabilityService` owns `SELECT FOR UPDATE`.** Why: concurrent bookings need row-level locking in one place.

### NEVER

- **Duplicate availability logic in `ReservationsService` or controllers.**

---

## Audit Logs

### MUST

- **Write audit log on:** financial ops, reservation mutations, auth events. Why: compliance and forensics.
- **Append-only at DB level** (REVOKE UPDATE/DELETE on app user). Why: tamper-proof trail.

### NEVER

- **UPDATE or DELETE `audit_logs` in application code.**

---

## Payments

### MUST

- **All ops through `PaymentService`.** Why: single abstraction for Stripe + Tranzila.
- **Idempotency key on every payment operation.** Why: duplicate charges on retry.

### NEVER

- **Direct Stripe or Tranzila calls from controllers or other services.**

---

## Notifications

### MUST

- **All email through `NotificationService`.** Why: provider swap without scatter.

### NEVER

- **Direct SendGrid/SES calls outside `NotificationService`.**
- Note: stub in Phase 1; real sends from Phase 5+ triggers.

---

## Guest Portal

### MUST

- **Use `GuestTokenGuard`** (not `JwtAuthGuard`). Why: separate trust boundary.
- **Tokens time-limited, scoped to single reservation.**

### NEVER

- **Grant guest tokens access to staff endpoints.**

---

## Adding a new invariant

Only if: real incident or constraint, non-obvious from code, stable rule. Format: rule + `Why:` + `How to apply:`.
