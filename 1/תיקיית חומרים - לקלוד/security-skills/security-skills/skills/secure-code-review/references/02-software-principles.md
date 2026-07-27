# The software-security principles — with audit checks

Each principle below has: the **question**, the **rule**, and a concrete **AUDIT CHECK** —
the testable thing an auditor greps/reads for. Findings map back to the principle by name.

Domains (for parallel auditing): **authn/authz · input/files · data/secrets/sessions · errors/defaults**.

Deep-dive companions (load when a principle needs depth): authz/roles `07` · tokens `06` · input/injection
`08` · secrets `09` · logging `10` · communication `11` · errors `03` · secure-defaults `04` · ops `05` ·
supply-chain `12` (audited by `dependency-auditor`).

---

## 1. Authentication — אימות זהות
> Who are you?

Means: username+password, OTP, Google Login, JWT, session cookie, API key, webhook secret.
Rule: **without knowing who the user is, you can't know what they're allowed to do.**

**AUDIT CHECK:** every non-public route requires authentication. Look for endpoints with no
auth guard/middleware. Webhooks verify a signature/secret. No "temporary" unauthenticated paths.

---

## 2. Authorization — הרשאות
> What are you allowed to do?

Being logged in is not enough. Check: is *this* user allowed to do *this* action on *this
specific resource*? e.g. "Is User 17 allowed to edit Client 92?"
Rule: **every sensitive action passes a server-side authorization check.** Never trust a hidden
button on the frontend.

**AUDIT CHECK (high-value):** id-scoped mutating endpoints (`/x/:id` PUT/DELETE) verify
**ownership**, not just authentication. Hunt for IDOR — a resource fetched by id from the body/
params with no `where: { ownerId: currentUser }`. This is the most common real-world hole.

**Deep dive:** `07-authorization-and-roles.md` — RBAC/ABAC/ownership models, IDOR variants, privilege
escalation, where the check must live. Load it when auditing this domain.

---

## 3. Input Validation — בדיקת קלט
> Is what was sent valid and safe?

Every input is suspect: forms, API requests, webhooks, URL params, headers, cookies, JSON body,
files, data from external vendors.
Rule: **don't store what you didn't expect.** Prefer an **allowlist** of permitted fields.

**AUDIT CHECK:** mass-assignment — code that saves the whole request body (`{...req.body}`,
`Model(**data)`, `Object.assign(entity, body)`) without an explicit field allowlist. A user could
send `is_admin: true`. Also: validation present at the boundary (schema/DTO), not just in the UI.

**Deep dive:** `08-input-validation-and-injection.md` — allowlist strategy, mass-assignment, and the
injection families (SQL/NoSQL, command, XSS, SSRF, path traversal, deserialization) with sink+defense.

---

## 4. Data Protection — הגנה על מידע
> What data is stored, why, who may see it, how long?

Rule: **don't store data without a reason.**
Think: data minimization · encryption/masking · view permissions · deletion · anonymization ·
retention policy · access log for sensitive data.

**AUDIT CHECK:** sensitive fields (national id, full phone/email, payment, medical, legal) are
masked where displayed and not over-collected. Sensitive reads/writes are access-logged.

**Deep dive:** `09-secrets-management.md` — secret storage, credential hashing (argon2/bcrypt),
frontend-exposure leaks, rotation/revocation, leaked-secret response.

---

## 5. Privacy by design (Israeli Amendment 13) — at the software level
A system holding personal data must be designed so you can answer: what is stored · why · who
can access · what is done with it · how long · how to delete/correct/minimize.

