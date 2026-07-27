# Software Security Findings — Hotel Management System — 2026-07-07

> Read-only audit against the 16 software-security principles. No code was modified.
> Scope: `/home/runner/hotel-management-system` (backend + frontend).
> Stack: NestJS 11 + Next.js 16, TypeScript strict, PostgreSQL, Redis.
> Verify pass: /security-review **skipped** — not a git repo at the runner root (`/home/runner`).

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | 8 |
| 🟡 risk | 11 |
| 🔵 nit | 4 |
| Supply chain (GHSA/CVE) | 2 moderate · 4 low |

**Principles covered:** 11 / 11 code-auditable · **Domains:** authn/authz · input/files · data/secrets/sessions · errors/defaults · supply-chain

**New modules since June 17 audit:** `availability`, `billing`, `check-in`, `guest-portal`, `notifications`, `reservations` — all audited.

Top 3 to fix first:
1. 🔴 `backend/src/modules/guest-portal/guest-portal.service.ts:291` — stub payment gate lets guests pay nothing
2. 🔴 `frontend/lib/api/auth.ts:44` — JWT stored in `localStorage` (XSS-readable)
3. 🔴 `backend/src/modules/billing/payment.service.ts:249` — Stripe webhook silently accepted with no signature when secret is absent

---

## 1. Authentication — WARN

- 🟡 `backend/src/modules/auth/auth.controller.ts:27` — `access_token` cookie set `httpOnly: false`; browser JS can read it directly. Comment at line 24–26 documents this as intentional (Next.js proxy strips Cookie headers when forwarding requests, so the token must be readable as Bearer). XSS in the frontend exposes the token for its 15-minute window. **Why:** `06-tokens-and-sessions.md §Transport & storage`. **Fix:** couldn't find a clean fix — needs human decision. Remove `localStorage` redundancy (see P6 below) to at least eliminate the second exposure vector.

---

## 2. Authorization (IDOR / ownership) — FAIL

- 🔴 `backend/src/modules/guest-portal/guest-portal.service.ts:98` — `sendPortalLinkByStaff` fetches `reservation` by caller-controlled `:reservationId` with no branch-ownership check. The controller receives `@CurrentUser() _user` (underscore — never forwarded to the service), so a receptionist in branch A can trigger portal-link generation and email delivery for reservations in branch B. **Why:** `07-authorization-and-roles.md §IDOR`. **Fix:** pass `user: JwtPayload` to the service and call `assertBranchAccess(reservation.branchId, user)` before generating the link.

- 🔴 `backend/src/modules/guest-portal/guest-portal.controller.ts:107` — `listTokens` (line 107) and `revokeTokens` (line 115) carry no `@CurrentUser()` decorator; `listActiveTokens` and `revokeAllTokens` in the service perform no branch check. A `hotel_manager` from any branch can enumerate or revoke guest portal tokens for reservations belonging to other branches. **Why:** `07-authorization-and-roles.md §IDOR`. **Fix:** add `@CurrentUser() user: JwtPayload` to both handlers, pass to service, add branch ownership assertion.

- 🔴 `backend/src/modules/guest-portal/guards/guest-token.guard.ts:39` — `GuestPaymentTokenGuard` validates token existence and `usedAt` but never checks `payload.purpose`; all tokens are created with `purpose: 'view'` (`guest-portal.service.ts:54`), so any valid guest view-token can reach `POST /v1/portal/reservation/:token/payment` and trigger payment processing. **Why:** `07-authorization-and-roles.md §Where the check must live`. **Fix:** add `if (payload.purpose !== 'payment') throw new ForbiddenException('TOKEN_WRONG_PURPOSE')` in the guard; add a new `POST /v1/portal/reservation/:viewToken/init-payment` endpoint that validates the view token and returns a short-lived `purpose: 'payment'` token.

