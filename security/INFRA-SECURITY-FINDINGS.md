# Infrastructure Security Findings — Hotel Management System — 2026-06-17

> Read-only audit of domain-2 infra config (proxy · ports · TLS/headers · containers · secrets/CI).
> No config was modified. Scope: `hotel-management-system/`.
> This audits *config*, not live behavior — confirm reachability with `runtime-verify`.

---

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | 10 |
| 🟡 risk | 14 |
| 🔵 nit | 6 |

**Top 3 to fix first:**
1. 🔴 `backend/.env:5` + `docker-compose.yml:47` — JWT secrets committed in plaintext (rotate all immediately)
2. 🔴 `docker-compose.yml:11` + `docker-compose.yml:25` — PostgreSQL and Redis published on 0.0.0.0 (DB directly internet-reachable)
3. 🔴 `backend/Dockerfile.dev:10` — `NODE_TLS_REJECT_UNAUTHORIZED=0` baked into image (TLS disabled globally)

---

## Network exposure / ports / proxy — FAIL

- 🔴 `docker-compose.yml: ports: '5432:5432'` — PostgreSQL published on `0.0.0.0:5432`; any host-level firewall gap makes the database directly internet-reachable with no proxy layer, no TLS, and credentials visible in the same file.
  **Why:** `02-network-and-ports.md §published-ports`. **Fix:** remove the `ports:` block from the `postgres` service entirely — the backend reaches it over the internal compose network via `postgres:5432`; or at minimum bind to loopback: `'127.0.0.1:5432:5432'`.

- 🔴 `docker-compose.yml: ports: '6379:6379'` — Redis published on `0.0.0.0:6379` with no authentication (`command: redis-server --appendonly yes` — no `--requirepass`). Redis with no password on an exposed port is a well-known RCE vector via `CONFIG SET`.
  **Why:** `02-network-and-ports.md §published-ports`. **Fix:** remove `ports:` from the `redis` service; add `--requirepass ${REDIS_PASSWORD}` to the `command:`.

- 🟡 `docker-compose.yml: ports: '3001:3001'` (backend) — NestJS backend published on `0.0.0.0:3001` with no reverse proxy (nginx/Traefik) in front of it. The backend is directly internet-reachable with no TLS termination, no header-stripping, and no edge rate-limiting.
  **Why:** `02-network-and-ports.md §front-proxy-nginx-routing`. **Fix:** add nginx/Traefik as the sole public-facing service; move the backend to an internal network with `expose:` only.

- 🟡 `docker-compose.yml` (all services) — No explicit `networks:` block; all three services share Docker's default bridge network. Any container started on the host without explicit network assignment may land on the same network and reach the database.
  **Why:** `02-network-and-ports.md §published-ports`. **Fix:** define a named internal network (e.g. `hotel_internal`); attach only the future proxy to a public-facing network.

- 🔵 `start.sh` — Launches backend and frontend as host processes (not Docker) with `fuser -k` + direct `node` invocation; no `--host 127.0.0.1` flag, so Node defaults to `0.0.0.0` binding even outside of Docker.
  **Why:** `02-network-and-ports.md §cors-host-binding`. **Fix:** for any production-path scripts, pass explicit bind address or rely solely on the Docker compose path.

---

## TLS / HTTPS / security headers — FAIL

- 🔴 `docker-compose.yml:49 FRONTEND_URL: http://localhost:3000` + `backend/src/main.ts: enableCors({ credentials: true })` — `FRONTEND_URL` is used as a CORS allowed-origin with `credentials: true`. The env validation schema (`env.validation.ts: FRONTEND_URL: Joi.string()`) accepts any value including plain HTTP and has a `http://localhost:3000` default. A production deploy without overriding `FRONTEND_URL` accepts cross-origin credentialed requests from a plain-HTTP origin, defeating cookie security.
  **Why:** `03-tls-and-headers.md §HTTPS-enforced`. **Fix:** add `.uri({ scheme: ['https'] })` to the `FRONTEND_URL` Joi rule for `NODE_ENV=production`; make `FRONTEND_URL` `.required()` with no HTTP default.

