# System Flows

Cross-system data flows. Read when a task touches more than one service.

## Topology

```
Browser (RTL Hebrew UI)
    │  HTTP/WS
    ▼
Next.js Frontend :3000
    │  HTTP (server-side: BACKEND_URL=http://backend:3001)
    │  HTTP (client-side: /api/v1/*)
    ▼
NestJS Backend :3001
    ├──► PostgreSQL :5432  (Prisma ORM — all persistent data)
    ├──► Redis :6379        (availability cache, session TTL)
    └──► n8n :5678          (webhook triggers → notifications/automations)
              │
              └──► External: Resend (email), Stripe, Tranzila
```

## Connection matrix

| From | To | Protocol | Port | Auth | Notes |
|------|----|----------|------|------|-------|
| Browser | Frontend | HTTPS | 3000 | — | dev HTTP ok |
| Browser | Backend | HTTPS | 3001 | JWT HttpOnly cookie | direct API calls from client |
| Frontend (SSR) | Backend | HTTP | 3001 | JWT cookie forwarded | server-side fetch |
| Backend | PostgreSQL | TCP | 5432 | `DATABASE_URL` env | Prisma connection pool |
| Backend | Redis | TCP | 6379 | `REDIS_PASSWORD` | availability cache |
| Backend | n8n | HTTP | 5678 | `N8N_WEBHOOK_SECRET` | fire-and-forget webhooks |
| n8n | Resend | HTTPS | 443 | `RESEND_API_KEY` | transactional email |
| n8n | Stripe | HTTPS | 443 | Stripe secret key | payment events |

## Flow 1: Staff login

1. Browser → `POST /api/v1/auth/login` (email + password)
2. Backend: bcrypt compare → issue `access_token` (15m) + `refresh_token` (7d)
3. Both tokens set as **HttpOnly cookies** — never in response body
4. Frontend redirects to dashboard based on role

## Flow 2: Reservation creation

1. Receptionist submits new-reservation form → `POST /api/v1/reservations`
2. Backend → `AvailabilityService.checkAndLock()` → `SELECT FOR UPDATE` on rooms
3. If available: create `reservation` row + lock room
4. Invalidate Redis key `availability:{branchId}:*`
5. n8n webhook fired → email confirmation to guest (via Resend)
6. Response: reservation id + status `confirmed`

## Flow 3: Check-in

1. Receptionist → `POST /api/v1/check-ins` with `reservation_id`
2. Backend validates: reservation `status=confirmed`, check-in date ≥ today
3. Creates `check_ins` row + updates `reservation.status → checked_in`
4. Updates `room.status → occupied`
5. Audit log entry appended (immutable)

## Flow 4: Check-out + payment

1. Receptionist initiates check-out → `POST /api/v1/check-outs`
2. Backend: creates `check_outs` row, `reservation.status → checked_out`
3. `InvoiceService`: finalizes invoice — sums `invoice_line_items` + `charges`
4. `PaymentService`: charge via Stripe or Tranzila with `idempotency_key`
5. `payments` row created; `invoice.status → paid`
6. Room status → `dirty` (triggers housekeeping queue)

## Flow 5: Guest portal (online check-in)

1. Guest receives tokenized link `/[token]/` (email via n8n)
2. `GuestTokenGuard` validates token — time-limited, single-reservation scope
3. Guest fills check-in form → `POST /api/v1/portal/check-in`
4. No staff JWT required — guest token is the only auth
5. Confirmation page rendered at `/[token]/confirmation`

## Flow 6: Availability query

1. Frontend → `GET /api/v1/availability?branchId=&checkIn=&checkOut=&roomTypeId=`
2. Backend checks Redis key `availability:{branchId}:{checkIn}:{checkOut}:{roomTypeId}` (TTL 30s)
3. Cache miss → SQL query via `AvailabilityService`, result cached
4. Cache invalidated on: reservation create/cancel/checkout, room status change
