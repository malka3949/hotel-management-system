# Software Security Findings — Hotel Management System — 2026-06-17

> Read-only audit against the 16 software-security principles. No code was modified.
> Scope: `hotel-management-system/backend/src` + dependency tree.
> Verify pass: `/security-review` — **skipped** (not a git repository; no diff available).

---

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | 3 |
| 🟡 risk | 17 |
| 🔵 nit | 9 |

**Principles covered:** 10 / 11 code-auditable · **Domains:** authn/authz · input/files · data/secrets/sessions · errors/defaults · supply-chain

**Top 3 to fix first:**
1. 🔴 `backend/.env:5` — JWT secrets committed as plaintext (rotate immediately)
2. 🔴 `backend/src/modules/rooms/rooms.service.ts:106` — mass-assignment: entire UpdateRoomDto written to DB including `isActive`
3. 🔴 `form-data@4.0.5` — GHSA-hmw2-7cc7-3qxx CRLF injection in prod dependency

---

## 1. Authentication — WARN

- 🟡 `backend/src/common/guards/roles.guard.ts:17` — `RolesGuard` returns `true` (allows all authenticated users) when no `@Roles()` decorator is present; any future mutating route that omits `@Roles()` silently passes the guard.
  **Why:** principle 1 — a missing decorator must not silently open access. **Fix:** change default to `return false` (deny-by-default) or adopt a `@Public()` allowlist pattern.

- 🟡 `backend/src/modules/auth/auth.controller.ts:27` — `access_token` cookie set with `httpOnly: false`, making the JWT directly readable by JavaScript and vulnerable to XSS exfiltration. The comment says it's deliberate for the Next.js proxy, but the token is already returned in the response body (line 78), making the non-HttpOnly cookie redundant.
  **Why:** principle 1 / `06-tokens-and-sessions.md §transport-and-storage`. **Fix:** set `httpOnly: true`; rely on `Authorization: Bearer` from the proxy, or pass token only in response body and drop the cookie.

- 🟡 `backend/src/modules/auth/auth.controller.ts:78` — `accessToken` returned in the JSON response body on login (and again on refresh at line 105), persisting the JWT wherever the frontend stores API responses.
  **Why:** principle 6 / `06-tokens-and-sessions.md §transport-and-storage`. **Fix:** if the HttpOnly-cookie path is used, omit the token from the response body; if Bearer header is used, drop the cookie.

- 🔵 `backend/src/health/health.controller.ts:6` — `GET /health` is unauthenticated and returns `npm_package_version`, leaking the exact software version to any caller.
  **Why:** principle 1 / principle 11. **Fix:** remove the version field or restrict to internal/monitoring networks.

---

## 2. Authorization (IDOR / ownership) — WARN

- 🟡 `backend/src/modules/users/users.service.ts:86` — `hotel_manager` can set `isActive: false/true` on any user in their branch (including other managers) because `UpdateUserDto` includes `isActive` and `update()` applies the DTO directly with no role-rank check — a manager could lock out accounts they should not control.
  **Why:** principle 2 / `07-authorization-and-roles.md §privilege-escalation`. **Fix:** restrict `isActive` mutations to `chain_admin` only, or validate that requester's role outranks the target's role.

- 🔵 `backend/src/modules/guests/guests.service.ts:214` — `guestDocument.findMany({ where: { guestId } })` does not scope by `branchId`; relies entirely on the prior guest ownership check. If a document row has a mismatched `branchId` (data migration error), documents from another branch could leak.
  **Why:** principle 2 / `07-authorization-and-roles.md §IDOR`. **Fix:** add `branchId: guest.branchId` to the `findMany` where clause as defence-in-depth.

---

## 3. Input Validation (mass-assignment) — FAIL

- 🔴 `backend/src/modules/rooms/rooms.service.ts:106` — `data: dto` passes the entire `UpdateRoomDto` into `prisma.room.update`; `UpdateRoomDto` includes `isActive: boolean`, so any user with PATCH access can deactivate a room directly, bypassing the dedicated `softDelete` endpoint. The global `whitelist: true` pipe only strips unknown fields — `isActive` is decorated and passes through.
  **Why:** principle 3 / `08-input-validation-and-injection.md §mass-assignment`. **Fix:** build an explicit data object (pick only `roomTypeId`, `number`, `floor`, `notes`); move `isActive` out of `UpdateRoomDto`.