- 🟡 `docker-compose.yml` (entire file) — No nginx or TLS termination layer exists anywhere in the repository. The stack runs end-to-end over plain HTTP. There is no HTTP→HTTPS redirect, no TLS listener, and no certificate configuration.
  **Why:** `03-tls-and-headers.md §HTTPS-enforced`. **Fix:** add an nginx service with `ssl_certificate`, redirect port 80 to 443, and reverse-proxy to the backend container.

- 🟡 `backend/src/main.ts: app.use(helmet())` — `helmet()` called with no arguments; HSTS (`Strict-Transport-Security`) is only meaningful over HTTPS and cannot be verified as present since no TLS layer exists. Once TLS is added, HSTS must be explicitly enabled.
  **Why:** `03-tls-and-headers.md §HSTS`. **Fix:** after adding TLS, configure `helmet({ hsts: { maxAge: 31536000, includeSubDomains: true, preload: true } })`.

- 🟡 `backend/src/config/env.validation.ts: FRONTEND_URL: Joi.string().default('http://localhost:3000')` — `FRONTEND_URL` has an HTTP localhost default, so a misconfigured production deploy silently accepts the wrong CORS origin rather than failing startup.
  **Why:** `03-tls-and-headers.md §HTTPS-enforced`. **Fix:** make it `.required()` (no default) or add a conditional production rule.

- 🔵 `.github/workflows/ci.yml` — CI runs only lint and typecheck; no automated TLS/security-header validation step exists. A regression (removing helmet, adding an HTTP origin) would not be caught before merge.
  **Why:** `03-tls-and-headers.md §cert-and-proxy-hygiene`. **Fix:** add a `curl -sI` or `observatory-cli` step against a staging URL asserting `Strict-Transport-Security` and `X-Content-Type-Options` headers.

---

## Containers / images / compose — FAIL

- 🔴 `backend/Dockerfile.dev:10 ENV NODE_TLS_REJECT_UNAUTHORIZED=0` — TLS certificate verification disabled globally at the Node.js process level, baked permanently into the image. Every outbound HTTPS call (Stripe, SendGrid, upstream APIs) silently accepts invalid/forged certificates — full MITM with no runtime warning. Cannot be overridden to `1` at runtime without explicit effort since it is an `ENV` layer.
  **Why:** `04-containers-and-images.md §3-no-secrets-baked-into-the-image`. **Fix:** remove this line; if a dev self-signed CA is needed, add it via `NODE_EXTRA_CA_CERTS` pointing to the CA cert, never disable verification globally.

- 🔴 `backend/Dockerfile.dev` (no `USER` directive) — Container runs as root (UID 0). A process escape or path-traversal in the NestJS app yields root inside the container, lowering the bar for host breakout.
  **Why:** `04-containers-and-images.md §1-run-as-non-root`. **Fix:** add `RUN addgroup -S app && adduser -S app -G app` and `USER app` before `CMD`; adjust `/app` ownership.

- 🟡 `backend/Dockerfile.dev:1 FROM node:20-alpine` — Image pinned to major version tag only; `node:20-alpine` resolves to a different layer on every upstream update, breaking build reproducibility.
  **Why:** `04-containers-and-images.md §2-base-image-pinning`. **Fix:** pin to `node:20.19.1-alpine3.21` (or add `@sha256:…` digest).

- 🟡 `docker-compose.yml:3 image: postgres:16-alpine` — Same floating-tag issue; upstream patch updates pulled silently.
  **Why:** `04-containers-and-images.md §2-base-image-pinning`. **Fix:** pin to `postgres:16.8-alpine3.21` or equivalent.

- 🟡 `docker-compose.yml:21 image: redis:7-alpine` — Same floating-tag issue.
  **Why:** `04-containers-and-images.md §2-base-image-pinning`. **Fix:** pin to `redis:7.4.3-alpine3.21` or equivalent.

- 🟡 `(no prod Dockerfile exists)` — Only `Dockerfile.dev` is present. No `Dockerfile.prod` or multi-stage build exists; the same dev image that contains build tooling, source files, and all dev dependencies would be promoted to production.
  **Why:** `04-containers-and-images.md §5-hardening-niceties`. **Fix:** add a multi-stage `Dockerfile`: stage 1 builds (`npm ci`, `tsc`); stage 2 copies only `dist/`, runs `npm ci --omit=dev`, and drops to a non-root user on a minimal alpine base.

