# Target profile — how the skill describes ANY app (generic)

e2e-security is **target-agnostic**. It runs against any web app described by a small **target profile**.
Nothing about a specific system is baked into the skill — the profile (provided by the user, or
auto-discovered) supplies the concrete details; the playbooks are generic vuln-classes parameterized by it.

## The profile (JSON or inline)
```jsonc
{
  "name": "my-app",
  "baseUrl": "http://localhost:PORT",        // required; MUST be local/staging, never prod
  "auth": {
    "mode": "form" | "api" | "cookie" | "bearer",
    // form:   loginPath + selectors (or let the agent find the login form by snapshot)
    "loginPath": "/login",
    "userField": "email", "passField": "password", "submit": "auto",
    // api:    a login endpoint returning a cookie/token
    "loginEndpoint": "/api/auth/login", "userKey": "email", "passKey": "password",
    // cookie/bearer: pre-supplied session (skip interactive login)
    "cookie": null, "bearerHeader": null
  },
  "accounts": [                              // ≥2 of one role for IDOR; ≥1 admin + ≥1 low-priv for authz
    { "role": "admin",  "username": "...", "password": "..." },
    { "role": "userA",  "username": "...", "password": "..." },
    { "role": "userB",  "username": "...", "password": "..." }
  ],
  "dbUrl": null,                             // optional; enables dual-db assertions (read-only SELECTs)
  "hints": {                                 // ALL optional — anything missing is auto-discovered
    "openapi": "/api/docs-json",             // Swagger/OpenAPI for endpoint discovery
    "sensitivePaths": ["/api/files/", "/metrics", "/admin"],
    "selfUpdateEndpoint": "PATCH /api/users/me",
    "ownedResource": "settlement|order|invoice|document",  // the resource to probe for IDOR
    "privilegedFields": ["role", "isAdmin", "balance"]      // for mass-assignment
  },
  "reset": "command to restore seed/throwaway data between write scenarios"  // optional
}
```

## How the skill OBTAINS the profile (in order)
1. **User-supplied** — a profile file path (`--profile path.json`) or inline values. Best when known.
2. **Auto-discover** — when fields are missing, discover before testing:
   - **endpoints:** fetch the OpenAPI/Swagger (`hints.openapi`, or try `/api/docs-json`, `/swagger.json`,
     `/openapi.json`); else **crawl** — `page_navigate` the baseUrl, `snapshot_take`, follow links/forms,
     and read `network_list` to learn the real API routes the UI calls.
   - **login form:** `snapshot_take` the login page → identify user/pass fields + submit by their labels.
   - **owned resource + ids:** log in as userA, drive the UI to a resource the user owns, capture its id
     from the URL/`network_list`; the "other" id comes from userB's session (true cross-account IDOR).
   - **self-update endpoint:** find the profile/settings save request via `network_list` after editing.
   - **dual-db schema:** if `dbUrl` set, introspect — `psql "$dbUrl" -c "\dt"` and `\d <table>` (or
     `information_schema.columns`) to learn the real table/column names to assert against. Never hard-code.
3. **Minimum viable profile:** `baseUrl` + a way to authenticate (accounts or a cookie) + ≥2 accounts for
   IDOR. Everything else can be discovered. If even auth is unknown, run only the no-auth scenarios
   (unauth-exposure, rate-limit, error-leak) and mark the rest `inconclusive (no credentials)`.

## Roles are abstract
The playbooks speak of **`admin`**, **`userA`**, **`userB`** (two same-level accounts), not app-specific
role names. Map the profile's real roles onto these: any high-privilege role → `admin`; any two ordinary
accounts of the same role → `userA`/`userB`.

## Safety (same for every target)
- `baseUrl`/`dbUrl` must be **local/staging** — refuse production hosts.
- Use **throwaway/seed** accounts and rows only; app-DB access is **read-only SELECT**; write scenarios
  run on throwaway rows and are reset via `profile.reset`.

> A fictional example profile lives in `references/examples/example-app.profile.json` — copy and fill it in.
> The skill never assumes any one app; it reads the profile it's given or discovers one.