- 🟡 `backend/src/modules/branches/branches.service.ts:12` — `prisma.branch.create({ data: dto })` spreads the entire `CreateBranchDto`; no explicit field map means any future field added to the DTO is automatically written to the DB without review.
  **Why:** principle 3 / `08-input-validation-and-injection.md §mass-assignment`. **Fix:** explicit field mapping; add `@MaxLength` to unconstrained string fields.

- 🟡 `backend/src/modules/branches/branches.service.ts:29` — `prisma.branch.update({ data: dto })` spreads `UpdateBranchDto` directly; same structural mass-assignment risk.
  **Why:** principle 3. **Fix:** explicit field mapping.

- 🟡 `backend/src/modules/guests/guests.controller.ts:26` — `SearchGuestsDto.q` has no `@MaxLength`; passed as a parameterised value into a LIKE/ILIKE on `$queryRaw`. No SQL injection (Prisma parameterises), but an unbounded string allows pathological ILIKE work.
  **Why:** principle 3 / `08-input-validation-and-injection.md §input-validation`. **Fix:** add `@MaxLength(100)` to `SearchGuestsDto.q`.

- 🔵 `backend/src/modules/guests/dto/create-guest.dto.ts:47` (and `update-guest.dto.ts:44`, `create-room.dto.ts:35`, `update-room.dto.ts:23`, `create-room-type.dto.ts:26`, `update-room-type.dto.ts:25`) — Free-text `notes`/`description` fields decorated only with `@IsString()`; no `@MaxLength` allows arbitrarily large payloads.
  **Why:** principle 3. **Fix:** add `@MaxLength(2000)` (or appropriate limit) to all free-text fields.

---

## 4. Data Protection — WARN

- 🟡 `backend/src/modules/guests/guests.service.ts` (full file) + `backend/src/modules/users/users.service.ts` (full file) — No audit log is written for any guest PII read, write, or delete, and no log is written for user role changes or password changes. `AuditService` is injected only in `AuthService`.
  **Why:** principle 4 / `10-logging-and-audit.md §audit-trail-events`. **Fix:** inject `AuditService` into `GuestsService` and `UsersService`; log `GUEST_READ`, `GUEST_UPDATE`, `GUEST_DELETE`, `USER_ROLE_CHANGE`, `USER_PASSWORD_CHANGE`.

---

## 5. Privacy by Design — FAIL

- 🟡 `backend/src` (no retention mechanism found) — No data retention, cleanup job, anonymisation, or guest-data export/erasure capability exists. Guest PII (passport ID, DOB, phone) accumulates indefinitely with no purge path.
  **Why:** principle 5 / Israeli Amendment 13. **Fix:** scheduled task to anonymise/delete inactive guest records beyond retention window; `DELETE /v1/guests/:id/pii` endpoint for erasure requests.

---

## 6. Sessions & Tokens — FAIL

- 🔴 `backend/.env:5` — `JWT_SECRET=hotel-jwt-secret-development-32chars!!` present on disk as plaintext. `backend/.env:6` — `JWT_REFRESH_SECRET=hotel-refresh-secret-dev-32chars!!` same. Root `.gitignore` covers `.env` pattern, but `.env.test` is not listed and may be committed.
  **Why:** principle 6 / `09-secrets-management.md §secret-storage`. **Fix:** rotate both secrets immediately; add `.env.*` to `.gitignore`; use a secrets manager (Vault, AWS Secrets Manager) or at minimum generate cryptographically random 256-bit values.

- 🟡 `backend/src/modules/auth/auth.controller.ts:46` + `backend/src/common/guards/csrf.guard.ts:18` — `JWT_SECRET` is dual-used as both the JWT signing key and the CSRF HMAC key; a single key compromise breaks both mechanisms.
  **Why:** principle 6 / `06-tokens-and-sessions.md §secret-strength`. **Fix:** introduce a dedicated `CSRF_SECRET` env var; use it exclusively in `CsrfGuard`.

- 🟡 `backend/src/modules/auth/auth.service.ts:151` — Refresh tokens stored hashed with SHA-256 (fast, no salt); vulnerable to offline brute-force if DB is breached.
  **Why:** principle 6 / `06-tokens-and-sessions.md §token-storage`. **Fix:** use HMAC-SHA256 keyed on a server secret (`REFRESH_TOKEN_HMAC_KEY`), making offline brute-force infeasible.

