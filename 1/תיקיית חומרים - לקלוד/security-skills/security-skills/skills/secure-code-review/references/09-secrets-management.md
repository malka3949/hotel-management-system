# Secrets management — deep dive

Expands principle 4 (data protection) + crosses into ops (`05-operational-permissions.md` §8). A **secret**
is anything that grants access or proves identity: passwords, API keys, tokens, signing/encryption keys,
DB credentials, SSH keys, OAuth client secrets, webhook signing secrets, `.env` contents.

Core rule: **secrets live in a secret store / environment, never in code, never in logs, never in a URL,
never in the client bundle. They are rotatable and least-scoped.**

---

## Where secrets must (and must not) live
```text
✓ environment variables injected at runtime
✓ a secret manager / vault (AWS/GCP Secrets Manager, Vault, Doppler, Docker/K8s secrets)
✗ committed to the repo (code, config, fixtures, tests, migrations, seed data)
✗ in a .env file that is tracked by git (must be .gitignore'd; provide .env.example with blanks)
✗ in logs, error messages, stack traces, analytics, or crash reports
✗ in a URL / query string (leaks via history, Referer, proxy & server logs)
✗ in the frontend bundle — anything shipped to the browser is public (NEXT_PUBLIC_*, VITE_* are public)
✗ in client-side storage as a long-lived credential
```

## Storing user credentials (the system's own secrets-at-rest)
- **Passwords:** never plaintext, never reversible encryption. Hash with a slow, salted algorithm —
  **bcrypt / scrypt / argon2** (argon2id preferred). Never MD5/SHA-1/plain SHA-256.
- **API keys / refresh / reset tokens you issue:** store a **hash** server-side; show the raw value once.
- **Data needing decryption** (less common): encrypt with a KMS-managed key, not a hard-coded key.
- **AUDIT:** plaintext or fast-hash passwords; tokens/keys stored in plaintext; a hard-coded encryption key.

## Frontend exposure (very common real leak)
Any value bundled into client code is **public**, regardless of naming. A "secret" API key in React/Next/
Vite client code is exposed to every visitor.
- **AUDIT:** secret-looking keys referenced in client components / `NEXT_PUBLIC_`/`VITE_` vars / committed
  config that the bundler ships. Server-only secrets must be read only in server code.

## Lifecycle: rotation, revocation, scope
- **Rotatable** without downtime — support two valid keys during rollover.
- **Revocable** immediately on suspected leak.
- **Least scope** — a key for one integration/tenant/permission, not a god-key shared everywhere.
- **Expiry** where the provider supports it.

## When a secret leaks (it will, eventually)
A committed secret is compromised **even after you delete the commit** — it's in git history and likely
already scraped. The only fix: **rotate/revoke the secret**, then purge history as cleanup (not as the fix).
- **AUDIT:** any secret found in `git log`/history → flag as "rotate, don't just delete".

## Detection & prevention in the pipeline
- **Secret scanning** in CI and pre-commit (trufflehog, gitleaks, git-secrets) as a last net.
- `.gitignore` covers `.env*`, key files (`*.pem`, `*.key`), credential JSON.
- Code review + the coding-agent hardening side: a `PreToolUse` hook that blocks reading `.env`/`secrets/`
  (see the `agent-hardening-review` skill, Layer 3 & 8) — the agent does **not** auto-respect `.gitignore`.

## Webhook & signing secrets (ties to `11-secure-communication.md`)
Inbound webhooks authenticate via a **shared signing secret** (HMAC). The secret verifies the payload's
origin/integrity. Keep it in env, rotate it, and compare signatures with a **constant-time** comparison
(timing-safe) — a normal `==` leaks the secret via timing.
- **AUDIT:** webhook signature compared with `==`/`===` instead of a timing-safe equal; signing secret in code.

## Audit checklist (what the auditor greps for)
```text
🔴 any secret/key/password/token literal committed in the repo (code, config, tests, seeds)
🔴 .env tracked by git (not in .gitignore)
🔴 passwords stored plaintext or with a fast/unsalted hash (md5/sha1/sha256)
🔴 secret read in client/bundled code (exposed to the browser)
🔴 hard-coded encryption/signing key
🟡 secret/token passed in a URL query string
🟡 secret printed to logs / included in an error response
🟡 no rotation/revocation path; one shared god-key
🟡 webhook signature compared non-constant-time
🟡 no secret-scanning in CI / pre-commit
```

> Who may *read* the secret store, how it's shared among the team, revocation when someone leaves —
> process, not code: `05-operational-permissions.md` §8. The coding-agent's own access to secret files →
> the `agent-hardening-review` skill (Layers 2, 3, 8).
