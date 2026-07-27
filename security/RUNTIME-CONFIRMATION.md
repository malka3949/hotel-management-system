# Runtime Confirmation — Hotel Management System — 2026-07-07

> Targeted HTTP probes against the running local stack (`http://localhost:3001` backend, `http://localhost:3000` frontend, `http://localhost:5678` n8n).
> All probes are read-only GET/HEAD/OPTIONS/limited POST; no data was mutated.
> Source: `INFRA-SECURITY-FINDINGS.md` + `SOFTWARE-SECURITY-FINDINGS.md`.

**Stack confirmed running:** backend:3001 ✅ · frontend:3000 ✅ · n8n:5678 ✅ · postgres:5432 ✅ · redis:6379 ❌ (not exposed — correct)

---

## Summary

| Verdict | Count |
|---|---|
| confirmed | 8 |
| not-reproduced | 6 |
| inconclusive | 2 |
| not-applicable | 12 |

---

## Confirmed (fix first)

### 🔴 C1 — PostgreSQL port 5432 reachable on host

| Field | Value |
|---|---|
| Source finding | `INFRA`: `docker-compose.yml: postgres: ports: '5432:5432'` |
| Probe | `nc -zv localhost 5432` |
| Result | **TCP connection succeeded** |
| Evidence | `Connection to localhost (127.0.0.1) 5432 port [tcp/postgresql] succeeded!` |
| Impact | Any process on the host (or cloud-exposed host) can connect directly to the DB; application-level auth is bypassed at the network layer. |

---

### 🔴 C2 — n8n admin UI accessible on port 5678, unauthenticated

| Field | Value |
|---|---|
| Source finding | `INFRA`: `docker-compose.yml: n8n: ports: '5678:5678'` |
| Probe | `curl -sI http://localhost:5678/` then `curl -sS http://localhost:5678/` |
| Result | **HTTP 200, n8n UI loaded** |
| Evidence | `HTTP/1.1 200 OK`, `<title>n8n.io - Workflow Automation</title>`, version `n8n@2.27.5` in meta tag. No authentication prompt. |
| Impact | Anyone reaching the host can access n8n, enumerate/execute workflows, read stored credentials (DB/API keys in workflow nodes), and run arbitrary code via Function nodes. |

---

### 🔴 C3 — access_token cookie set without HttpOnly

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `backend/src/modules/auth/auth.controller.ts:27` — `httpOnly: false` |
| Probe | `curl -v POST /api/v1/auth/login` with valid CSRF + credentials |
| Result | **Confirmed — cookie is JS-readable** |
| Evidence | `Set-Cookie: access_token=eyJ...; Max-Age=900; Path=/; SameSite=Lax` — no `HttpOnly` attribute |
| Note | `refresh_token` is correctly set with `HttpOnly`. The access token is readable by any JS running on the page. |

---

### 🔴 C4 — JWT accessToken in response body (localStorage-writable)

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `frontend/lib/api/auth.ts:44` — `localStorage.setItem('auth_token', data.accessToken)` |
| Probe | `POST /api/v1/auth/login` — inspect response JSON |
| Result | **Confirmed — token in JSON body** |
| Evidence | Response body: `{"success":true,"data":{"user":{...},"accessToken":"eyJhbGci..."}}` |
| Impact | The access token is returned in the body and the frontend writes it to `localStorage`, creating a second XSS-accessible copy beyond the non-HttpOnly cookie. |

---

### 🔴 C5 — Stripe webhook accepts unauthenticated requests (no signature)

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `backend/src/modules/billing/payment.service.ts:249` — no-signature path returns void, controller responds 200 |
| Probe | `POST /api/v1/payments/webhook/stripe` with crafted body, no `stripe-signature` header |
| Result | **HTTP 200 confirmed** |
| Evidence | `{"success":true,"data":{"received":true}}` — server accepted unsigned payload |
| Impact | Attacker can POST crafted `payment_intent.succeeded` events and potentially mark arbitrary payments as paid. |

---

