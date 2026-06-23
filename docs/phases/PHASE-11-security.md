# Phase 11 — Security Audit & Hardening

## Purpose

Comprehensive security audit across the full platform: verify RBAC coverage on every route, test all permission boundaries, complete session management, and close any remaining security gaps before production deployment.

Note: Security foundations (Helmet.js, ValidationPipe, rate limiting, CSRF) were established in Phases 0 and 1. This phase audits their completeness and adds password reset and session management.

---

## Big Picture

Phases 0–10 built with security foundations from day one. Phase 11 audits the entire surface area systematically: every route checked against the permission matrix, every DTO validated, every auth edge case tested. This is the final gate before production (Phase 12).

Architecture ref: ARCHITECTURE.md §7 Security Architecture, §17 Engineering Standards

---

## Scope

### In Scope
- Full RBAC audit: every route verified against required role (all 12 phases reviewed)
- Route permission matrix validated against implementation
- DTO validation completeness review (all endpoints have proper validation)
- SQL injection audit (Prisma parameterization verified throughout)
- Password reset flow (email-based token via NotificationService)
- Session management: force logout, active sessions list
- Security regression test suite
- Review of guest portal token security (Phase 8 scope review)
- Review payment security (PCI surface area from Phase 7)

### Already Done (Phase 0–1)
- Helmet.js security headers ← Phase 0
- ValidationPipe with `forbidUnknownValues` ← Phase 0
- Auth rate limiting (30/min) ← Phase 1
- CSRF protection on cookie endpoints ← Phase 1
- DB-level audit_log immutability ← Phase 1

### Out of Scope
- Penetration testing (external — future)
- SOC 2 compliance (future)
- GDPR data deletion workflows (future)
- Advanced maintenance workflows (future phase)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Rate limiting | `@nestjs/throttler`: 100 req/min per user, 30 req/min for auth endpoints |
| Security headers | Helmet.js: X-Frame-Options, X-Content-Type-Options, HSTS, CSP |
| CSRF | Double-submit cookie pattern for auth cookie endpoints |
| Input validation | `class-validator` + `class-transformer` on ALL DTOs |
| Audit logs | Immutable — no UPDATE or DELETE on `audit_logs` table |
| Password reset | Signed token, 1-hour TTL, single-use |
| Housekeeping tasks | Room → task → completion → room status update (atomic) |

---

## RBAC Permission Matrix

| Resource | chain_admin | hotel_manager | receptionist | housekeeping |
|---|---|---|---|---|
| Branches: read | all | own | own | — |
| Branches: write | ✓ | — | — | — |
| Users: create | ✓ | own branch | — | — |
| Rooms: read | all | own | own | own |
| Rooms: write | ✓ | own | — | status only |
| Guests: read | all | own | own | — |
| Guests: write | ✓ | own | own | — |
| Reservations: read | all | own | own | — |
| Reservations: write | ✓ | own | own | — |
| Check-in/out | ✓ | own | own | — |
| Housekeeping tasks | ✓ | own | — | own |
| Reports | all | own | — | — |
| Audit logs: read | ✓ | own | — | — |

---

## Database Schema

### `housekeeping_tasks`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| room_id | uuid | FK → rooms |
| assigned_to | uuid | FK → users (housekeeping role) |
| status | enum | pending, in_progress, completed, skipped |
| priority | enum | normal, urgent |
| notes | text | nullable |
| scheduled_for | date | |
| started_at | timestamp | nullable |
| completed_at | timestamp | nullable |
| created_by | uuid | FK → users |
| created_at | timestamp | |

---

## Tasks

### Backend — Security Audit
- [ ] Audit every controller: confirm `@UseGuards(JwtAuthGuard, RolesGuard)` applied to every route
- [ ] Review all DTOs — fill any missing `@IsString()`, `@IsUUID()`, `@IsDate()`, `@IsEnum()` decorators
- [ ] Verify all Prisma queries use parameterized inputs — grep for any raw string concatenation in queries
- [ ] Verify Helmet headers active on production config (not just dev)
- [ ] Run security regression test suite covering all 4 roles × all modules

### Backend — Password Reset & Session Management
- [ ] Password reset: `POST /api/v1/auth/forgot-password` → sends email via `NotificationService` with signed token
- [ ] Password reset: `POST /api/v1/auth/reset-password` → validates token (1h TTL, single-use), updates bcrypt hash
- [ ] `GET /api/v1/auth/sessions` — list active refresh tokens for current user
- [ ] `DELETE /api/v1/auth/sessions/:id` — revoke specific session
- [ ] `DELETE /api/v1/auth/sessions` — revoke all sessions (force logout everywhere)
- [ ] Password reset token table (or reuse `refresh_tokens` with purpose field):

```sql
-- If separate table:
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  token_hash varchar NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp
);
```

### Frontend
- [ ] Session management UI (Topbar dropdown → Settings)
  - Active sessions list (device, IP, last used)
  - Revoke specific session button
  - "Log out everywhere" button
- [ ] Password reset pages: `/forgot-password`, `/reset-password`
  - `/forgot-password`: email input form
  - `/reset-password?token=...`: new password input + confirm

---

## Expected Deliverables

1. Every API route audited — RBAC permission matrix fully enforced across all modules
2. Security foundations confirmed active (Helmet, rate limiting, CSRF, ValidationPipe)
3. Password reset email flow works end-to-end
4. Session management UI functional (list sessions, revoke, logout everywhere)
5. Security regression test suite passes — all permission boundary cases tested

---

## Validation Checklist

- [ ] `receptionist` role cannot access manager-only routes — returns `403`
- [ ] `housekeeping` role cannot access reservations — returns `403`
- [ ] `chain_admin` has access to all branches' resources
- [ ] Rate limit: 31st auth request in 1 minute returns `429`
- [ ] Security headers present: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`
- [ ] Invalid DTO field (e.g. `email: "not-an-email"`) → `400` with field-level errors
- [ ] Unknown DTO fields rejected (`forbidUnknownValues`)
- [ ] Audit log INSERT succeeds; UPDATE/DELETE on audit_logs returns `403`
- [ ] Password reset token expires after 1 hour
- [ ] Password reset token single-use (second use returns `400`)
---

## Exit Criteria

All of the following must be true before Phase 12 (Production Deployment) begins:

1. RBAC permission matrix audited and fully enforced for all 4 roles across all 11 phases
2. Rate limiting confirmed active (already from Phase 1 — verify still in place)
3. Security headers confirmed active in production config
4. Password reset flow works end-to-end
5. Session management UI functional (list, revoke, logout-everywhere)
6. Zero missing DTO validations — automated test confirms no unknown fields accepted
7. Security regression test suite: permission boundary tests for all roles across all modules