- 🟡 `backend/src/modules/billing/billing.controller.ts:199` — `GET /v1/service-catalog` decorated with only `@UseGuards(JwtAuthGuard)` — no `RolesGuard` and no `@Roles()`. Any authenticated user regardless of role (including `housekeeping`) can read service-catalog pricing. **Why:** `07-authorization-and-roles.md §RolesGuard gaps`. **Fix:** add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('chain_admin', 'hotel_manager', 'receptionist')`.

---

## 3. Input Validation — WARN

- 🟡 `backend/src/modules/billing/billing.controller.ts:173` — `@Body() body: { amount: number; description?: string }` is a plain TypeScript interface, not a class-validator DTO class. NestJS `ValidationPipe` resolves the metatype to `Object` at runtime and skips all validation and whitelisting. `description` has no length bound; extra fields pass through unfiltered. **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** extract `ApplyDiscountDto` class with `@IsNumber() @IsPositive() amount` and `@IsOptional() @IsString() @MaxLength(255) description`.

- 🟡 `backend/src/modules/billing/billing.controller.ts:207` — same problem: `@Body() body: { branchId: string; chargeType: string; price: number }` is a plain object, bypassing `ValidationPipe`. `chargeType` is cast `as never` in the service to bypass TypeScript enum check, so an invalid value propagates to Prisma as a `PrismaClientValidationError`. **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** create `UpsertCatalogEntryDto` with `@IsEnum(ChargeType) chargeType`, `@IsNumber() @IsPositive() price`, `@IsUUID() branchId`.

- 🟡 `backend/src/modules/guest-portal/dto/online-check-in.dto.ts:26` — `specialRequests?: string` has `@IsOptional() @IsString()` but no `@MaxLength()`. This field is accepted via a public guest-portal endpoint (throttled at 20 req/min); no DB-level length constraint exists (`@db.Text`). An attacker with a valid portal token can persist multi-megabyte strings. **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** add `@MaxLength(2000)`.

- 🔵 `backend/src/modules/availability/dto/get-availability.dto.ts:18` — `floor?: number` (line 18) and `maxOccupancy?: number` (line 20) have `@IsOptional()` but no `@IsInt()` or `@Min(0)`. With `enableImplicitConversion: true` in `main.ts`, query strings are coerced to numbers but float or negative values pass unrejected. **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** add `@IsInt() @Min(0)` to both fields.

---

## 4. Data Protection — PASS

No over-collection or unmasked PII found in response shapes. Sensitive reads use Prisma `select` projections. See P5 below for privacy gap.

---

## 5. Privacy by design — WARN (out-of-scope for code; see `/privacy-audit`)

No personal-data field mapping, retention/cleanup mechanism, or delete/export capability found in code. Guests' `passportId`, `phone`, `email`, and `fullName` are collected and stored but no deletion or correction endpoint exists. **Note:** full Amendment 13 audit → run `/privacy-audit`.

---

## 6. Sessions & tokens — FAIL

- 🔴 `frontend/lib/api/auth.ts:44` — JWT access token written to `localStorage` on every login (`localStorage.setItem('auth_token', data.accessToken)`). Any XSS in the Next.js app can exfiltrate the token. The token is already available from the non-`httpOnly` `access_token` cookie; `localStorage` adds a second, redundant exposure. **Why:** `06-tokens-and-sessions.md §Transport & storage`. **Fix:** remove `localStorage.setItem('auth_token', …)` and the corresponding `logout` cleanup; update `getAccessToken()` in `client.ts` to read only from `document.cookie`.

- 🔴 `frontend/lib/api/client.ts:38` — refreshed access token is also written to `localStorage` on every silent refresh, re-exposing the JWT to XSS. **Why:** `06-tokens-and-sessions.md §Transport & storage`. **Fix:** same as above — remove the `localStorage.setItem` in `doRefresh()`.

---

## 7. Safe file handling — PASS

No upload handlers (`FileInterceptor`, `multer`, `@UploadedFile`) found in the backend. Not applicable.

---

## 8. Secure communication — FAIL

- 🔴 `backend/src/modules/billing/payment.service.ts:249` — when `STRIPE_WEBHOOK_SECRET` is absent (currently empty in `backend/.env:30`), `handleStripeWebhook` logs a warning and silently returns `void`. The controller responds `{ received: true }` (HTTP 200) without verifying the signature. Any unauthenticated POST with a crafted `payment_intent.succeeded` body will be accepted and can mark arbitrary payments as paid. **Why:** `11-secure-communication.md §Authenticating the caller`. **Fix:** throw `InternalServerErrorException` when the secret is absent — treat missing secret as a fatal misconfiguration.

- 🟡 `backend/src/modules/rooms/room-status.gateway.ts:14` — WebSocket gateway sets `cors: { origin: '*' }`, allowing any web origin to open a WebSocket connection to `/ws`. This contradicts the explicit origin allowlist enforced for HTTP endpoints in `main.ts`. **Why:** `11-secure-communication.md §CORS`. **Fix:** replace `'*'` with `process.env.FRONTEND_URL` (same pattern used in `main.ts`).

---

## 9. Logging & monitoring — WARN

- 🟡 `backend/src/modules/guest-portal/guest-portal.service.ts:66` — the full portal URL including the raw 64-char hex access token is logged at INFO level (`this.logger.log(… portalUrl)`). Anyone with log-system read access can replay the token within its 24-hour validity window to access a guest's reservation, invoice, and trigger payment. **Why:** `10-logging-and-audit.md §What to NEVER log`. **Fix:** log only `reservationId` and `expiresAt`; never include the raw URL.

- 🟡 `backend/src/modules/notifications/notification.service.ts:15` — stub `sendEmail()` logs the full email body at INFO level. If callers pass a portal link (with raw token), PII, or financial data in `body`, it appears in application logs in plaintext. **Why:** `10-logging-and-audit.md §What to NEVER log`. **Fix:** log only recipient and subject; never log the body.

- 🟡 `backend/src/modules/notifications/n8n.service.ts:8` — eight n8n webhook path-segments (e.g. `vOZ77rpHCNDjHYrT`, `QNz3j1O2wnsVcuhZ`, …) are hardcoded in TypeScript source. These are effectively API credentials embedded in code — if the source is ever shared, all eight n8n endpoints become callable by unauthorized parties. **Why:** `09-secrets-management.md §Where secrets must (and must not) live`. **Fix:** move each path to an environment variable (e.g. `N8N_WEBHOOK_RESERVATION_CONFIRMED`) and read via `ConfigService`.

---

## 10. Error handling (fail-closed) — FAIL

- 🔴 `backend/src/modules/guest-portal/guest-portal.service.ts:291` — `processPortalPayment` determines payment success via `dto.provider !== 'stripe' || !dto.token?.includes('fail')` (a test stub). Sending `provider: 'manual'` or `provider: 'tranzila'` unconditionally evaluates to `succeeded = true`, marks the invoice `paid`, and records a payment row with zero real money collected. Any guest with a valid portal token can zero out their bill. **Why:** `03-error-handling.md §2` (fail-closed on payment logic). **Fix:** remove the stub condition; route portal payments through the real payment providers (`StripeProvider`, `TranzilaProvider`, `ManualProvider`) using the same `selectProvider` pattern as `PaymentService.initiatePayment`.

- 🔴 `backend/src/modules/billing/providers/tranzila.provider.ts:17` — `TranzilaProvider.charge()` always returns `status: 'succeeded'` (stub, no real HTTP call). Any payment routed to `provider: 'tranzila'` via `PaymentService` or the portal flow records as paid without charging the guest. **Why:** `03-error-handling.md §2`. **Fix:** throw `NotImplementedException('TRANZILA_NOT_IMPLEMENTED')` until a real merchant account is wired; prevents silent fake payments.

- 🟡 `backend/src/modules/billing/payment.service.ts:289` — `getPosStatus()` always returns `{ status: 'succeeded' }` unconditionally (stub). Any caller checking POS terminal status receives a false success regardless of terminal state. **Why:** `03-error-handling.md §2`. **Fix:** throw `NotImplementedException('POS_NOT_IMPLEMENTED')` until a real POS terminal is wired.

---

## 11. Secure defaults — WARN

- 🔵 `backend/Dockerfile.dev:11` — `NODE_TLS_REJECT_UNAUTHORIZED=0` is set as an inline env prefix for the `npm run prisma:generate` build step, disabling TLS certificate verification for all HTTPS connections made during that command. **Why:** `04-secure-defaults.md §9`. **Fix:** remove the prefix; `prisma generate` reads the schema file and does not connect to any DB.

- 🔵 `backend/src/health/health.controller.ts:6` — `GET /health` endpoint is unauthenticated and returns `process.env.npm_package_version`, exposing the precise application version to unauthenticated callers. **Why:** `04-secure-defaults.md §3`. **Fix:** remove the `version` field from the public health response.

- 🔵 `backend/src/modules/guest-portal/guest-portal.controller.ts:54` — a synthetic `JwtPayload` with `role: 'chain_admin'` and `branchId: null` is constructed to bypass `InvoicePdfService.assertAccess()` for guest PDF downloads. If `assertAccess` is ever hardened, this bypass will silently elevate guest access. **Why:** `04-secure-defaults.md §1`. **Fix:** add a `guestPortal: boolean` overload to `assertAccess` that skips the branch check without impersonating a privileged role.

---

## Supply chain findings

| Severity | ID | Location | Issue | Fix |
|---|---|---|---|---|
| 🟡 MODERATE | GHSA-qx2v-qp2m-jg93 | `frontend/package.json:16` | PostCSS <8.5.10 bundled in `next@16.2.6` — `</style>` escape failure, XSS in CSS-inlined pages | Await Next.js release vendoring postcss ≥8.5.10 |
| 🟡 MODERATE | GHSA-h67p-54hq-rp68 | `frontend/package.json:16` | `js-yaml@4.1.1` in `eslint-config-next` — quadratic DoS on deeply nested merge-key YAML | Await fix in `eslint-config-next` upstream |
| 🟡 MODERATE | n/a | `backend/package.json:14` | `postinstall: "prisma generate"` — arbitrary code execution on every `npm install`/`npm ci` if any dep in the tree is compromised | Remove `postinstall`; call `npm run prisma:generate` explicitly in CI after `npm ci --ignore-scripts` |
| 🔵 LOW | GHSA-h67p-54hq-rp68 | `backend/` (dev) | `js-yaml@<3.15.0` via `@istanbuljs/load-nyc-config` — same DoS, dev/test only | Await fix upstream |
| 🔵 LOW | n/a | `frontend/package.json:24` | `@tailwindcss/postcss: "^4"` — wide major-version float | Tighten to `"~4.x.y"` matching current lockfile version |
| 🔵 LOW | n/a | `frontend/package.json:30` | `tailwindcss: "^4"` — same wide float | Tighten to `"~4.x.y"` |

---

## Out-of-code (process/infra) notes

- `backend/.env:28` — a real Stripe test-mode secret key (`sk_test_51TnNM73…`) is present on disk. The `.gitignore` lists `.env` as excluded but if accidentally staged, all payment credentials are exposed. **Action:** confirm via `git log -S sk_test_` that it has never been committed; rotate the key; provide `.env.example` with placeholders only.
- Branch isolation invariant: all entities must include `branchId`; queries must filter by JWT branch. The IDOR findings above (P2) are violations of this invariant.

## Low-confidence / needs human review

- 🟡? `backend/src/modules/auth/auth.controller.ts:27` — `httpOnly: false` access token. Documented as intentional (proxy bypass); whether the risk is acceptable is an architectural decision. The `/e2e-security` run should attempt XSS + token-theft scenario to confirm exploitability.

## Coverage gaps & follow-ups

- **Frontend coverage:** `frontend/` audited for auth storage and API client only. React component security (XSS sinks, dangerouslySetInnerHTML, URL injection), client-side authz bypasses — **not audited**. Run `/e2e-security`.
- **Runtime behavior:** Stripe webhook `0.0.0.0` binding, actual port exposure — confirmed in config but internet reachability depends on cloud firewall. Run `/runtime-confirm`.
- **Israeli Amendment 13:** PII handling, data-subject rights, security level — **not audited** here. Run `/privacy-audit` (high priority).
- **Supply chain CVEs:** upstream packages — no direct upgrade path available; track `next.js` and `eslint-config-next` releases.
- **WebSocket channel authz:** `socket.io` channel authorization not traced end-to-end.

## Method

- Auditors (read-only): `appsec-auditor` ×4 (authn-authz · input-files · data-secrets-sessions · errors-defaults) + `dependency-auditor` ×1 (supply-chain). All run in parallel.
- Baseline: the 11 code-auditable principles in `secure-code-review/references/02-software-principles.md`.
- Each 🔴 was spot-checked against actual source lines before listing.
- `/security-review` skipped — requires git repository at current working directory.
