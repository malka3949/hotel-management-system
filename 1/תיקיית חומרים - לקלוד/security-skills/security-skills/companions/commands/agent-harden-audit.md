---
name: agent-harden-audit
description: Audit a repo's coding-agent config (.claude/) against the 8 hardening layers; writes a read-only Markdown gap report
argument-hint: "[path] (default: repo root)"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /agent-harden-audit

Read-only audit of how a repo hardens the **coding agent itself**. Checks `.claude/` against the 8
hardening layers and writes ONE gap report. No config files are generated — gaps are reported.

## Input
`$ARGUMENTS` = path to audit. Empty → current repo root.

## Steps (follow the agent-hardening-review skill)
1. **Invoke the `agent-hardening-review` skill** (Skill tool) for methodology + the 8-layer baseline.
2. `TARGET = $ARGUMENTS` or repo root.
3. Load `skills/agent-hardening-review/references/06-agent-hardening.md`.
4. **Spawn `agent-config-auditor`** (Task) on TARGET → per-layer PRESENT/MISSING + `file:line`.
5. **Verify the enforcing nuances yourself** (read the files): PreToolUse hook uses `exit 2` not
   `exit 1`; reviewer subagent `tools` excludes Edit/Bash/Write; CI Action requires external approval.
6. **Write** `TARGET/security/AGENT-HARDENING-FINDINGS.md` from
   `skills/agent-hardening-review/assets/hardening-findings-template.md` with real `file:line`,
   `date +%F`, and the X/4 enforcing-layers score.

## Output (to the user)
- Report path.
- Enforcing layers present (X/4) and the headline gap.
- The 🔴 items (usually: no `exit 2` block-secrets hook, or secrets exposed).

## Rules
- Read-only. Only `TARGET/security/AGENT-HARDENING-FINDINGS.md` is written.
- Never generate `.claude/` hooks/settings/subagents — describe them as "Recommends:" lines.
- A layer is PASS only if its enforcing detail was confirmed (esp. layers 3, 5, 6).
- Carry the verified caveats (deny-not-always-enforced; sandbox Bash-only; Action not injection-hardened).
