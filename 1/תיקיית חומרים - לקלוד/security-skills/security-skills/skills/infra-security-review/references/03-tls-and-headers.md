# TLS, HTTPS & security headers — deep dive

Category: `tls-headers`. Audits the proxy/edge config for encrypted, hardened transport.

## AUDIT CHECK

### 1. HTTPS enforced
- HTTP (:80) **redirects** to HTTPS (:443); no sensitive route served over plain HTTP.
- **CHECK:** nginx `server` block on 80 that `proxy_pass`es instead of `return 301 https://...`.

### 2. TLS version & ciphers
- TLS 1.2+ only (no SSLv3/TLS1.0/1.1); modern cipher suite.
- **CHECK:** `ssl_protocols` includes TLSv1/TLSv1.1; weak `ssl_ciphers`.

### 3. HSTS
- `Strict-Transport-Security` header set (with a sane max-age) on HTTPS responses.
- **CHECK:** missing HSTS on an authenticated app.

### 4. Security headers (at the proxy or app)
```text
Content-Security-Policy         — missing/`unsafe-inline`/`*` where HTML renders user data
X-Frame-Options / frame-ancestors — clickjacking (missing = 🟡)
X-Content-Type-Options: nosniff  — MIME sniffing
Referrer-Policy                  — token/path leak via Referer (ties to tokens-in-URL)
Permissions-Policy               — lock down camera/mic/geo if unused
```
- **CHECK:** which of these are absent. Missing CSP on an app that renders user content = 🟡 (🔴 if known XSS sink).

### 5. Cert & proxy hygiene
- Valid, non-expired cert; proxy doesn't disable upstream TLS verification; no `server_tokens on` leaking nginx version.
- **CHECK:** `server_tokens` not `off`; verbose error pages exposing stack/version.

## Output (findings)
```text
🔴 sensitive app served over plain HTTP / no HTTP→HTTPS redirect.
🟡 missing HSTS / TLSv1.0-1.1 enabled / weak ciphers.
🟡 missing CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy.
🔵 server_tokens on (version disclosure).
```

> Whether headers are actually present on a live response → confirm with `runtime-verify` (it curls and
> inspects response headers).
