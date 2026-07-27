---
name: security-ledger
description: Assemble a per-target security Coverage Ledger from existing audit reports + the residual blind-spot register
argument-hint: "[path] (default: repo root)"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# /security-ledger

Make residual blindness **explicit**. Reads whatever audit reports already exist for a target, plus the
suite's residual blind-spot register, and assembles one `COVERAGE-LEDGER.md`. **Read-only** except writing
the ledger — it does NOT launch new audits.

## Input
`$ARGUMENTS` = path (default repo root).

## Steps
1. `TARGET = $ARGUMENTS` or repo root. Glob for existing reports under `TARGET/security/` and
   `TARGET/privacy/`: `SOFTWARE-SECURITY-FINDINGS.md`, `INFRA-SECURITY-FINDINGS.md`,
   `AGENT-HARDENING-FINDINGS.md`, `PRIVACY-COMPLIANCE-AMENDMENT13.md`, `RUNTIME-CONFIRMATION.md`,
   `E2E-SECURITY-FINDINGS.md`, `COVERAGE-LEDGER.md` (prior).
2. For each present report, **read its Summary counts + "Coverage gaps" section** (don't invent numbers).
   Mark each of the 7 modalities ✅ ran / ❌ not-run.
3. Load `~/.claude/skills/_suite/references/blind-spots.md` for the residual register; select the items
   that apply to this target.
4. Note cross-modality corroboration (a finding confirmed by >1 angle) and static findings still
   unconfirmed at runtime.
5. **Write** `TARGET/security/COVERAGE-LEDGER.md` from
   `~/.claude/skills/_suite/assets/coverage-ledger-template.md`.

## Output (to the user)
- Ledger path · which modalities ran (X/7) · which are missing (and the command to run each) · the residual
  human-only checklist.

## Rules
- Read-only except the ledger file. Never launch a new audit (that's the individual commands' job).
- Real counts read from the reports; if a report is absent, mark the modality ❌ and recommend the command.
- The point is honesty: surface the residual blindness explicitly; never imply full coverage.
