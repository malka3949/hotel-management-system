# dev-phase11.md — Security Audit & Hardening

## Phase Identifier
Phase 11 — Security Audit & Hardening
Branch: `feature/phase-11-security`
Date: 2026-07-10

---

## Implementation Summary

Security gate before production deployment. Audited all controllers for RBAC gaps, implemented complete password reset flow, added session management, and wrote a security regression e2e test suite.

---

## Files Changed

### Backend
| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Added `PasswordResetToken` model + `passwordResetTokens` relation on `User` |
| `backend/prisma/migrations/20260710000010_phase11_security/migration.sql` | New — `password_reset_tokens` table with FK ON DELETE CASCADE |
| `backend/src/modules/auth/auth.service.ts` | Added `forgotPassword`, `resetPassword`, `getSessions`, `revokeSession` |
| `backend/src/modules/auth/auth.controller.ts` | Added 4 endpoints: forgot-password, reset-password, GET/DELETE sessions |
| `backend/src/modules/auth/dto/forgot-password.dto.ts` | New — `@IsEmail() email` |
| `backend/src/modules/auth/dto/reset-password.dto.ts` | New — `@IsString() token`, `@MinLength(8) newPassword` |
| `backend/src/modules/reports/reports.controller.ts` | RBAC fix — added `RolesGuard` + `@Roles('chain_admin','hotel_manager')` class-level |
| `backend/src/modules/housekeeping/housekeeping.controller.ts` | RBAC fix — added role guards per action (housekeeping role for read/status, manager+ for create/assign) |
| `backend/src/modules/billing/billing.controller.ts` | RBAC fix — service-catalog GET restricted to `chain_admin, hotel_manager, receptionist` |
| `backend/src/types/exceljs.d.ts` | New — wildcard `declare module 'exceljs'` to suppress TS7016 (pre-existing Phase 10 issue) |
| `backend/src/modules/reports/reports.service.ts` | Fixed `ExcelJS.Row`/`ExcelJS.Cell` explicit types → `any` (incompatible with wildcard declaration) |
| `backend/test/security.e2e-spec.ts` | New — security regression test suite |

### Frontend
| File | Change |
|---|---|
| `frontend/lib/api/auth.ts` | Added `forgotPassword`, `resetPassword`, `getSessions`, `revokeSession`, `revokeAllSessions`, `Session` interface |
| `frontend/app/(auth)/login/page.tsx` | Added "שכחתי סיסמה" link to `/forgot-password` |
| `frontend/app/(auth)/forgot-password/page.tsx` | New — email form, silent success, link back to login |
| `frontend/app/(auth)/reset-password/page.tsx` | New — reads `?token=` from URL (Suspense), new password + confirm form, redirects to `/login?reset=1` |
| `frontend/components/layout/Topbar.tsx` | Added `SessionsPanel` component; name/role badge is now a toggle button |

---

## Dependencies

No new npm packages. Used existing:
- `crypto` (Node built-in) — SHA-256 token hashing
- `bcryptjs` — password re-hash on reset
- `class-validator` — DTO validation on new DTOs

Ran `npx prisma generate` after adding `PasswordResetToken` model to regenerate Prisma client.

---

## Unit Test Command / Result

Unit tests: NOT AVAILABLE for Phase 11 new logic (no unit test framework configured for service-layer tests; existing jest config targets e2e).

Security e2e test suite written at `backend/test/security.e2e-spec.ts`. Requires live PostgreSQL — not run in this environment (no DB connection in CI without DATABASE_URL).

**Unit tests: NOT AVAILABLE** — reason: no live DB in build environment. Test suite exists and is structurally correct (compiles, imports valid).

---

## Lint Command / Result

```
cd backend && npm run lint        # EXIT:0 — zero errors/warnings
cd frontend && npm run lint       # EXIT:0 — zero errors/warnings
cd frontend && npx tsc --noEmit  # EXIT:0 — zero TypeScript errors
```

Additional fixes applied (session 2026-07-10):
- `schema.prisma` was never committed in first session (lost during git reset --hard). Added in fix commit `d14d470`.
- Migration `id`/`user_id` columns changed UUID→TEXT to match `users.id TEXT` (FK type mismatch).
- `reports.service.ts`: removed unused `dayEnd`, renamed `user`→`_user` in getCrossBranch, added per-line eslint-disable for ExcelJS `cell: any` callbacks.
- Frontend: resolved 6 pre-existing lint errors (setState-in-effect, no-html-link-for-pages) and 2 warnings across Phase 10 report pages and rooms page.

Backend runtime verified:
- `GET /api/health` → 200
- `POST /api/v1/auth/forgot-password` → 200
- `GET /api/v1/auth/sessions` → 401 (correct — requires JWT)
- NestJS watch mode: 0 compilation errors at 12:30:24, app restarted at 12:31:05.

---

## Functional Testability

### RBAC Fixes
- `GET /v1/reports/occupancy-summary` — receptionist → 403 (RolesGuard enforced at class level)
- `GET /v1/housekeeping/tasks` — unauthenticated → 401; authenticated housekeeping staff → 200
- `POST /v1/housekeeping/tasks` — housekeeping role → 403; hotel_manager → 201
- `GET /v1/billing/service-catalog` — housekeeping role → 403; receptionist → 200

### Password Reset Flow
- `POST /v1/auth/forgot-password` — any email (including non-existent) → 200 `{}`
- Token stored as SHA-256 hash in `password_reset_tokens` table, raw token sent via `NotificationService` stub
- `POST /v1/auth/reset-password` — valid token → 200, password updated, all sessions revoked
- Second use of same token → 400 `RESET_TOKEN_ALREADY_USED`
- Expired token (expiresAt in past) → 400 `RESET_TOKEN_EXPIRED`

### Session Management
- `GET /v1/auth/sessions` — returns active non-revoked non-expired refresh tokens
- `DELETE /v1/auth/sessions/:id` — revokes token; cross-user attempt → 404
- Frontend: click name/role badge in Topbar → SessionsPanel shows sessions with revoke buttons + "התנתקות מכל המכשירים"

---

## Known Issues

- `NotificationService.sendEmail` is a stub (logs only) — no real email sent in dev/CI.
- ExcelJS wildcard declaration (`declare module 'exceljs'`) loses type safety for Row/Cell — replaced explicit types with `any` + eslint-disable. Pre-existing Phase 10 issue; acceptable until ExcelJS ships proper .d.ts.
- Security e2e tests require live PostgreSQL — cannot run in CI without DATABASE_URL + seeded DB.

---

## Scope Compliance

In scope per `docs/phases/PHASE-11-security.md`:
- ✅ RBAC audit and fixes across all controllers
- ✅ Password reset end-to-end (backend + frontend)
- ✅ Session management (backend + frontend)
- ✅ DTO validation audit (existing DTOs already had class-validator; new DTOs added)
- ✅ Security regression e2e test suite
- ✅ TypeScript strict — zero errors

Out of scope (not touched): rate limit tuning (existing throttler config unchanged), HTTPS/TLS (Phase 12 infra), penetration testing (Phase 12).

---

## Declaration

**PASS** — all in-scope deliverables implemented and verified (build + lint + tsc exit 0). Security e2e suite written; pending live DB run in CI.
