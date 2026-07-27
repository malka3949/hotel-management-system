# Secrets in env & CI — deep dive

Category: `secrets-config`. Where infra meets secret-management: committed env files, secrets in compose
and CI, and the build/deploy pipeline. Complements `secure-code-review/09-secrets-management.md` (which
covers secrets *in app code*); here it's the *infra/config* surface.

## AUDIT CHECK

### 1. Committed env / secret files
- `.env`, `.env.production`, `*.pem`, `*.key`, credential JSON committed to the repo (and present in git
  history even if later removed → rotate).
- **CHECK:** is `.env*` git-tracked? in `.gitignore`? a real secret value (not a placeholder) inside a
  committed `.env`/`.env.example`? 🔴 if a live secret is committed.

### 2. Secrets in docker-compose
- Plaintext secrets in `environment:` blocks committed to the repo; better: `env_file:` (gitignored) or
  Docker/compose `secrets:`.
- **CHECK:** `environment: - DB_PASSWORD=...` with a real value committed. 🔴.

### 3. CI / CD pipeline (`.github/workflows/*.yml`, other CI)
- Secrets referenced via `${{ secrets.X }}` (good) vs hard-coded in the workflow (🔴).
- `pull_request_target` / workflows that run untrusted PR code with secrets in scope; missing
  "require approval for external contributors".
- Over-broad `permissions:` on the `GITHUB_TOKEN`; deploy steps that echo secrets / `set -x` leaking env.
- **CHECK:** hard-coded tokens in workflow YAML; `pull_request_target` + checkout of PR head + secret use;
  no secret-scanning step (trufflehog/gitleaks) in CI.

### 4. Backups & data exposure (infra slice)
- DB backups written world-readable / to a web-served path / committed; no encryption on backups.
- **CHECK:** `backups/` dir served by nginx or committed; unencrypted dumps with PII.

### 5. Registry / deploy creds
- `.npmrc`/registry tokens, SSH deploy keys, `kubeconfig`, cloud creds committed.
- **CHECK:** any of these in the repo.

## Output (findings)
```text
🔴 [secrets-config] `.env.production` committed with live DB/API credentials — rotate + gitignore.
🔴 plaintext secret in docker-compose environment: / hard-coded token in a CI workflow.
🔴 backups with PII served by nginx or committed to the repo.
🟡 .env not in .gitignore (only luck keeps it out); no CI secret-scanning step.
🟡 pull_request_target runs untrusted code with secrets; over-broad GITHUB_TOKEN permissions.
🔵 .env.example contains real-looking values (confusing/risky).
```

> A committed secret is compromised even after deletion → the fix is **rotate**, then purge history.
> (Same rule as `secure-code-review/09-secrets-management.md`.)
