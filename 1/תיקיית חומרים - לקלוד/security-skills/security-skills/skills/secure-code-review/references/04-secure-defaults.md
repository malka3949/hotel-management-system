# Secure defaults — closed by default

Changes the way you think: instead of building an **open** system and then "closing holes", build
a system that is **closed by default** and open only what's needed.

```text
The safe default: not allowed, unless explicitly allowed.
Not "if I found no reason to block → allow", but "if I found no explicit permission → block".
```

Applies almost everywhere: permissions · API endpoints · form fields · files · roles · screens ·
admin actions · webhooks · exports · system settings.

## Audit checklist

1. **Permissions closed by default.** A new user gets minimum, not "lots, then trim". New user =
   basic permissions only (can't see all clients, can't export, can't delete, can't change perms,
   can't reach system settings). Add a permission when needed — not the reverse.
   **CHECK:** default role on user creation; any "grant admin for now" seed/bootstrap.

2. **A new role doesn't get everything.** Common mistake: "made a new role, gave it admin until we
   sort it out." New role starts empty/minimal; add explicitly.
   **CHECK:** role definitions defaulting to broad scopes.

3. **A new API is not public automatically.** Every endpoint requires authentication by default;
   every sensitive action requires authorization. Only a genuinely public endpoint (landing page,
   verified public webhook) is opened explicitly.
   **CHECK:** route registration where auth is opt-in rather than opt-out.

4. **New fields not client-updatable automatically.** If code auto-saves the whole body, a user can
   send `{"name":"Yossi","is_admin":true}`. A new field is not editable from the client until
   explicitly allowed → **allowlist of fields** (ties to principle 3).
   **CHECK:** mass-assignment without an allowlist (see `02-software-principles.md` §3).

5. **Files blocked by default.** Not "allow everything except X" — "allow only what's defined"
   (jpg/png/pdf), everything else blocked. (ties to principle 7).
   **CHECK:** upload filters using a denylist instead of an allowlist.

6. **Sensitive data hidden by default.** Full phone/email, national id, address, documents, payment,
   medical, legal — not shown everywhere. Default: don't show sensitive data unless needed; even
   when needed, show partial (`050-***-1234`, `yo***@example.com`).
   **CHECK:** API responses / list views returning full sensitive fields by default.

7. **Dangerous actions need extra confirmation.** Delete client/file, export DB, change perms,
   transfer ownership, refund, mass-send — must not happen on an incidental click; require a clear
   confirmation, sometimes re-auth.
   **CHECK:** destructive endpoints with no confirmation/re-auth step.

8. **New feature off until configured — feature flag.** A new capability isn't instantly live to
   everyone; it exists in code, off by default, opened to whom it's defined for. Especially:
   exports, integrations, API access, messaging, user management, automated actions.

9. **Dev environment doesn't behave like prod.** `debug` mode off in prod. Must NOT happen in prod:
   stack trace shown to user · open test endpoint · demo user with weak password · seed data with a
   fixed admin · overly verbose logs to screen · CORS open to everyone without reason.
   **CHECK:** `DEBUG=true`, wildcard CORS, test routes, seeded admin creds reachable in prod config.

10. **Deletion not always immediate/final — prefer soft delete** for sensitive records (a delete can
    be a mistake, malice, a bug, or permission abuse): mark deleted · allow restore · log the action ·
    hard-delete only after time / high permission.
    **CHECK:** hard `DELETE` on sensitive records with no soft-delete/restore path.

Top-level rule: **the default must be closed, limited, cautious.** For every design ask: what if we
forgot to set a permission · a new field was added · a new endpoint · a new role · a new user — does
the system open too much by default?

```text
Denied by default. Allowed only with an explicit permission.
```