- 🟡 `backend/src/modules/auth/auth.module.ts:19` + `backend/src/modules/auth/auth.controller.ts:71` — `JWT_ACCESS_EXPIRES_IN=8h` (in `.env`) but cookie `maxAge` is hardcoded to 15 minutes; the JWT is valid for 8 hours while the cookie expires in 15 minutes, so an extracted token (especially with `httpOnly: false`) is usable for 8 hours.
  **Why:** principle 6 / `06-tokens-and-sessions.md §expiry`. **Fix:** derive `maxAge` from parsed `JWT_ACCESS_EXPIRES_IN`; align `.env` default back to `15m`.

- 🟡 `backend/src/modules/auth/auth.service.ts:109` — Logout only revokes the single presented refresh token; all other active sessions remain valid.
  **Why:** principle 6 / `06-tokens-and-sessions.md §revocation`. **Fix:** add a "logout all devices" endpoint that calls `updateMany({ where: { userId, revokedAt: null } })`.

- 🔵 `backend/src/config/env.validation.ts:11` — `JWT_REFRESH_SECRET` declared and required but never used anywhere (refresh tokens use `crypto.randomBytes`, not a JWT). Creates false-security impression.
  **Why:** principle 6. **Fix:** remove from env validation and `.env` files, or document why it is reserved.

- 🔵 `backend/src/modules/auth/auth.controller.ts:46` — CSRF endpoint reads `process.env.JWT_SECRET` directly (bypassing `ConfigService`); throws a generic `Error` (not `HttpException`) if absent — produces an unhandled 500 that leaks a stack trace.
  **Why:** principle 6 / principle 10. **Fix:** inject `ConfigService` and use `configService.getOrThrow('JWT_SECRET')`.

---

## 7. Safe File Handling — NOT APPLICABLE

No file upload handlers exist in the current codebase. When document upload is added (Phase 5+), enforce: type allowlist (MIME + extension), size cap, filename sanitisation (no path traversal), out-of-webroot storage.

---

## 9. Logging & Monitoring — WARN

- 🟡 `backend/src/modules/auth/auth.service.ts:45` — Failed-login audit log stores `email: dto.email` verbatim in `audit_logs.metadata`; for non-existent users this also confirms whether an email is registered (user-enumeration artifact in the audit trail).
  **Why:** principle 9 / `10-logging-and-audit.md §never-log-list`. **Fix:** omit `email` from failed-login metadata; the `userId` field already identifies confirmed users.

- 🔵 `backend/src/modules/notifications/notification.service.ts:15` — Stub logs `options.to` (recipient email address) to NestJS logger without masking; when a real email sink is attached in production, PII will persist in application logs.
  **Why:** principle 9 / `10-logging-and-audit.md §never-log-list`. **Fix:** mask the address (`u***@domain`) in the log line.

---

## 10. Error Handling (fail-closed) — WARN

- 🟡 `backend/src/modules/auth/auth.service.ts:96` — Refresh-token rotation performs two separate DB writes (revoke old + create new in `issueTokens`) with no wrapping `$transaction`; if CREATE fails after revoke succeeds, the user is permanently locked out.
  **Why:** principle 10 / `03-error-handling.md §half-updated-state`. **Fix:** wrap both writes in `this.prisma.$transaction([...])`.

- 🔵 `backend/src/common/filters/global-exception.filter.ts:33` — `ValidationPipe` constraint messages (e.g., `"password must be longer than or equal to 8 characters"`) forwarded verbatim to client, leaking internal field names.
  **Why:** principle 10 / `03-error-handling.md §stack-trace`. **Fix:** return a fixed `"VALIDATION_ERROR"` string with constraint details only in non-prod environments.

---

## 11. Secure Defaults — WARN

- 🟡 `backend/src/main.ts:34` — `http://localhost:3000` and `http://127.0.0.1:3000` included in CORS allowlist unconditionally regardless of `NODE_ENV`; in production any local browser request is cross-origin allowed with credentials.
  **Why:** principle 11 / `04-secure-defaults.md §CORS`. **Fix:** gate dev origins on `process.env.NODE_ENV !== 'production'`.

- 🟡 `backend/src/modules/room-types/room-types.service.ts:57` — `RoomType` is hard-deleted with `prisma.roomType.delete()`; a deletion races with in-flight reservation queries and permanently loses the type name/price from historical audit records.
  **Why:** principle 11 / `04-secure-defaults.md §hard-delete`. **Fix:** add `isActive` flag to `RoomType` and soft-delete instead.

