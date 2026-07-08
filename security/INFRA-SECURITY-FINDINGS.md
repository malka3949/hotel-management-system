# Infrastructure Security Findings — Hotel Management System — 2026-07-07

> Read-only audit of domain-2 infra config (proxy · ports · TLS/headers · containers · secrets/CI).
> No config was modified. Scope: `/home/runner/hotel-management-system/`.
> This audits *config*, not live behavior — confirm reachability with `runtime-verify`.

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | 9 |
| 🟡 risk | 6 |
| 🔵 nit | 2 |

Top 3 to fix first (rotate immediately — no runtime proof needed):
1. 🔴 `docker-compose.yml: RESEND_API_KEY: re_3WD3vmvB_…` — live API key committed in git-tracked file
2. 🔴 `docker-compose.yml: N8N_ENCRYPTION_KEY: rmc3TEszEbar6x…` — n8n encryption key committed in git-tracked file
3. 🔴 `docker-compose.yml: NODE_TLS_REJECT_UNAUTHORIZED: '0'` — TLS verification disabled on backend + n8n at runtime

---

## Network exposure / ports / proxy — FAIL

- 🔴 `docker-compose.yml: postgres: ports: '5432:5432'` — PostgreSQL binds on `0.0.0.0:5432`; any host-level network path (including a public IP if the host is internet-facing) can reach the database directly, bypassing all application authentication. The backend reaches Postgres via the internal `hotel_internal` network at `postgres:5432` — no host port is needed. **Why:** `02-network-and-ports.md §published-ports`. **Fix:** remove the `ports:` stanza from the `postgres` service entirely; or bind to `'127.0.0.1:5432:5432'` for local debugging only.

- 🔴 `docker-compose.yml: n8n: ports: '5678:5678'` — n8n workflow-automation admin UI and API is published on `0.0.0.0:5678` with no reverse-proxy auth guard or IP restriction. The n8n dashboard exposes stored workflow credentials, webhook endpoints, and arbitrary code-execution capability via function nodes. The backend references n8n only as an internal service (`N8N_BASE_URL: http://n8n:5678`). **Why:** `02-network-and-ports.md §published-ports`. **Fix:** remove the `ports:` stanza from the `n8n` service entirely.

- 🟡 `docker-compose.yml: backend: ports: '3001:3001'` — NestJS API published directly on `0.0.0.0:3001` with no reverse proxy in the compose stack. Rate-limiting, TLS termination, and path-based access control that a front proxy would normally provide are absent. **Why:** `02-network-and-ports.md §app-edge`. **Fix:** add an nginx/Traefik service as the single ingress; bind backend to `127.0.0.1:3001:3001` or use `expose:` only.

- 🟡 `docker-compose.yml` — no reverse proxy service (nginx, Traefik, or equivalent) exists anywhere in the compose stack. There is no single TLS-termination point, no central path-routing layer, and no place to enforce auth or IP restrictions at the network edge. **Why:** `02-network-and-ports.md §front-proxy`. **Fix:** introduce an nginx or Traefik service as the only `ports:`-bearing service; all other services use `expose:` only.

- 🔵 `CLAUDE/services.md` — documentation states "Redis exposed on host only in dev", but `docker-compose.yml` has no `ports:` for the redis service (correctly internal-only). The inconsistency could cause a developer to inadvertently add the port to match the docs. **Why:** `02-network-and-ports.md §port-map-hygiene`. **Fix:** correct the `CLAUDE/services.md` note to reflect that Redis has no host port.

---

## TLS / HTTPS / security headers — FAIL

- 🔴 `docker-compose.yml: backend > environment: NODE_TLS_REJECT_UNAUTHORIZED: '0'` (line 61) — The backend container permanently disables TLS certificate validation at runtime. Every outbound HTTPS call (Resend email API, Stripe payments API) skips cert verification; an attacker with network position can intercept and mutate payment or email data without detection. **Why:** `03-tls-and-headers.md §cert-proxy-hygiene`. **Fix:** remove this env var; add the required CA cert to the container trust store via `NODE_EXTRA_CA_CERTS` or `apk add ca-certificates`.

