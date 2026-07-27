---
name: runtime-confirm
description: Actively confirm static security findings against a running instance (DAST-lite); writes a confirmation report
argument-hint: "<report-path> <baseUrl>  (baseUrl must be local/staging, never prod)"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /runtime-confirm

Active runtime confirmation of static security findings. **Side-effecting** — sends real HTTP requests.
Local/staging/disposable targets only, never production.

## Input
`$ARGUMENTS` = `<report-path> <baseUrl>`.
- `report-path` — a `SOFTWARE-SECURITY-FINDINGS.md` / `INFRA-SECURITY-FINDINGS.md`.
- `baseUrl` — origin to probe (e.g. `http://127.0.0.1:<port>`). If it looks like production → refuse.
If `baseUrl` is omitted, ask for one (or, with explicit user opt-in, boot a disposable compose stack).

## Steps (follow the runtime-verify skill)
1. **Invoke the `runtime-verify` skill** (Skill tool); load `references/runtime-checks.md`.
2. Validate `baseUrl` is non-production. Read the report; extract runtime-confirmable findings.
3. **Spawn `runtime-verifier` per confirmable finding** (Task) with the finding + baseUrl → verdict + evidence.
   Keep request volume low; GET/HEAD/OPTIONS only; no destructive verbs.
4. **Write** `<report-dir>/RUNTIME-CONFIRMATION.md`: table finding → verdict (confirmed / not-reproduced /
   inconclusive / n-a) → status + evidence snippet. If a stack was booted, tear it down and note it.

## Output (to the user)
- Confirmation report path.
- Count confirmed / not-reproduced / inconclusive.
- The confirmed 🔴 (fix-first) and any not-reproduced static findings (recheck — likely false positives).

## Rules
- Never production. Never destructive/fuzzing. Low volume, `-m 10`.
- Only `RUNTIME-CONFIRMATION.md` is written to disk; if a disposable stack was started, it is torn down.
