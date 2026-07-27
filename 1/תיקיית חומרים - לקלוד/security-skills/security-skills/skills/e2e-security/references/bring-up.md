# Bring-up — start the browser-mcp + the target, then run e2e (generic)

e2e-security drives a **running** target through a connected browser-MCP. The MCP must be up **and
registered** so its `mcp__browser-mcp__*` tools exist — run e2e in a **fresh MCP-connected session**.
Nothing here is target-specific except where the **profile** (`target-profile.md`) supplies it.

## 0. Safety (every target)
```text
✗ never production — baseUrl/dbUrl must be local/staging    ✓ seed/throwaway data only
✓ reset throwaway rows between write scenarios via profile.reset
```

## 1. Start browser-mcp (generic — same for any target)
```bash
cd "$BROWSER_MCP_DIR"   # the browser-mcp server install directory
[ -f docker/.env ] || echo "BROWSER_MCP_HTTP_TOKEN=$(openssl rand -base64 32)" > docker/.env
docker compose -f docker/docker-compose.yml up -d --build
curl -s http://127.0.0.1:8780/health        # {"ok":true,...}
```
Capture lands in per-session SQLite inside the container; query it via the MCP tools
(`network_list`/`network_get`/`network_search`, `console_*`), not the .db file. For token-leak tests on a
**local** target, set `BROWSER_MCP_REDACT_MODE=none` (or trust localhost) so the agent can see the auth
headers/tokens it's testing for exposure.

## 2. Register the MCP + open a fresh session (generic)
```bash
TOKEN=$(grep BROWSER_MCP_HTTP_TOKEN "$BROWSER_MCP_DIR/docker/.env" | cut -d= -f2)
claude mcp add browser-mcp -s user --transport http http://127.0.0.1:8780/mcp \
  --header "Authorization: Bearer $TOKEN"
claude mcp list      # browser-mcp listed
# → start a NEW Claude session so mcp__browser-mcp__* tools load
```

## 3. Start the TARGET (per its profile)
Bring up the app under test however *it* runs (its own compose/dev script), then fill the profile:
- `baseUrl` (local/staging), how to authenticate (accounts or a cookie), `dbUrl` (optional, for dual-db),
  and `reset` (how to restore seed/throwaway data).
- Provide a profile file or inline. Missing fields are **auto-discovered** (OpenAPI / crawl / snapshot /
  DB introspection — see `target-profile.md`).

### Example shape (fictional)
```bash
# start your app however it runs:
cd <your-app> && <its dev/up command> && <its seed command>
# profile: references/examples/example-app.profile.json
#   baseUrl http://localhost:<port> · dbUrl postgresql://<user>:<pass>@localhost:<port>/<db>
#   accounts admin@example.test / alice@example.test / bob@example.test  (seed password)
#   reset: <your seed command>
```

## 4. Run the e2e (any target)
```bash
# lean
/e2e-security <baseUrl> --profile <profile.json> --assert dual-db
# deterministic + critic
Workflow({ name:"e2e-security-max", args:{
  baseUrl:"<baseUrl>", profile:"<path-or-object>",
  assert:"dual-db", dbUrl:"<read-only-postgres-url>", target:"<repo path for the report>"
}})
# capture-only: omit dbUrl / set assert:"capture-only"
```
Output: `<target>/security/E2E-SECURITY-FINDINGS.md`.

## 5. Tear down
```bash
# stop the target however it starts; then:
cd "$BROWSER_MCP_DIR"   # the browser-mcp server install directory && docker compose -f docker/docker-compose.yml down
claude mcp remove browser-mcp   # optional
```

## Preflight the agent must pass (every target)
- `baseUrl` resolves and is **not** production.
- `mcp__browser-mcp__*` tools present (MCP connected). If absent → stop; tell the user to do steps 1–2 + restart the session.
- a way to authenticate exists (accounts or cookie); ≥2 accounts for IDOR (else those scenarios are inconclusive).
- dual-db: the `dbUrl` connects (`psql "<url>" -c 'select 1'`) and is read-only-intended.
