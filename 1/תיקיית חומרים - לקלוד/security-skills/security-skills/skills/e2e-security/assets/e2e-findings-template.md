# E2E Behavioral Security Findings — <REPO> — <YYYY-MM-DD>

> Drove the **running** app through attack/abuse playbooks via browser-mcp; verified end-to-end from the
> capture DB <and the app Postgres (dual-db)>. Target: `<baseUrl>` (local/staging). Assert mode: <capture-only | dual-db>.
> This exercises real behavior — it confirms what static analysis can only suspect.

## Summary

| Verdict | Count |
|---|---|
| 🔴 vulnerable-confirmed | N |
| ✅ safe | N |
| ❔ inconclusive | N |

Confirmed-exploitable (fix first):
1. 🔴 `<scenario>` — <one-line> — evidence: <http + snippet>
2. …

---

## Scenario results

### 🔴 idor — vulnerable-confirmed   <!-- example shape; one section per vuln-class -->
- **property:** a user reads only their own objects.
- **drive:** logged in userA; discovered `GET <owned-resource>/:id`; requested userB's id.
- **http:** 200 on `GET <discovered-endpoint>`.
- **capture:** response body contains userB's data (`network_get` snippet).
- **db (dual-db):** `<resource_table>.<owner_col>='<userB>'` ≠ userA → cross-account confirmed.
- **note:** discovered endpoint `<...>`; maps to static finding `<file:line>` if a /secure-audit report exists.

<repeat per generic vuln-class: unauth-exposure · idor · broken-func-authz · token-exposure ·
sensitive-in-resp · mass-assignment · rate-limit · error-leak · data-deletion — each with verdict +
property + drive + http + capture + db + the discovered endpoint.>

---

## Coverage gaps & follow-ups
What this e2e run did NOT exercise (feeds the blind-spot ledger / `/security-ledger`):
- Roles/flows not driven: <…>
- Scenarios not yet in the playbook: CSRF, SSRF, stored-XSS, upload-type-bypass, open-redirect, CORS-reflect.
- `capture-only` run → write-effect scenarios (mass-assignment / privacy-delete) are inconclusive without app-DB.
- Residual (human-only): business-logic correctness, multi-step races not exercised, threat-model gaps.

## Method
- Driver/asserter (side-effecting): e2e-pentester ×N, one browser-mcp session per role.
- Capture: browser-mcp per-session SQLite (queried via network_/console_ tools). App DB: `<dbUrl>` (read-only SELECTs), dual-db only.
- Seed accounts only; throwaway rows for write scenarios; reset between runs.

<!-- RULES: every 🔴 carries ≥1 positive evidence line (http + capture snippet, + db row in dual-db).
No evidence → ❔ inconclusive ("couldn't confirm — recheck"), never a pass. If a confirmed issue has no
clean fix → say "needs human decision (why: …)", never fabricate one. Never run against production. -->