---

## 12. Supply Chain — FAIL

- 🔴 `backend/package.json` (transitive: `multer@2.1.1` → `form-data@4.0.5`) — **GHSA-hmw2-7cc7-3qxx**: CRLF injection via unescaped multipart field names/filenames in `form-data <4.0.6`. Present in the production dependency tree.
  **Why:** principle 12 / `12-supply-chain.md §known-vulnerabilities`. **Fix:** upgrade `multer` to a version that resolves `form-data >=4.0.6`.

- 🟡 `backend/package.json` (transitive: Jest chain → `js-yaml <=4.1.1`) — **GHSA-h67p-54hq-rp68**: quadratic-complexity DoS in YAML merge-key handling. Dev dependency only; 19 moderate advisories cascade from the same root cause.
  **Why:** principle 12 / `12-supply-chain.md §known-vulnerabilities`. **Fix:** upgrade `jest` + `ts-jest` to a major version that pulls `js-yaml >=4.1.2`; needs human decision (breaking major change).

- 🟡 `backend/package.json` — All direct dependencies use `^` (caret) ranges; `npm install` (not `npm ci`) would pull any minor bump without review.
  **Why:** principle 12 / `12-supply-chain.md §version-pinning`. **Fix:** use `npm ci` in CI; pin exact versions for critical prod deps.

- 🟡 `backend/package.json` — `prisma` (`preinstall`) and `@prisma/client` (`postinstall`) run arbitrary Node scripts at install time to download binary engines; `@nestjs/core` (`postinstall`) runs `opencollective` making an outbound network call.
  **Why:** principle 12 / `12-supply-chain.md §install-hooks`. **Fix:** pin `prisma` to exact version; add `DISABLE_OPENCOLLECTIVE=1` and `HUSKY=0` to CI environment.

- 🔵 `backend/package-lock.json` — lockfile exists on disk but this is not a git repository; cannot confirm it is committed to version control.
  **Why:** principle 12 / `12-supply-chain.md §lockfile`. **Fix:** confirm `package-lock.json` is tracked in version control.

---

## Out-of-code (process/infra) notes

- No rate-limiting implementation was found on auth endpoints in the source. CLAUDE.md specifies "Rate limit auth endpoints: 30 req/min per IP" — not implemented in Phase 1 code. This is an architectural gap to address before production.
- `BranchGuard` exists in `src/common/guards/` but is applied to zero routes. Branch isolation is enforced ad-hoc per-service. A developer adding a new route who forgets the service-level check has no safety net guard. Recommend applying as a global guard or annotating explicitly on all branch-scoped controllers.

---

## Low-confidence / needs human review

- 🟡? `backend/src/modules/users/users.service.ts` — whether `hotel_manager` can reach other managers in the same branch via the `update` endpoint depends on the RBAC query scope in `findAll`; the ownership check was read but the cross-branch enumeration path was not fully traced in the controller layer. Needs integration test to confirm.

---

## Coverage gaps & follow-ups

- **Not scanned:** frontend (`/home/runner/hotel-management-system/frontend`) — XSS surface, token storage in localStorage/memory, CSRF token handling in Next.js proxy, client-side authorization bypasses.
- **Not scanned:** `reservations`, `check-in`, `availability`, `housekeeping`, `reports` modules — not yet implemented (Phase 1 scope). Re-audit when added; IDOR risk is high in reservation endpoints.
- **Not scanned:** database migration files / Prisma schema for column-level permissions.
- **Not scanned:** WebSocket (`socket.io`) authentication and channel-level authorization.
- **Out of scope here:** infrastructure (Docker, nginx, TLS, exposed ports) → `/infra-audit`.
- **Out of scope here:** runtime confirmations of findings → `/runtime-confirm`.
- **Blind spot:** cross-service data flows (e.g., `NotificationService` in Phase 5+) not yet audited.

---

## Method

- Auditors (read-only): `appsec-auditor` ×4 (authn-authz, input-files, data-secrets-sessions, errors-defaults) + `dependency-auditor` ×1 (supply-chain) — parallel.
- Baseline: 16 principles in `secure-code-review/references/`.
- Every 🔴 was spot-checked against actual source lines before listing.
- `/security-review` verify pass: **skipped** — directory is not a git repository (no diff available).