- 🔴 `docker-compose.yml: n8n > environment: NODE_TLS_REJECT_UNAUTHORIZED: '0'` (line 87) — The n8n container permanently disables TLS certificate validation; every webhook call or HTTP node that targets an HTTPS endpoint accepts any certificate, enabling MITM interception of automation payloads and credentials. **Why:** `03-tls-and-headers.md §cert-proxy-hygiene`. **Fix:** same as above — mount or install the trusted CA cert.

- 🔴 `.env: FRONTEND_URL=http://192.168.1.166` (line 11) and no TLS-terminating proxy in `docker-compose.yml` — The application has no HTTPS/TLS termination configured. The frontend is served over plain HTTP (port 3000), the backend API over plain HTTP (port 3001). JWT auth cookies and CSRF tokens travel unencrypted on the wire. **Why:** `03-tls-and-headers.md §https-enforced`. **Fix:** add an nginx or Traefik service to `docker-compose.yml` that terminates TLS on port 443, mounts a valid certificate (Let's Encrypt or self-signed for dev), and issues a `301` redirect on port 80.

- 🟡 `backend/Dockerfile.dev: line 11: RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm run prisma:generate` — TLS verification is disabled during the Docker build step that runs Prisma client generation. **Why:** `03-tls-and-headers.md §cert-proxy-hygiene`. **Fix:** remove the prefix; `prisma generate` reads the schema file and makes no outbound HTTPS calls.

- 🟡 `frontend/next.config.ts` — no `headers()` export is defined; the Next.js frontend sends no `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy` headers. The app renders authenticated UI with auth cookies, making it vulnerable to clickjacking. **Why:** `03-tls-and-headers.md §security-headers`. **Fix:** add an `async headers()` export returning these headers on `source: '/**'`; add HSTS once TLS is in place.

- 🟡 `docker-compose.yml` — no certificate auto-renewal mechanism (Certbot, cert-manager, Traefik ACME) configured anywhere. When TLS is eventually added, certs will silently expire. **Why:** `03-tls-and-headers.md §cert-proxy-hygiene`. **Fix:** plan cert renewal at the same time as TLS termination; use a Certbot sidecar or Traefik with ACME.

---

## Containers / images / compose — FAIL

- 🔴 `backend/Dockerfile.dev` — no `USER` directive; the backend process runs as UID 0 (root) inside the container. This service is published on host port 3001. An RCE vulnerability yields an in-container root process one container-escape away from host root. **Why:** `04-containers-and-images.md §1-run-as-non-root`. **Fix:** add `RUN chown -R node:node /app` after `COPY` steps, then `USER node` before `CMD`. The `node:alpine` base image ships the `node` user at UID 1000.

- 🔴 `frontend/Dockerfile.dev` — no `USER` directive; the Next.js dev server runs as UID 0 inside the container, published on port 3000. **Why:** `04-containers-and-images.md §1-run-as-non-root`. **Fix:** same pattern — `RUN chown -R node:node /app` + `USER node` before `CMD`.

- 🟡 `backend/.dockerignore` — excludes `.env` and `.env.local` but not `.env.test`; the `Dockerfile.dev: COPY . .` instruction copies the entire build context including `backend/.env.test` (which contains JWT secrets) into the image layer. **Why:** `04-containers-and-images.md §3-no-secrets-baked-into-the-image`. **Fix:** add `.env*` (or `.env.test`) to `backend/.dockerignore`.

- 🟡 `docker-compose.yml: n8n: image: n8nio/n8n:latest` — floating `latest` tag; the image pulled at `docker compose up` can change between deployments without review. **Why:** `04-containers-and-images.md §2-base-image-pinning`. **Fix:** pin to a specific release tag (e.g., `n8nio/n8n:1.94.1`) or a digest.

- 🔵 `docker-compose.yml` — no `deploy.resources.limits` (CPU/memory) on any of the five services. A runaway container can exhaust host resources and take down co-located services. **Why:** `04-containers-and-images.md §5-hardening-niceties`. **Fix:** add `deploy.resources.limits` per service.

- 🔵 `docker-compose.yml` — no `read_only: true` on any service. A compromised process can write files anywhere in the container filesystem. **Why:** `04-containers-and-images.md §5-hardening-niceties`. **Fix:** enable `read_only: true` per service with `tmpfs` mounts for paths needing writes.

---

## Secrets in env & CI — FAIL

- 🔴 `docker-compose.yml:60: RESEND_API_KEY: re_3WD3vmvB_5P76Ly3am3zfKheojS71YnDT` — a live Resend email API key is hardcoded as a literal value in the `backend` service environment block. The file is git-tracked; the key is present in commit history and permanently exposed to anyone with repository read access. **Why:** `05-secrets-and-ci.md §2-secrets-in-docker-compose`. **Fix:** **rotate the key immediately** (it is compromised by virtue of being in git history); replace with `RESEND_API_KEY: ${RESEND_API_KEY}` sourced from the gitignored root `.env`.

- 🔴 `docker-compose.yml:82: N8N_ENCRYPTION_KEY: rmc3TEszEbar6xpXhnt1KaXt6G+qNQr9` — the n8n credential-encryption key is hardcoded in the compose file; it protects all workflow credentials stored by n8n, so its exposure allows offline decryption of every stored integration secret. Present in git history. **Why:** `05-secrets-and-ci.md §2-secrets-in-docker-compose`. **Fix:** **rotate immediately** (rotation requires re-entering all n8n credentials following n8n migration docs); replace with `N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}`.

- 🟡 `.github/workflows/ci.yml` — no secret-scanning step (gitleaks, trufflehog, or similar). The two live secrets already committed in `docker-compose.yml` would not have been caught by the pipeline. **Why:** `05-secrets-and-ci.md §3-ci-cd-pipeline`. **Fix:** add a `gitleaks/gitleaks-action` step to the CI workflow on every push and PR.

- 🔵 `backend/.env:28: STRIPE_SECRET_KEY=sk_test_51TnNM73K…` — a Stripe test-mode secret key is present on disk. The file is correctly gitignored and is not in git history; risk is limited to host-level access. **Why:** `05-secrets-and-ci.md §1-committed-env`. **Fix:** confirm test-only; rotate if it has been shared or is no longer needed.

---

## Low-confidence / needs human review

- 🟡? Redis host port — `CLAUDE/services.md` mentions Redis host exposure in dev, but `docker-compose.yml` shows no `ports:` for Redis. If a developer adds the port to match the doc, Redis would be exposed. Needs doc correction to prevent future misconfiguration.

## Coverage gaps & follow-ups

- **Live reachability** — findings above confirm config-level publication. Whether `0.0.0.0:5432` and `0.0.0.0:5678` are actually reachable from the internet depends on cloud firewall/LB rules. Run `runtime-verify` to confirm.
- **App-code vulnerabilities** → `/secure-audit` (separate report: `SOFTWARE-SECURITY-FINDINGS.md`).
- **Coding-agent config** → `/agent-harden-audit`.
- **Cloud IAM / firewall / VPC rules** — out of scope; infra-ops must verify.
- **nginx / Traefik config** — no proxy config found in the repo; not applicable until a proxy is added.

## Method

- Auditors (read-only): `infra-auditor` ×4 (network-exposure · tls-headers · container-hardening · secrets-config). Run in parallel.
- Baseline: `infra-security-review/references/` (01–05).
- Each 🔴 was spot-checked against actual docker-compose.yml and Dockerfile lines before listing.
- Cross-check: no `PORT_MAP.md` found; intended exposure inferred from compose config.