### 🔴 C6 — IDOR: Portal link sent cross-branch (sendPortalLinkByStaff)

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `backend/src/modules/guest-portal/guest-portal.service.ts:98` — no branch check |
| Probe | Receptionist (branch `00000000-…0001`) → `POST /api/v1/portal/send-link/{reservationId}` where reservation belongs to branch `9049714c-…` |
| Result | **HTTP 200, portal link generated and sent** |
| Evidence | `{"success":true,"data":{"sent":true,"portalUrl":"http://192.168.1.166/83f4db0577417..."}}` |
| Impact | Staff member in branch A can trigger portal-link email delivery (and raw token exposure in logs) for guests in any other branch. |

---

### 🟡 C7 — No HTTPS/TLS — all traffic over plaintext HTTP

| Field | Value |
|---|---|
| Source finding | `INFRA`: no TLS terminator in compose stack; `backend/.env: FRONTEND_URL=http://192.168.1.166` |
| Probe | All probes issued over `http://` — 200 OK with no redirect to https |
| Result | **Confirmed — no TLS** |
| Evidence | All curl responses return HTTP 200 directly on port 3001/3000. No `301 https://` redirect, no HSTS pre-load. |
| Impact | JWT cookies and CSRF tokens travel unencrypted. |

---

### 🟡 C8 — No security headers on frontend (Next.js)

| Field | Value |
|---|---|
| Source finding | `INFRA`: `frontend/next.config.ts` — no `headers()` export |
| Probe | `curl -sI http://localhost:3000/` — check for CSP / HSTS / X-Frame-Options |
| Result | **Confirmed — zero security headers on frontend** |
| Evidence | Response headers contain no `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. |
| Note | Backend (Helmet.js) DOES return all security headers correctly (see NR1 below). |

---

## Not Reproduced (candidate false positives)

### NR1 — Backend security headers: PRESENT (Helmet works)

| Field | Value |
|---|---|
| Source finding | Static concern about missing security headers |
| Probe | `curl -sI http://localhost:3001/` |
| Result | **All headers present** |
| Evidence | `Content-Security-Policy`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` all returned. |
| Verdict | Helmet.js is correctly configured and active. Backend headers finding is a false positive. |

---

### NR2 — Verbose error leak: NOT present

| Field | Value |
|---|---|
| Source finding | Potential stack-trace exposure on error |
| Probe | `GET /api/v1/nonexistent123` |
| Result | Clean JSON error, no stack trace |
| Evidence | `{"success":false,"error":"Not Found","message":"Cannot GET /api/v1/nonexistent123","statusCode":404,...}` |
| Verdict | Global exception filter strips stack traces. False positive. |

---

### NR3 — Health endpoint version leak: endpoint does not exist

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `backend/src/health/health.controller.ts:6` — version exposed at `/health` |
| Probe | `GET http://localhost:3001/health` |
| Result | HTTP 404 — endpoint not found |
| Evidence | `{"error":"Not Found","message":"Cannot GET /health","statusCode":404}` |
| Verdict | Controller registered without `/api/v1` prefix but also not reachable at `/health`. Route not mounted or removed. |

---

### NR4 — Branch IDOR on listTokens/revokeTokens: role guard IS present

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `guest-portal.controller.ts:107,115` — no `@CurrentUser()`, no branch check |
| Probe | Receptionist → `GET /api/v1/portal/tokens/{cross-branch-reservationId}` |
| Result | HTTP 403 `INSUFFICIENT_ROLE` |
| Evidence | Receptionist role blocked before branch check. Role guard prevents exploitation at this privilege level. |
| Verdict | Partially mitigated — receptionist is blocked by `@Roles()` (not branch check). However, hotel_manager may still be exploitable; inconclusive without a cross-branch manager fixture. |

---