- 🟡 `docker-compose.yml: backend:` (no `security_opt`) — No `security_opt: ["no-new-privileges:true"]`; a setuid binary could escalate from the container user back to root.
  **Why:** `04-containers-and-images.md §5-hardening-niceties`. **Fix:** add `security_opt: ["no-new-privileges:true"]` to the backend service block.

- 🟡 `docker-compose.yml` (all services, no resource limits) — No `mem_limit`, `cpus`, or `pids_limit` on any service. A runaway query or traffic spike can exhaust host memory.
  **Why:** `04-containers-and-images.md §5-hardening-niceties`. **Fix:** add `deploy.resources.limits` per service.

- 🔵 `backend/.dockerignore` (missing `.env.test`) — `.dockerignore` excludes `.env` and `.env.local` but not `.env.test`; the `COPY . .` instruction in `Dockerfile.dev:8` copies `.env.test` (with test JWT secrets) into every built image.
  **Why:** `04-containers-and-images.md §3-no-secrets-baked-into-the-image`. **Fix:** add `.env.test` (or `.env.*`) to `.dockerignore`.

- 🔵 `backend/.dockerignore` (missing `.git`) — `.git` directory is not excluded from the build context, bloating it and potentially leaking commit history into the image layer.
  **Why:** `04-containers-and-images.md §3-no-secrets-baked-into-the-image`. **Fix:** add `.git` to `.dockerignore`.

- 🔵 `docker-compose.yml: backend:` (no `read_only`) — Root filesystem is writable; an attacker achieving code execution can write binaries or crontabs inside the container.
  **Why:** `04-containers-and-images.md §5-hardening-niceties`. **Fix:** add `read_only: true` and mount `/tmp` as `tmpfs`.

---

## Secrets in env & CI — FAIL

> **Action required:** every secret value listed below must be treated as **compromised** — rotate before next use, regardless of "dev" label. Then purge git history (`git filter-repo --path backend/.env --invert-paths` + equivalents) and re-verify with `git check-ignore -v`.

- 🔴 `docker-compose.yml:8 POSTGRES_PASSWORD: hotel_pass` — Database password hardcoded as literal value in committed compose file.
  **Why:** `05-secrets-and-ci.md §secrets-in-docker-compose`. **Fix:** replace with `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`; supply from a gitignored `.env` or Docker Secrets.

- 🔴 `docker-compose.yml:45 DATABASE_URL: postgresql://hotel_user:hotel_pass@postgres:5432/…` — DB credentials embedded in committed compose `environment:` block.
  **Why:** `05-secrets-and-ci.md §secrets-in-docker-compose`. **Fix:** `DATABASE_URL: ${DATABASE_URL}`.

- 🔴 `docker-compose.yml:47 JWT_SECRET: dev-secret-min-32-chars-change-in-prod` + `docker-compose.yml:48 JWT_REFRESH_SECRET: dev-refresh-secret-32-chars-change-prod` — Working JWT signing secrets hardcoded in committed compose. The label "change-in-prod" does not prevent any developer running this compose from using these exact values.
  **Why:** `05-secrets-and-ci.md §secrets-in-docker-compose`. **Fix:** `JWT_SECRET: ${JWT_SECRET}`, `JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}`.

- 🔴 `backend/.env:3` (`DATABASE_URL=postgresql://hotel_user:hotel_pass@…`) + `backend/.env:5` (`JWT_SECRET=hotel-jwt-secret-development-32chars!!`) + `backend/.env:6` (`JWT_REFRESH_SECRET=hotel-refresh-secret-dev-32chars!!`) — Three live credentials committed to the repository in `.env`. Once committed, git history preserves them permanently.
  **Why:** `05-secrets-and-ci.md §committed-env-secret-files`. **Fix:** **rotate all three immediately**; purge history; `.env` must not be committed.