**AUDIT CHECK:** there exists a mapping of personal-data fields, a retention/cleanup mechanism,
view-permissions by need, an audit log on sensitive actions, and delete/correct/export capability.
(Often a gap — report what's missing, note it also needs infra + process, not code alone.)

---

## 6. Sessions & tokens — ניהול סשנים וטוקנים
> How is a user identified after login?

Session ID, JWT, access/refresh token, API key, magic link, password-reset token.
Risk: **whoever holds the token can impersonate the user.**
Rules: short-lived · hard to guess · protected · revocable · not in logs · **not passed in URL** ·
not stored anywhere dangerous.

**AUDIT CHECK:** tokens/secrets never in the URL (query string), never logged, have expiry, and
are revocable. Grep logs/redirects for tokens in query params.

**Deep dive:** `06-tokens-and-sessions.md` — the 8 token types (session/JWT/access/refresh/API key/
magic link/reset/OAuth), transport & storage, expiry-rotation-revocation, per-type audit checks.

---

## 7. Safe file handling — טיפול בטוח בקבצים
> What happens when a user uploads a file?

An uploaded file is dangerous input. Validate: real file type · MIME · extension · size · file
name · download permissions · storage location · scanning.
Rules: **allowlist of file types only**, and **never store files where the server can execute
them as code.**

**AUDIT CHECK:** upload handlers enforce a type **allowlist** (not a denylist), cap size, sanitize
the filename (no path traversal), and store outside any web-executable/served-as-code path.

**Deep dive:** `08-input-validation-and-injection.md` (file-upload section) — real-content type checks,
storage placement, download authorization.

---

## 8. Secure communication — תקשורת בטוחה
> How does data move between browser, server, API, webhook, external services?

Ensure: HTTPS · origin verification · webhook signature · API keys · replay-attack protection ·
rate limit · internal/external API separation · **no secrets in URL**.
Rule: **every data transfer is encrypted, authenticated, and limited.**

**AUDIT CHECK:** webhooks verify signatures and resist replay; external calls use HTTPS;
rate-limiting exists on sensitive/public endpoints; no secrets in URLs.

**Deep dive:** `11-secure-communication.md` — TLS, webhook signature (timing-safe, raw body), replay
protection, rate limiting, CORS, internal/external boundary.

---

## 9. Logging & monitoring — לוגים ובקרה
> How do we know what happened?

Log sensitive actions: login, login failure, password change, permission change, data export,
data deletion, sensitive-file download, document access, important webhook.
**Never log:** passwords, tokens, API keys, OTP, cookies, card data, full medical data, full
sensitive payloads.
Rule: **too little logged → hard to investigate; too much → the log becomes the risk.**

**AUDIT CHECK:** sensitive actions are audit-logged; secrets/PII are NOT in logs. Grep for
`console.log`/`logger` lines dumping request bodies, tokens, passwords.

**Deep dive:** `10-logging-and-audit.md` — app vs audit streams, what to log / never log, masking,
anti-patterns, retention.

---

## 10. Error handling — fail closed (see `03-error-handling.md`)
> What does the system do when something breaks?

Rules: don't leak internal errors to the user · a failure must not open a permission · no
half-updated data · no blind retry · don't swallow critical errors. Principle: **Fail closed**
— if you can't check a permission, **block**.

**AUDIT CHECK:** `catch` blocks that swallow errors and continue; auth checks that default-allow
on error; multi-step ops without transaction/rollback; raw stack traces / DB errors returned to
the client. Full checklist in `03-error-handling.md`.

---

## 11. Secure defaults (see `04-secure-defaults.md`)
> What happens if we didn't explicitly configure something?

The system must be **closed by default**.
Rule: **denied by default; allowed only with an explicit permission.**
Applies to: new users · new roles · new APIs · new fields · files · new features · admin actions ·
sensitive data.

**AUDIT CHECK:** new user/role starts minimal (not admin-until-fixed); new endpoint requires auth
by default; new field not client-updatable unless allowlisted; `debug`/verbose errors off in prod;
soft-delete for sensitive records. Full checklist in `04-secure-defaults.md`.

---

## Coverage note
Principles 1–11 above are the code-auditable set. CIA (`01`) is the cross-cutting lens; operational
permissions (`05-operational-permissions.md`) are mostly *process*, not code — report those as
context/recommendations, not code defects.
