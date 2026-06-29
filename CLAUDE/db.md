# Databases

## Connections

| DB         | Host (dev)  | Port | DB name                  | Notes                          |
|------------|-------------|------|--------------------------|--------------------------------|
| PostgreSQL | localhost   | 5432 | hotel_management_dev     | via `DATABASE_URL` env var     |
| Redis      | localhost   | 6379 | —                        | via `REDIS_URL` env var; password via `REDIS_PASSWORD` |

Docker network internal: postgres = `postgres:5432`, redis = `redis:6379`.

## Tables

| Table               | Description                                              |
|---------------------|----------------------------------------------------------|
| `branches`          | Hotel branches. Root entity — all others foreign-key here |
| `users`             | Staff accounts. `role`: chain_admin / hotel_manager / receptionist / housekeeping |
| `refresh_tokens`    | JWT refresh tokens with revocation support               |
| `room_types`        | Room categories per branch (name, base_price, max_occupancy) |
| `rooms`             | Individual rooms. `status`: available/occupied/maintenance/out_of_order. `cleaning_status`: clean/dirty/in_progress |
| `guests`            | Guest profiles. pg_trgm index on `full_name` for fast search |
| `guest_documents`   | Passport / ID documents per guest                        |
| `reservations`      | Core reservation record. `status`: pending/confirmed/checked_in/checked_out/cancelled/no_show |
| `reservation_guests`| Additional guests on a reservation (beyond primary)      |
| `check_ins`         | Check-in event record (1:1 with reservation)             |
| `check_outs`        | Check-out event record (1:1 with reservation)            |
| `invoices`          | Financial invoice per reservation. `status`: draft/finalized/paid/void |
| `invoice_line_items`| Line items on an invoice (room_charge, tax, discount, other) |
| `payments`          | Payment transactions. `provider`: stripe/tranzila/manual |
| `payment_attempts`  | Retry history per payment                                |
| `charges`           | Extra charges added to invoice (minibar, parking, etc.)  |
| `refunds`           | Refund records linked to payments                        |
| `audit_logs`        | Append-only audit trail. REVOKE UPDATE/DELETE on app user at DB level |

## Key invariants

- Every table (except `audit_logs`, `refresh_tokens`, `payment_attempts`) has `branch_id` — always filter by it.
- `reservations` has `version` column for optimistic locking.
- `payments` and `refunds` use `idempotency_key` (unique) to prevent double-charges.
- `audit_logs` is immutable at DB level (PostgreSQL RULE + REVOKE).

## Redis / cache keys

| Key pattern                                              | Owner               | TTL   | Purpose                          |
|----------------------------------------------------------|---------------------|-------|----------------------------------|
| `availability:{branchId}:{checkIn}:{checkOut}:{roomTypeId}` | AvailabilityService | 30s   | Available rooms query cache      |

Invalidation: `AvailabilityService.invalidateAvailabilityCache(branchId)` — called after reservation create/cancel/checkout and room status changes. Uses `cache.clear()` (full cache clear, acceptable given 30s TTL).
