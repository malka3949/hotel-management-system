# Assertions — verifying a scenario from the two sources

A scenario's verdict comes from **evidence**, not from the fact that a request was sent. Two sources:

```text
capture (browser-mcp SQLite)  — what the browser sent/received: status, headers, bodies, console, storage
app DB (Postgres, dual-db)    — what actually changed in the system's state
```
`assert` mode selects which sources are used: `capture-only` (capture only) or `dual-db` (capture + app DB).

## Asserting from the capture (always available)
Query through the MCP tools (the capture is inside the container):
- **status + which request:** `network_list` (filter `urlContains`, `status`) → pick the request id.
- **response body:** `network_get` with `part:"response-body"` (bodies >10KB are blob-spilled — still fetchable).
- **request body / headers:** `network_get` `part:"request-body"` / `"meta"`.
- **search across bodies/URLs:** `network_search` (FTS) — e.g. search responses for a victim's name/code,
  for `memberPin`, for a JWT pattern; search URLs for a token in the query string.
- **console / errors:** `console_list` / `console_search` — PII or secrets logged client-side; stack traces.
- **storage:** `cookies_list` (HttpOnly/Secure/SameSite flags on the auth cookie), `localStorage_list`
  (raw token stored), `indexeddb_query`.

Capture-side verdict rules (examples):
```text
unauth endpoint   → network_get status 200 + sensitive body                → VULN
IDOR              → 200 + body contains the OTHER account's data            → VULN
token in URL      → network_search URLs matches the token / "access_token=" → VULN
cookie flags      → cookies_list shows auth cookie without HttpOnly/Secure  → VULN
sensitive leak    → network_search response bodies hits memberPin / other PII→ VULN
rate-limit        → none of the ~12 burst logins returned 429               → VULN
error leak        → response body has stack/SQL/file-path                   → VULN
```

## Asserting from the app DB (dual-db mode) — generic
Run read-only SQL via Bash `psql "<dbUrl>" -c "<SQL>"`. Use it to prove **persisted effect** — the thing
capture cannot see. **Discover the real schema first** (don't hard-code table/column names):
```bash
psql "$dbUrl" -c "\dt"                         # list tables
psql "$dbUrl" -c "\d <table>"                  # columns of the relevant table
# or: SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public';
```
Then assert the **generic** properties against the discovered names:
```sql
-- mass-assignment: did the privileged column actually change?
SELECT <privileged_col> FROM <user_table> WHERE <id_col> = '<actor>';      -- changed = VULN
-- authz write: did the low-priv user's create/edit land?
SELECT count(*) FROM <target_table> WHERE <created_by_col> = '<actor>';    -- >0 = VULN
-- IDOR cross-account proof:
SELECT <owner_col> FROM <resource_table> WHERE <id_col> = '<probed_id>';   -- != actor confirms cross-account
-- privacy-delete: is the PII actually gone?
SELECT <pii_col_1>,<pii_col_2> FROM <person_table> WHERE <id_col>='<rec>';  -- still present = VULN
```
(See `references/examples/example-app.profile.json` for the placeholder shape.)
Rules:
- A write scenario (mass-assignment, authz write, privacy-delete) gets a **definitive** verdict only with
  dual-db. In `capture-only` mode, mark such scenarios **inconclusive** unless the *response itself* proves
  the outcome (e.g. the response echoes the escalated `role`).
- Keep SQL **read-only** (SELECT). The only writes to the system are the scenario's own driven actions.

## Evidence to record per scenario
```text
verdict:   vulnerable-confirmed | safe | inconclusive
http:      <status> on <method path>
capture:   <short snippet — the proving line of the response/url/cookie/console>
db:        <the SELECT result> (dual-db only; "n/a" in capture-only)
property:  <the security property tested>
```
Every `vulnerable-confirmed` must carry at least one positive evidence line. No evidence → `inconclusive`.

## Cleanup after writes
Scenarios that mutate (mass-assignment, authz write, privacy-delete) run on **throwaway seed rows**; after
asserting, restore via the profile's `reset` command (or undo), so a second run starts clean.