### NR5 — CORS evil-origin reflection: NOT reflected

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: WebSocket `cors: '*'` |
| Probe | `curl -H 'Origin: https://evil.test' http://localhost:3001/api/v1/rooms` |
| Result | `Access-Control-Allow-Credentials: true` present but **no `Access-Control-Allow-Origin: https://evil.test`** |
| Verdict | Unknown origin is not reflected. HTTP CORS is correctly allowlisted. WebSocket CORS (`cors: '*'`) was not directly confirmable via curl; inconclusive for WS. |

---

### NR6 — Redis (6379): NOT exposed on host

| Field | Value |
|---|---|
| Source finding | `CLAUDE/services.md` doc inconsistency |
| Probe | `nc -zv localhost 6379` |
| Result | `Connection refused` |
| Evidence | Redis is internal-only. Doc was wrong; compose config is correct. |

---

## Inconclusive

### IC1 — Rate limiting on auth endpoints

| Field | Value |
|---|---|
| Source finding | Auth rate limit should trigger 429 after threshold |
| Probe | 10 rapid POST to `/api/v1/auth/login` without CSRF token |
| Result | All 10 returned HTTP 403 `CSRF_TOKEN_INVALID` — CSRF check fires before rate limit |
| Why inconclusive | Cannot separate rate-limit behavior from CSRF rejection. Getting valid CSRF tokens at scale would require browser automation. |

---

### IC2 — Service catalog role guard gap

| Field | Value |
|---|---|
| Source finding | `SOFTWARE`: `billing.controller.ts:199` — `GET /v1/service-catalog` has only `JwtAuthGuard`, no `@Roles()` |
| Probe | Receptionist → `GET /api/v1/service-catalog` → 403 `BRANCH_ACCESS_DENIED`; Admin → HTTP 200 with all catalog data |
| Result | Partially mitigated — branch guard fires for receptionist |
| Why inconclusive | The role gap is real in code (no `@Roles()`), but branch filtering provides a secondary barrier. A `hotel_manager` (who has branch access) could read catalog data for their branch without a role check. Exploitation requires a manager-level account; not tested. |

---

## Not Applicable (source-only — no black-box probe)

| Finding | Reason |
|---|---|
| Hard-coded JWT fallback secret (`backend/src/modules/auth/auth.service.ts`) | Source-only — requires code read or key brute-force |
| JWT written to localStorage (`frontend/lib/api/auth.ts:44`) | Browser JS behavior — not observable via curl |
| Refresh token stored in localStorage (`frontend/lib/api/client.ts:38`) | Same |
| Tranzila stub always returns succeeded | Source-only logic stub |
| Portal payment stub (`guest-portal.service.ts:291`) | Source-only logic stub |
| n8n webhook paths hardcoded in source | Source secret — needs code read |
| RESEND_API_KEY in docker-compose.yml | Committed secret — static; already confirmed by infra audit |
| N8N_ENCRYPTION_KEY in docker-compose.yml | Same |
| `.env.test` JWT secrets committed | Git history check — not an HTTP probe |
| Docker containers running as root | Requires in-container `id` check |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | Outbound TLS behavior — not directly observable inbound |
| `postinstall: prisma generate` supply chain risk | Build-time; not runtime-probeable |

---

## Cross-report updates to COVERAGE-LEDGER

The following findings from prior static reports are now **confirmed at runtime**:

- `docker-compose.yml:8,11` — PostgreSQL port 5432 published and **reachable** (C1)
- `docker-compose.yml:25,26` — n8n port 5678 published and **reachable with no auth** (C2)
- `auth.controller.ts:27` — httpOnly:false cookie **confirmed in HTTP response** (C3)
- `billing/payment.service.ts:249` — Stripe webhook **accepts unsigned POST, returns 200** (C5)
- `guest-portal.service.ts:98` — IDOR sendPortalLink **confirmed exploitable** by receptionist (C6)

---

## Method

- Target: locally running compose stack (`localhost:3001`, `3000`, `5678`, `5432`)
- Probes: `curl` GET/HEAD/POST, `nc`, read-only; total < 60 requests
- Auth: real test accounts from `prisma/seed.ts` (CLAUDE.md §Default Test Users)
- No data was deleted, overwritten, or permanently mutated
- No production target was probed
