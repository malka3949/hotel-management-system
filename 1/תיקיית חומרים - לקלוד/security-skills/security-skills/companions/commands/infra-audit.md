---
name: infra-audit
description: Audit a repo's infrastructure config (proxy/ports/TLS/containers/secrets/CI); writes a read-only Markdown gap report
argument-hint: "[path] (default: repo root)"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /infra-audit

Read-only domain-2 infrastructure-security audit. Scans proxy/nginx, published Docker ports, TLS &
security headers, container/image hardening, and secrets/CI config; writes ONE gap report. Only the
report is written; no config or container is touched.

## Input
`$ARGUMENTS` = path to audit. Empty → current repo root.

## Steps (follow the infra-security-review skill)
1. **Invoke the `infra-security-review` skill** (Skill tool) for methodology + the baseline.
2. `TARGET = $ARGUMENTS` or repo root. Locate compose/Dockerfiles/nginx/CI/env. Load `references/01`.
3. **Spawn `infra-auditor` in parallel, one per category** (single message, 4 Task calls):
   `network-exposure`, `tls-headers`, `container-hardening`, `secrets-config`. Pass each: TARGET, its
   category, its reference file, and the finding line format (anchor to file+directive).
4. **Cross-check published ports** vs the repo's port-map file (e.g. `PORT_MAP.md`) if present. Collect + dedupe; sort by severity.
5. **Spot-check every 🔴** against the actual config lines.
6. **State coverage limits** in the report (app-code → `/secure-audit`; agent → `/agent-harden-audit`;
   live reachability → `runtime-verify`; cloud/firewall → out of scope). Unconfirmed → Low-confidence.
7. **Write** `TARGET/security/INFRA-SECURITY-FINDINGS.md` from `assets/infra-findings-template.md`.

## Output (to the user)
- Report path · summary (🔴/🟡/🔵) · top-3 · note that reachability is config-level (confirm with runtime-verify).

## Rules
- Read-only. Only `TARGET/security/INFRA-SECURITY-FINDINGS.md` is written.
- Anchor findings to file+directive. Check both layers (compose `ports:` AND front nginx).
- Recommend **rotate** for any committed secret. No invented directives.