- 🔴 `backend/.env.test:3` (`DATABASE_URL=postgresql://postgres:postgres@…`) + `backend/.env.test:5` (`JWT_SECRET=test-jwt-secret-32-chars-minimum!!`) + `backend/.env.test:6` (`JWT_REFRESH_SECRET=test-refresh-secret-32-chars-min!!`) — Working secrets committed in the test env file; these are functional JWT keys, not placeholders.
  **Why:** `05-secrets-and-ci.md §committed-env-secret-files`. **Fix:** rotate; inject via CI secret variables; add `backend/.env.test` to `.gitignore`.

- 🟡 `.gitignore: .env` pattern — Root `.gitignore` uses `.env` and `.env.local` patterns, but `backend/.env.test` is not covered (it doesn't match `.env`, `.env.local`, or `.env.*.local`). The file is live in the repo, confirming the exclusion is not working for test files.
  **Why:** `05-secrets-and-ci.md §committed-env-secret-files`. **Fix:** add `**/.env.test` (or `**/.env.*`) to root `.gitignore`; verify with `git check-ignore -v backend/.env.test`.

- 🟡 `backend/.env.example:3 DATABASE_URL=postgresql://hotel_user:hotel_pass@localhost:5432/hotel_management_dev` — Example file contains real credential values (`hotel_user:hotel_pass`), not generic placeholders. Anyone reading the example gets a working connection-string template.
  **Why:** `05-secrets-and-ci.md §committed-env-secret-files`. **Fix:** replace with `postgresql://USER:PASSWORD@localhost:5432/DB_NAME`.

- 🟡 `.github/workflows/ci.yml:18 uses: actions/checkout@v4` + `ci.yml:21 uses: actions/setup-node@v4` + `ci.yml:44` + `ci.yml:47` — All GitHub Actions pinned to floating semver tags (`@v4`); a compromised or hijacked tag runs arbitrary code in CI with access to all repo secrets.
  **Why:** `05-secrets-and-ci.md §CI-CD-pipeline`. **Fix:** pin to full SHA (e.g. `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af68`); use Dependabot to keep SHAs current.

- 🟡 `.github/workflows/ci.yml` (no `permissions:` block) — Workflow runs with GitHub default `GITHUB_TOKEN` permissions (`contents: write`, `pull-requests: write` on private repos).
  **Why:** `05-secrets-and-ci.md §CI-CD-pipeline`. **Fix:** add `permissions: contents: read` at workflow level; grant narrower scopes per job only as needed.

- 🟡 `.github/workflows/ci.yml` (no secret-scanning step) — No gitleaks/trufflehog step in the pipeline; the committed secrets above would have been caught before merge had a scan been in place.
  **Why:** `05-secrets-and-ci.md §CI-CD-pipeline`. **Fix:** add gitleaks or trufflehog as the first job.

---

## Low-confidence / needs human review

- 🟡? `docker-compose.yml` — Whether an external cloud load balancer or firewall already blocks ports 5432/6379 before they reach the internet cannot be determined from config alone. The compose binding to `0.0.0.0` is confirmed; actual reachability requires `runtime-verify`.

---

## Coverage gaps & follow-ups

- **App-code vulns** (IDOR, injection, authz) → see `security/SOFTWARE-SECURITY-FINDINGS.md` (already completed).
- **Live reachability** (are ports 5432/6379 actually reachable from the internet right now?) → `runtime-verify`.
- **Cloud IAM / firewall / VPC rules** → infra-ops, out of scope here.
- **No nginx/proxy config exists** — TLS version (`ssl_protocols`) and cipher findings are N/A; absence of the proxy layer is itself the finding.
- **Frontend container** — no `Dockerfile` or `.dockerignore` exists for the frontend; not audited.
- **No port-map file** (`PORT_MAP.md`) found — intended exposure inferred from compose/proxy config.

## Method

- Auditors (read-only): `infra-auditor` ×4 (network-exposure · tls-headers · container-hardening · secrets-config) — parallel.
- Baseline: `infra-security-review/references/`.
- Every 🔴 spot-checked against actual config lines (`docker-compose.yml`, `backend/Dockerfile.dev`, `backend/.env`, `backend/.env.test`, `.github/workflows/ci.yml`).
