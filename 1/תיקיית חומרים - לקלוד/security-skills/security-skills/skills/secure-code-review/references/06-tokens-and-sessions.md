# Tokens & sessions — deep dive

Expands principle 6 (`02-software-principles.md`). After login, the system identifies a returning user
by *something they hold*. **Whoever holds that token can act as the user** — so the whole security of a
session rests on how the token is minted, transported, stored, expired, and revoked.

Core rule: a token must be **short-lived · hard to guess · protected in transit & at rest · revocable ·
never in logs · never in a URL · scoped to the least it needs.**

---

## Token types — what each is, the risk, the practice

### 1. Session ID (server-side session)
Opaque random id; the real state lives server-side (DB/Redis). The cookie holds only the id.
- **Risk:** session fixation, session hijacking, cookie theft (XSS), CSRF.
- **Practice:** ≥128-bit CSPRNG id · `HttpOnly` + `Secure` + `SameSite=Lax/Strict` cookie · **regenerate
  the id on login and on privilege change** (kills fixation) · server-side idle + absolute timeout ·
  store minimal data server-side.
- **AUDIT:** cookie flags present? id regenerated post-login? sessions invalidated server-side on logout?

### 2. JWT (stateless access token)
Signed claims the server verifies without a lookup. Fast, but **hard to revoke** — valid until expiry.
- **Risk:** `alg:none` / algorithm-confusion (HS256↔RS256), weak/leaked signing secret, no expiry, oversized
  claims (PII), trusting an unverified token, no audience/issuer check.
- **Practice:** pin the algorithm server-side (never trust the header `alg`) · strong secret / asymmetric
  keys · **short `exp` (5–15 min)** · validate `exp/nbf/iss/aud` · no sensitive data in the payload (it's
  base64, not encrypted) · keep a revocation/`jti` denylist or short TTL for the "log out everywhere" case.
- **AUDIT:** is `alg` hard-coded on verify? is `exp` set and short? secret in env (not code)? PII in claims?

### 3. Access token + 4. Refresh token (the pair)
Short-lived access token for requests; long-lived refresh token to mint new access tokens.
- **Risk:** a stolen long-lived refresh token = persistent access; refresh-token replay.
- **Practice:** access short (minutes), refresh longer but **rotated on every use** (one-time-use) with
  **reuse detection** → if an old refresh token is presented, revoke the whole family (theft signal) ·
  store refresh tokens hashed server-side · bind to device/client where possible.
- **AUDIT:** rotation on refresh? reuse detection? refresh stored hashed, not plaintext?

### 5. API key
Long-lived secret identifying a machine/integration.
- **Risk:** leaks in repos/logs/URLs; over-broad scope; never expires; shared across tenants.
- **Practice:** store only a **hash** server-side (show the raw key once) · per-key scope + rate limit ·
  prefix for identification (`sk_live_…`) · rotation + expiry policy · per-customer keys, never shared ·
  pass in a header (`Authorization`), never the query string.
- **AUDIT:** keys hashed at rest? scoped & rate-limited? rotatable? ever logged/in URL?

### 6. Magic link (passwordless login)
One-time URL with an embedded token.
- **Risk:** link in browser history/referrer/email logs; reusable; long validity; no device binding.
- **Practice:** single-use · short expiry (5–15 min) · invalidate on use · `POST`-confirm rather than
  act on `GET` where feasible · don't leak the token via `Referer` (use `Referrer-Policy`).
- **AUDIT:** single-use + short expiry + invalidated after consumption?

### 7. Password-reset token
A magic link with elevated consequences.
- **Risk:** account takeover if reusable/long-lived/guessable; user-enumeration via response differences.
- **Practice:** CSPRNG, store **hashed**, single-use, short expiry (≤1h) · invalidate all sessions on
  password change · **uniform response** whether or not the email exists (no enumeration) · rate-limit.
- **AUDIT:** hashed + single-use + short expiry? sessions revoked on reset? enumeration-safe response?

### 8. OAuth / OIDC tokens (third-party identity)
Tokens from Google/Apple/etc.
- **Risk:** missing `state` (CSRF on the callback), unvalidated `id_token`, open redirect on `redirect_uri`,
  accepting tokens not minted for your `client_id`/`aud`.
- **Practice:** verify `state` · validate the `id_token` signature + `iss`/`aud`/`exp` · strict
  `redirect_uri` allowlist · request least scopes.
- **AUDIT:** `state` checked? `id_token` fully validated? redirect_uri allowlisted?

---

## Transport & storage — where tokens live

| Location | Verdict |
|---|---|
| `HttpOnly` `Secure` cookie | **Best for session/refresh** — JS can't read it (XSS-resistant); add `SameSite` + CSRF defense |
| `Authorization: Bearer` header | Good for access tokens / APIs |
| `localStorage` / `sessionStorage` | **Avoid for sensitive tokens** — readable by any XSS |
| URL query string | **Never** — leaks via history, `Referer`, proxy/server logs, analytics |
| In code / committed `.env` | **Never** — see `09-secrets-management.md` |

Always over **HTTPS**. At rest, server-side tokens (refresh, API keys, reset tokens) are stored **hashed**
(SHA-256+), never plaintext — a DB leak then yields nothing usable.

## Lifecycle: expiry, rotation, revocation
- **Expiry:** every token has a TTL. Access minutes; refresh days-weeks with rotation; reset/magic ≤1h.
- **Rotation:** refresh tokens one-time-use; API keys rotatable without downtime (support 2 active keys).
- **Revocation:** there must be a "log out / revoke everywhere" path. Stateless JWT needs a `jti` denylist
  or a per-user "tokens-valid-after" timestamp; sessions just delete server-side.
- **On sensitive change** (password reset, role change, suspected compromise): invalidate existing sessions/tokens.

## Logging — never log tokens
Tokens, session ids, API keys, OTPs, reset tokens, cookies → **never** in logs, error messages, or
analytics. Log a token *reference* (hash prefix / id) if you must correlate. (Ties to principle 9.)

## Audit checklist (what the auditor greps for)
```text
🔴 token/secret in a URL query string (login redirect, reset link, API call)
🔴 JWT verify that trusts the header alg / no exp / signing secret in code
🔴 refresh token stored or compared in plaintext; no rotation / no reuse detection
🔴 reset/magic token reusable or long-lived; sessions not revoked on password change
🟡 cookie missing HttpOnly / Secure / SameSite
🟡 sensitive token in localStorage
🟡 API key not scoped / not rate-limited / never expires
🟡 PII inside a JWT payload
🟡 user-enumeration: login/reset reveals whether an account exists
```

> Out of code (process): where the signing secret / API keys actually live and who can read them →
> `09-secrets-management.md` + `05-operational-permissions.md` §8.
