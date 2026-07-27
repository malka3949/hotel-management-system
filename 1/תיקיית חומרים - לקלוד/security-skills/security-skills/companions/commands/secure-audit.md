---
name: secure-audit
description: Audit code against the 16 software-security principles; writes a read-only Markdown gap report
argument-hint: "[path] (default: repo root)"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /secure-audit

Read-only software-security audit. Maps a codebase to the 16 software-security principles and writes
ONE gap report. The report is the only file written — audited code is never modified.

## Input
`$ARGUMENTS` = path to audit. Empty → current repo root.

## Steps (follow the secure-code-review skill)
1. **Invoke the `secure-code-review` skill** (Skill tool) to load the methodology + baseline.
2. Resolve scope: `TARGET = $ARGUMENTS` or repo root. Detect the stack.
3. Load `skills/secure-code-review/references/02-software-principles.md` for the audit checks.
4. **Spawn the auditors in parallel** (single message, 5 Task calls):
   `appsec-auditor` ×4 — `authn-authz`, `input-files`, `data-secrets-sessions`, `errors-defaults` —
   plus **`dependency-auditor` ×1** for `supply-chain`. Pass each: TARGET, its domain, its deep-dive
   file(s) (07/06 · 08 · 06/09/10/11 · 03/04 · 12), and the finding line format.
5. Collect + dedupe findings; sort by severity.
6. **Verify pass:** run the built-in **`/security-review`** (Skill tool) on TARGET; merge new findings
   tagged `[security-review]`. If it can't run, mark it "skipped" — don't fail the audit.
7. **Spot-check every 🔴** against the actual lines; drop any you can't confirm.
8. **Write** `TARGET/security/SOFTWARE-SECURITY-FINDINGS.md` from
   `skills/secure-code-review/assets/findings-template.md` with real repo-relative `file:line`,
   `date +%F`, and real counts.

## Output (to the user)
- Path of the written report.
- The summary table (🔴/🟡/🔵) and the top-3 findings.
- One line on whether `/security-review` ran or was skipped.

## Rules
- Read-only on audited code. Only `TARGET/security/SOFTWARE-SECURITY-FINDINGS.md` is written.
- No invented line numbers. Unsure → omit.
- Domain-3 (operational/process) items go in the report's "Out-of-code" section, not as code bugs.
