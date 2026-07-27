# Logging & audit trail — deep dive

Expands principle 9 (`02-software-principles.md`). Logs serve two security goals: **detection** (notice an
attack/abuse) and **investigation** (reconstruct what happened after an incident). The tension: too little
logged → you can't investigate; too much (or the wrong things) → the log itself becomes a data breach.

Core rule: **log security-relevant events with who/what/when/where — and never log secrets or sensitive
personal data.**

---

## Two log streams, don't conflate them
- **Application / debug logs** — operational, for developers. May be verbose, but still must be scrubbed of
  secrets/PII.
- **Audit log** — security/compliance record of *sensitive actions*. Structured, append-only, tamper-evident,
  retained per policy. This is what an incident or a privacy regulator asks for.

## What to log (audit trail)
Security-relevant, especially state-changing or access-to-sensitive events:
```text
authentication: login success, login failure, logout, MFA events, password change/reset
authorization:  permission/role change, access-denied on a protected resource, admin actions
data:           export of records, deletion, sensitive-record view/download, bulk operations
account:        user create/disable, ownership transfer, email/phone change
money/critical: payment, refund, plan change, mass-send
integration:    important inbound webhook processed, API key created/revoked
```
For each event capture: **who** (user/service id) · **what** (action + target resource id) · **when**
(timestamp, UTC) · **where** (IP, user-agent/source) · **outcome** (success/deny/error). Not to "spy on
employees" — so an incident can actually be reconstructed.

## What to NEVER log
```text
passwords (even wrong ones), tokens, session ids, API keys, OTPs, reset/magic tokens, cookies,
full card/PAN + CVV, full national id, full medical/legal data, encryption keys,
and full request/response bodies that contain any of the above
```
Mask where you must correlate: `user 4821`, `card ****4242`, `token a1b2…` (hash prefix). Scrub before the
log line is written, not after.

## Anti-patterns
- **Logging the whole request/response** (`logger.info(req.body)`) on auth or payment routes → dumps creds/PII.
- **Stack traces / DB errors to the user** — leak internals to an attacker (cross-ref principle 10,
  `03-error-handling.md`). Full detail goes to the internal log, a generic message to the user.
- **No log on access-denied / privilege change** → an attacker probing authorization leaves no trace.
- **Logs writable/deletable by the same app role** that an attacker can reach → no tamper-evidence.
- **PII in log aggregation/analytics** shipped to a third party without scrubbing.

## Operational qualities (mostly infra/process — report as context)
Append-only / tamper-evident storage · time-synced clocks · retention + secure deletion policy (don't keep
forever — old logs full of PII are a liability) · access control on the logs themselves · monitoring/alerting
on the audit stream (a login-failure spike, a mass export at 3am). These overlap infra and
`05-operational-permissions.md`; flag the code-visible gaps, note the rest as context.

## Audit checklist (what the auditor greps for)
```text
🔴 passwords/tokens/keys/OTP/cookies/PAN written to logs or error responses
🔴 full request/response body logged on auth or payment endpoints
🟡 no audit log on sensitive actions (export, delete, permission change, admin)
🟡 stack trace / DB error returned to the client
🟡 PII shipped to analytics/3rd-party logging without masking
🟡 no retention/cleanup → unbounded PII accumulation in logs
🔵 logs lack who/what/when/where structure to be investigable
```

> Cross-refs: error disclosure → `03-error-handling.md` · what counts as a secret → `09-secrets-management.md`
> · log storage/access/retention as process → `05-operational-permissions.md`.
