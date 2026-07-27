# e2e security playbooks — generic vuln-classes

Target-agnostic. Each scenario is a **vuln-class** parameterized by the target profile
(`target-profile.md`) and uses **discovered** endpoints — never hard-coded paths. Roles are abstract:
`admin` (any high-priv), `userA`/`userB` (two ordinary same-role accounts).

Per scenario: **roles · how to discover the target · drive (browser-mcp) · property · assert
(capture / dual-db)**. Verdict: **vulnerable-confirmed** only with positive evidence of the bad outcome;
expected-safe (401/403/429/ignored) → **safe**; can't tell → **inconclusive** (never a silent pass).

---

## 1. IDOR / broken object-level authz
- **roles:** userA, userB.
- **discover:** log in userA; drive to a resource userA owns (order/invoice/settlement/document/profile);
  capture its id from URL/`network_list`. Get a userB-owned id the same way (userB session) or by ±1.
- **drive:** as userA, request userB's resource — `script_evaluate(fetch <userB resource>)` or navigate.
- **property:** a user reads/edits only their own objects.
- **assert capture:** `network_get` → **2xx** + body containing userB's data = VULN; 403/404 = safe.
- **assert dual-db:** confirm the resource's owner column ≠ userA (proves cross-account).

## 2. Unauthenticated exposure
- **roles:** none (fresh session, no cookies).
- **discover:** candidate sensitive paths from `hints.sensitivePaths` + discovery (file-serving routes,
  `/metrics`, `/actuator`, `/admin`, debug, backups, API docs); also any route the UI calls that returns data.
- **drive:** `page_navigate`/fetch each with **no** auth.
- **property:** sensitive endpoints require authentication.
- **assert capture:** **2xx** + sensitive body (documents, metrics, user data) = VULN; 401/403 = safe.

## 3. Broken function-level authz (privilege escalation)
- **roles:** userA (low-priv).
- **discover:** admin-only actions (from OpenAPI roles, or admin UI routes, or `hints`): create/delete/list-all/settings/execute.
- **drive:** as userA, call the admin action via `script_evaluate(fetch)`.
- **property:** a low-priv user cannot perform admin functions.
- **assert capture:** any **2xx** on an admin action = VULN; 403 = safe.
- **assert dual-db:** for a write, verify the row did/didn't change.

## 4. Token / session exposure
- **roles:** any logged-in.
- **drive:** log in; `network_list` post-login requests; `cookies_list`; `localStorage_list`.
- **property:** no token in URL; session cookie `HttpOnly`+`Secure`+`SameSite`; no long-lived token in localStorage.
- **assert capture:** token in a captured URL (query string) = VULN; auth cookie missing flags = VULN; raw JWT in localStorage = VULN.

## 5. Sensitive data in response
- **roles:** userA.
- **discover:** the data/list endpoints the UI calls after login (`network_list`).
- **drive:** load own profile + lists.
- **property:** responses expose only the caller's data, masked where required; no secrets/PII of others.
- **assert capture:** `network_search` response bodies for another account's identifiers, for secret-looking
  fields (pin/token/hash), or unmasked sensitive fields = VULN.

## 6. Mass assignment / over-posting
- **roles:** userA.
- **discover:** the self-update endpoint (`hints.selfUpdateEndpoint`, or the profile-save request via
  `network_list`); the privileged fields (`hints.privilegedFields`, or schema-derived: role/isAdmin/balance/owner).
- **drive:** `script_evaluate(fetch PATCH/PUT <self-endpoint>, body {<normal field>, <privileged field>:escalated})`.
- **property:** privileged fields are not client-settable.
- **assert dual-db (definitive):** the privileged column unchanged = safe; changed = VULN. *(capture-only:
  inconclusive unless the response echoes the escalated field.)*

## 7. Missing rate-limit / brute force
- **roles:** none.
- **discover:** the login/OTP/reset endpoint.
- **drive:** ~10–15 rapid wrong-password attempts (bounded, low volume).
- **property:** auth endpoints throttle.
- **assert capture:** no **429**/backoff across the burst = VULN.

## 8. Error / info leak
- **roles:** any.
- **drive:** send a malformed request (bad JSON / wrong type / bad id) to a discovered API route.
- **property:** errors don't leak internals.
- **assert capture:** response body has a stack trace / SQL error / framework banner / file path = VULN.

## 9. Data-subject deletion (privacy)  — dual-db only
- **roles:** admin.
- **discover:** the delete/anonymize action for a user/person record; use a **throwaway** record.
- **drive:** perform the deletion.
- **property:** deletion actually removes/anonymizes the personal data (not just a soft flag).
- **assert dual-db:** the PII columns still present/recoverable = VULN; removed/anonymized = safe. Reset after.

---

## Extending
Add a scenario as {roles, discover, drive, property, assert-capture, assert-dual-db}. Not-yet-scripted
classes (residual until added): CSRF, SSRF, stored-XSS (snapshot reflection), file-upload type bypass,
open-redirect, CORS reflection (set `Origin`).

## Example mapping (fictional app — to show the shape)
```text
profile: baseUrl http://localhost:<port>; accounts admin / alice (userA) / bob (userB); dbUrl postgresql://…
IDOR(1)            → userA=alice, userB=bob; ownedResource=<order/invoice/doc> → fetch bob's <resource>/<id>
unauth(2)          → discovered file-serving paths, /metrics, /admin
authz(3)           → a low-priv user hits a discovered admin-only endpoint (create / list-all / execute)
mass-assign(6)     → PATCH <self-endpoint> { <privileged field>:escalated }; dual-db: <user_table>.<priv_col>
privacy-delete(9)  → admin deletes a throwaway person record; dual-db: <person_table>.<pii_cols>
```
Every app slots into the same 9 classes via its own profile — discover the concrete endpoints, don't assume them.
