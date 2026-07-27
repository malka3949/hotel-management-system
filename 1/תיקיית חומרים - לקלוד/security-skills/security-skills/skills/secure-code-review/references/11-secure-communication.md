# Secure communication — deep dive

Expands principle 8 (`02-software-principles.md`). Covers every hop data takes: browser ↔ server, server ↔
internal services, server ↔ external APIs, and inbound webhooks. Each transfer must be **encrypted,
authenticated (both ends know who they're talking to), and rate-limited.**

Core rule: **encrypt in transit, verify the origin, never trust the network, and never put secrets in a URL.**

---

## Transport encryption (TLS/HTTPS)
- **HTTPS everywhere**, including internal service-to-service where feasible. No plaintext HTTP for anything
  carrying credentials/PII.
- **HSTS** header to force HTTPS; redirect HTTP→HTTPS.
- Validate certificates on outbound calls — **never disable TLS verification** (`verify=False`,
  `rejectUnauthorized:false`) outside a controlled test.
- **AUDIT:** disabled cert verification; plaintext HTTP endpoints; missing HSTS on an auth'd app.

## Authenticating the caller
- **Outbound to vendors:** API key/OAuth in an `Authorization` header (never the query string).
- **Inbound webhooks:** verify a **signature** (HMAC over the raw body with a shared secret) — this proves
  origin + integrity. Compare with a **constant-time** equal (timing-safe), not `==`. Verify against the
  **raw** body bytes (re-serializing JSON breaks the signature).
- **Internal APIs:** still authenticate; don't assume "internal = trusted" (a compromised service or SSRF
  can reach it).
- **AUDIT:** webhook handler with no signature verification; signature compared non-constant-time; vendor
  key in a URL; internal endpoint with no auth ("trusted network" assumption).

## Replay protection
A captured-and-resent valid request can repeat an action (double charge, re-trigger).
- Webhooks: check a **timestamp** (reject if too old) + a **nonce/event-id** processed once (idempotency).
- Sensitive operations: idempotency keys so a retransmit is a no-op (ties to principle 10 retry safety).
- **AUDIT:** webhook/payment handler with no timestamp+nonce/idempotency → replayable.

## Rate limiting & abuse control
- Rate-limit auth endpoints (login, reset, OTP, signup) to blunt brute-force and enumeration.
- Rate-limit public/expensive endpoints and per-API-key for integrations.
- Add lockout/backoff and CAPTCHA where appropriate; protect against basic DoS (cross-ref CIA availability,
  `01-cia-and-domains.md`).
- **AUDIT:** no rate limit on login/reset/OTP/public endpoints.

## Internal vs external boundary
- Separate the **public** API surface from **internal/admin** surfaces; don't expose internal/debug/management
  endpoints publicly.
- **CORS:** allowlist specific origins; **never** reflect arbitrary `Origin` or use `*` with credentials.
- Don't leak internal hostnames/topology in responses/errors.
- **AUDIT:** wildcard/origin-reflecting CORS (esp. with credentials); internal/debug/admin endpoints reachable
  from the public internet.

## Secrets in transit — the recurring sin
Never in the URL/query string (logged everywhere, leaks via `Referer`). Always in headers or the encrypted
body. (Cross-ref `06-tokens-and-sessions.md`, `09-secrets-management.md`.)

## Audit checklist (what the auditor greps for)
```text
🔴 webhook handler with no signature verification
🔴 signature compared with == (not timing-safe) or against re-serialized body
🔴 TLS/cert verification disabled on outbound calls
🔴 secret/token in a URL query string
🟡 no replay protection (timestamp + nonce/idempotency) on webhooks/payments
🟡 no rate limit on login/reset/OTP/signup/public endpoints
🟡 CORS reflects arbitrary Origin or uses * with credentials
🟡 internal/admin/debug endpoint reachable publicly; "internal = trusted" assumption
🟡 missing HSTS / HTTP not redirected to HTTPS
```

> Server/TLS termination, network segmentation, firewall/port exposure are **infra** (domain 2) — out of
> scope for a code audit; note them as context. Webhook *signing-secret storage* → `09-secrets-management.md`.
