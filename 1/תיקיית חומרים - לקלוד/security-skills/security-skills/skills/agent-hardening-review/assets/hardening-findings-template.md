# Agent Hardening Findings — <REPO_NAME> — <YYYY-MM-DD>

> Read-only audit of this repo's coding-agent configuration (`.claude/`) against the 8 hardening
> layers. No config files were created or modified — gaps are reported, not auto-fixed.
> Scope: <PATH>.

## Summary

| | Layer | Status | Severity if missing |
|---|---|---|---|
| 1 | CLAUDE.md security rules | PRESENT / MISSING | 🟡 |
| 2 | permissions.deny on secrets | PRESENT / MISSING | 🟡 |
| 3 | PreToolUse block-secrets hook (`exit 2`) | PRESENT / MISSING | 🔴 |
| 4 | Sandbox / dev-container | PRESENT / MISSING | 🟡 |
| 5 | Read-only reviewer subagent | PRESENT / MISSING | 🟡 |
| 6 | CI security-review Action | PRESENT / MISSING | 🟡 |
| 7 | MCP trust segregation | PRESENT / N-A / UNVERIFIED | 🟡 |
| 8 | Secrets out of agent-visible files + CI secret-scan | PRESENT / MISSING | 🔴 |

**Enforcing layers present:** X / 4 (layers 3,4,5,6 are the ones that actually block).

Headline: <one line — usually the absence of the Layer-3 hook or Layer-8 secret handling>.

---

## Layer 1 — CLAUDE.md security rules  *(behavioral)*
**Status:** <PRESENT `path:line` | MISSING>.
<short risk note. If present but no security section: WARN — behavioral only, doesn't enforce.>
<if MISSING → Recommends: add a security section (file 6, Layer 1).>

## Layer 2 — permissions.deny on secrets  *(behavioral, enforcement-bug caveat)*
**Status:** <PRESENT `.claude/settings.json:line` | MISSING>.
<note the known deny-not-always-enforced caveat — must be backed by the Layer-3 hook.>

## Layer 3 — PreToolUse block-secrets hook 🔒  *(enforcing — the one to rely on)*
**Status:** <PRESENT `.claude/settings.json:line` + `hooks/...sh` | MISSING>.
<if present: confirm it uses `exit 2` (not exit 1). exit 1 = warns but does NOT block → 🔴.>
<if MISSING → 🔴 headline. Recommends: PreToolUse hook, exit 2 on secret-file patterns (file 6, Layer 3).>

## Layer 4 — Sandbox / dev-container  *(enforcing, Bash-only)*
**Status:** <PRESENT | MISSING>. <note sandbox covers Bash children only.>

## Layer 5 — Read-only reviewer subagent  *(enforcing via narrow tools)*
**Status:** <PRESENT `.claude/agents/...md` | MISSING>. <confirm tools list has no Edit/Bash/Write.>

## Layer 6 — CI security-review Action  *(enforcing-ish)*
**Status:** <PRESENT `.github/workflows/...yml:line` | MISSING>.
<if present: confirm external-contributor approval is required (not injection-hardened).>

## Layer 7 — MCP trust boundaries
**Status:** <PRESENT / N-A (no MCP) / UNVERIFIED>. <read vs write servers segregated? sensitive tools gated?>

## Layer 8 — Secrets handling
**Status:** <secrets in vault/env vs in agent-visible files; CI secret-scan present?>
<🔴 if `.env`/secrets sit in the working tree the agent reads and no blocking hook exists.>

---

## Method
- Auditor (read-only): agent-config-auditor.
- Baseline: the 8 layers in `agent-hardening-review/references/06-agent-hardening.md`.
- Reported gaps are recommendations only — no `.claude/` file was written.

<!-- FORMAT RULES:
- Each layer: status + real `file:line` (or "absent") + one-line risk + (if missing) a one-line "Recommends:".
- Severity: 🔴 = a relied-upon enforcing layer (3 or 8) is absent or mis-wired (e.g. hook exits 1 not 2).
- Never auto-generate the hook/settings — only describe what's missing. -->
