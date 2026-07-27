# Network exposure, ports & proxy — deep dive

Category: `network-exposure`. The most common real infra breach: a service that should be internal
(DB, cache, metrics, admin, queue dashboard) is **published to the internet**.

## AUDIT CHECK

### 1. Published container ports (`docker-compose*.yml`, `docker run`)
- `ports: "HOST:CONTAINER"` binds on **all interfaces (0.0.0.0)** by default → reachable from outside.
  `expose:` (or no `ports:`) keeps it internal to the compose network — safe.
- **CHECK:** does any data-store / internal service publish a port? Classic 🔴:
  `"5432:5432"` (Postgres), `"3306:3306"` (MySQL), `"6379:6379"` (Redis), `"9200"` (Elastic),
  `"27017"` (Mongo), MinIO console, a queue/bull dashboard, `/metrics`, an admin UI.
- Safer pattern: bind to localhost only — `"127.0.0.1:5432:5432"` — or drop `ports:` and use `expose:`.
- **CHECK:** ports published on `0.0.0.0` that only the app (same compose network) needs.

### 2. Front proxy / nginx routing
- The front proxy (nginx / Traefik / cloud LB) decides what the **internet** reaches. A `location /` catch-all that
  proxies everything can expose internal paths (`/metrics`, `/admin`, `/debug`, dev endpoints).
- **CHECK:** `location` blocks that forward sensitive paths; missing `deny`/auth on `/metrics`,
  `/actuator`, `/admin`, queue dashboards; `proxy_pass` to an internal service without an allowlist.
- **CHECK (file serving):** nginx serving an upload/files path that should require auth (ties to the
  code finding — sensitive docs reachable without a credential).

### 3. Port map hygiene
- Cross-check every published host port against the repo's port-map file (e.g. `PORT_MAP.md`) if it has one.
- **CHECK:** an undocumented published port, or a port documented as internal that's actually public.

### 4. CORS / host binding at the app edge (infra-visible)
- App bound to `0.0.0.0` and reachable directly (bypassing the proxy) on its host port.
- **CHECK:** the app's own port is published *and* unauthenticated paths exist on it.

## Output (findings)
```text
🔴 [network-exposure] `docker-compose.yml: ports "5432:5432"` — Postgres published on 0.0.0.0, reachable from the internet. Fix: drop ports: / bind 127.0.0.1 / use expose:.
🔴 nginx proxies /metrics (or /admin, queue dashboard) to the public with no auth/deny.
🟡 internal service publishes a host port only the compose network needs.
🟡 published port not in PORT_MAP.md (undocumented exposure).
🔵 app bound to 0.0.0.0 but already behind the proxy — confirm no direct-port path.
```

> Whether the port is *actually* reachable right now is a runtime question → confirm with `runtime-verify`.
