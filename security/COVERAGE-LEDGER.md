# Security Coverage Ledger — Hotel Management System — 2026-06-17

> The explicit register of what was tested and what remains blind. Assembled from reports present
> under `hotel-management-system/security/`. "Zero blindness" is impossible; this makes residual
> blindness **visible and tracked** instead of silently absent.

---

## Modalities run

| # | Modality | Tool | Ran? | Report | 🔴 | Low-conf | Coverage |
|---|---|---|---|---|---|---|---|
| 1 | static-code | /secure-audit | ✅ | SOFTWARE-SECURITY-FINDINGS.md | 3 | 1 | backend/src only; no frontend |
| 2 | dependencies | dependency-auditor | ✅ | (in software report — supply-chain section) | 1 GHSA | — | backend deps only |
| 3 | infra-config | /infra-audit | ✅ | INFRA-SECURITY-FINDINGS.md | 10 | 1 | compose+Dockerfile+CI; no cloud IAM |
| 4 | agent-config | /agent-harden-audit | ✅ | AGENT-HARDENING-FINDINGS.md | 2 | — | .claude/ fully inventoried; 0/4 enforcing |
| 5 | privacy-law | /privacy-audit | ❌ | — | — | — | not run |
| 6 | runtime-probe | /runtime-confirm | ❌ | — | — | — | not run |
| 7 | e2e-behavioral | /e2e-security | ❌ | — | — | — | not run |

**Modalities not yet run (3 remaining):**
- `/privacy-audit` — Israeli Amendment 13 / 2017 Information Security Regulations compliance (guest PII, data-subject rights, audit logs, AI processing). **High priority** given PII scope of the system.
- `/runtime-confirm` — Confirm whether PostgreSQL (5432) and Redis (6379) are actually reachable from outside; confirm TLS absence; probe error-leak and CORS findings.
- `/e2e-security` — Behavioral testing: IDOR across reservations/guests/branches, mass-assignment exploitation, broken authz, token leakage, rate-limit gaps.

---

## Cross-modality corroboration

Findings confirmed by more than one independent angle (highest confidence — treat as proven):

- **JWT secrets in `.env`** — static (`backend/.env:5-6` in SOFTWARE report) + infra (`backend/.env:5-6` + `docker-compose.yml:47-48` in INFRA report) + agent (`hotel-management-system/backend/.env` in AGENT report — live creds readable by the agent) → **confirmed across 3 modalities, zero doubt. Rotate immediately.**

- **DB credentials exposed** — infra (`docker-compose.yml:8` `POSTGRES_PASSWORD: hotel_pass`, `docker-compose.yml:45` full `DATABASE_URL`) + software (cross-reference to `.env:3`) → **confirmed across 2 modalities.**

- **`.env.test` secrets committed** — software (`backend/.env.test:5-6` JWT secrets) + infra (`backend/.env.test:3,5,6`) → **confirmed across 2 modalities.** Git `.gitignore` does not cover `.env.test`.

- **No secret-file blocking layer** — software (agent can read `.env`, behavioral CLAUDE.md does not enforce) + agent-config (no `PreToolUse` hook for file paths, no `permissions.deny`) → **confirmed: agent has unobstructed read access to live credentials.**

Static findings **unconfirmed at runtime** (candidate false positives; require /runtime-confirm or /e2e-security):

- `docker-compose.yml:11,25` — PostgreSQL port 5432 and Redis port 6379 published on `0.0.0.0`. Infra config confirms the binding; actual internet reachability depends on cloud firewall/LB. Run `/runtime-confirm`.
- `backend/Dockerfile.dev:10` — `NODE_TLS_REJECT_UNAUTHORIZED=0`. Config confirmed; whether this image is actually used in any deployed environment needs verification.
- `backend/src/modules/rooms/rooms.service.ts:106` — mass-assignment via `isActive`. Static analysis confirmed; exploitation requires PATCH access. Run `/e2e-security` to confirm exploitability.
- `backend/src/common/guards/roles.guard.ts:17` — silent allow when no `@Roles()` decorator. Confirmed in source; which routes are actually undecorated and reachable needs `/e2e-security`.
- `backend/src/modules/auth/auth.controller.ts:27` — `httpOnly: false` cookie. Confirmed in source; XSS exploitability depends on CSP and frontend storage — requires `/e2e-security`.

---

## Residual blind spots for this target (human / future)

From `_suite/references/blind-spots.md`, items that apply to this system:

- [ ] **Business-logic abuse** — reservation pricing/discount math, availability window manipulation, cross-branch reservation data, multi-currency settlement correctness. Needs human review + targeted e2e scenarios.
- [ ] **Multi-step races / TOCTOU** — reservation `SELECT FOR UPDATE` in `AvailabilityService` is the stated pattern but was not exercised under concurrent load. Concurrent booking scenario not scripted. Needs dedicated load test.
- [ ] **Threat-model / design gaps** — guest-portal tokenized access, `GuestTokenGuard` scope, chain_admin privilege separation across branches — designed correctly per CLAUDE.md but no threat-model document validates the design.
- [ ] **Cryptographic correctness** — refresh tokens stored as SHA-256 (no salt; fast hash) flagged in SOFTWARE report. Whether other HMAC/key-derivation usages are correct needs human crypto review.
- [ ] **WebSocket auth/channel authz** — `socket.io` is wired (Phase 1) but channel-level authorization and auth token validation over WebSocket were not audited in any modality.
- [ ] **Frontend surface** — `hotel-management-system/frontend/` not audited. XSS, client-side authz bypasses, CSRF token handling in Next.js proxy, token storage in memory vs localStorage — all unscanned.
- [ ] **Future modules** — `reservations`, `check-in`, `availability`, `housekeeping`, `reports`, `billing` either not yet implemented or not audited. IDOR risk is highest in reservation endpoints. Re-audit each module when added.
- [ ] **e2e playbook gaps** — CSRF, SSRF, stored-XSS, upload-bypass (when Phase 5+ document upload added), open-redirect, CORS misconfiguration — not yet scripted for `/e2e-security`.
- [ ] **Cloud IAM / firewall / VPC rules** — whether `0.0.0.0`-bound ports are actually reachable is a cloud-infra question, not determinable from config. Infra-ops must verify.
- [ ] **Third-party vendor internals** — Stripe, Tranzila, SendGrid/AWS SES security behind their own DPAs — contractual, not testable here.
- [ ] **Israeli Privacy Amendment 13** — PII handling (passport IDs, DOBs, phones), data-subject rights (access/correction/erasure), security level classification, mandatory breach notification — not yet audited. Run `/privacy-audit`.

---

## Bottom line

Mechanizable blindness removed across **4 / 7** modalities.

**Proven critical (rotate now, no runtime proof needed):**
- JWT signing secrets + DB credentials are committed to the repo in `.env` and `docker-compose.yml` — confirmed by 3 independent modalities.

**Agent-specific risk:** the coding agent has unobstructed read access to live credentials. The `PreToolUse` hooks guard only `rm` and `git push`, not file reads. Adding a secret-file blocking hook is the single highest-leverage fix to reduce ongoing exposure during development.

To shrink further: run `/privacy-audit` (high priority — PII system), `/runtime-confirm` (confirm port exposure), `/e2e-security` (confirm exploitability of mass-assignment and authz gaps), then close the human-only checklist above.

---

*Assembled by /security-ledger — read-only except this file. Counts read directly from report Summary sections; not invented.*
