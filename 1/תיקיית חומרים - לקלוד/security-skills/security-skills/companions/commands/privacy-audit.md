---
name: privacy-audit
description: Audit a system for Israel Amendment 13 / privacy-law compliance; writes a detailed Hebrew compliance document
argument-hint: "[path] (default: repo root)"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /privacy-audit

Read-only Israeli privacy-law compliance audit (תיקון 13 + תקנות 2017 + הנחיית AI 2025). Maps a system
to the legal requirements and writes ONE detailed Hebrew compliance document with law citations and a
prioritized recommendations plan. The report is the only file written.

## Input
`$ARGUMENTS` = path to audit. Empty → current repo root.

## Steps (follow the israel-privacy-compliance skill)
1. **Invoke the `israel-privacy-compliance` skill** (Skill tool) for methodology + the legal baseline.
2. `TARGET = $ARGUMENTS` or repo root. Detect stack. Load `references/01-amendment-13-overview.md`.
3. **Classify first:** load `02`+`03`, map fields → classification → **security level** (medium is the
   floor once specially-sensitive data exists).
4. **Spawn `privacy-auditor` in parallel, one per category** (single message, Task calls):
   `data-classification`, `consent-minimization`, `access-logging`, `encryption-network`,
   `data-subject-rights`, `ai-processing`. Pass each: TARGET, its category, its reference file, the
   determined security level, and the finding line format (each finding carries a law anchor).
5. Collect + dedupe; sort by severity.
6. **Spot-check every 🔴** against the cited lines; drop any you can't confirm.
7. **Write** `TARGET/privacy/PRIVACY-COMPLIANCE-AMENDMENT13.md` from
   `templates/compliance-report-template.md` — data-classification table, security level + reasoning,
   per-category gaps each with a סעיף/תקנה citation, prioritized action plan, legal disclaimer, `date +%F`.

## Output (to the user)
- Report path.
- Security level + reasoning.
- Summary (🔴/🟡/🔵) + top-3 findings.

## Rules
- Read-only on audited code. Only `TARGET/privacy/PRIVACY-COMPLIANCE-AMENDMENT13.md` is written.
- Every finding carries a law anchor. No invented line numbers.
- Out-of-code items (infra network separation, signed DPA, org process) → "context", not code defects.
- Always include the disclaimer: technical analysis, not legal advice.
