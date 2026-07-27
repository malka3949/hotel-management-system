# Infrastructure Security Findings — <REPO> — <YYYY-MM-DD>

> Read-only audit of domain-2 infra config (proxy · ports · TLS/headers · containers · secrets/CI).
> No config was modified. Scope: <PATH>.  This audits *config*, not live behavior — confirm reachability
> with `runtime-verify`.

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | N |
| 🟡 risk | N |
| 🔵 nit | N |

Top 3 to fix first:
1. 🔴 `<file: directive>` — <one-line>
2. 🔴 …
3. 🟡 …

---

## Network exposure / ports / proxy — FAIL | WARN | PASS
- 🔴 `docker-compose.yml: ports "5432:5432"` — Postgres published on 0.0.0.0, reachable from the
  internet. **Why:** `02-network-and-ports.md §published-ports`. **Fix:** drop `ports:` (use `expose:`)
  or bind `127.0.0.1:5432:5432`.

## TLS / HTTPS / security headers — …
## Containers / images / compose — …
## Secrets in env & CI — …

---

## Low-confidence / needs human review
Findings the verify pass could not confirm — surfaced, not dropped:
- 🟡? `<file>` — <claim>. (<why uncertain>)

## Coverage gaps & follow-ups
This report audits **config only**. Not covered here:
- **App-code** vulns → `/secure-audit`.  **Coding-agent config** → `/agent-harden-audit`.
- **Live reachability** (is the port/header actually exposed right now?) → `runtime-verify`.
- **Cloud IAM / firewall appliances / physical network** → infra-ops, out of scope.
- Blind spots: <what wasn't opened>.

## Method
- Auditor (read-only): infra-auditor ×N, by category. Baseline: `infra-security-review/references/`.
- Cross-checked published ports against the repo's port-map file (e.g. `PORT_MAP.md`) if present.

<!-- FORMAT RULES:
- Each finding: `- <emoji> \`file: directive/line\` — <problem>. **Why:** <ref doc §section>. **Fix:** <short>.`
- **Why = the reference** that explains it (e.g. `04-containers-and-images.md §dangerous-flags`); keep it on every line.
- Anchor to the exact file + directive. Severity: 🔴 internet-reachable exposure / committed secret ·
  🟡 missing hardening · 🔵 minor. Unsure → Low-confidence section as `❔ unconfirmed — recheck`, don't delete.
- No clean fix? `**Fix:** couldn't find a fix — needs human decision (why: …)`. Never fabricate confidence or a fix. -->

