---
name: e2e-security
description: Drive ANY running web app through generic security playbooks via browser-mcp and verify end-to-end; writes a findings report
argument-hint: "<baseUrl> [--profile <file.json>] [--assert capture|dual-db] [--db <url>]  (local/staging only)"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /e2e-security

End-to-end behavioral security test for **any** web app. Drives the running target through generic
attack/abuse vuln-classes via the browser-mcp, captures everything, and verifies each scenario from the
capture (and, with `--assert dual-db`, the app's database). **Side-effecting — local/staging/seed only,
never production.** Target-agnostic: a target profile (provided or auto-discovered) supplies the details.

## Input
`$ARGUMENTS` = `<baseUrl> [--profile <file.json>] [--assert capture|dual-db] [--db <url>]`.
- `baseUrl` — the running target (e.g. `http://localhost:PORT`). Refuse prod-like hosts.
- `--profile` — a target profile (`references/target-profile.md`); if omitted, **auto-discover** from baseUrl.
- `--assert` — `capture` (default) or `dual-db` (also verify app-DB state).
- `--db` — read-only DB URL (required for `dual-db`; or taken from the profile).

## Prerequisite
browser-mcp running + registered so `mcp__browser-mcp__*` tools exist (see
`e2e-security/references/bring-up.md`). If absent → stop and give the bring-up steps.

## Steps (follow the e2e-security skill)
1. **Invoke the `e2e-security` skill**; load `references/target-profile.md` + `bring-up.md`.
2. **Build the profile**: use `--profile` if given; **discover** any missing fields (OpenAPI/crawl/snapshot/
   DB-introspection). Map the app's roles onto `admin`/`userA`/`userB`. Run the **preflight** (non-prod
   baseUrl, MCP connected, dual-db DB reachable, ≥2 accounts for IDOR). Fail closed.
3. For each role, in its own browser-mcp session, authenticate per the profile.
4. **Run each generic vuln-class** (`references/playbooks.md`) — spawn an `e2e-pentester` per scenario
   (Task): discover the concrete endpoint, drive, assert per `references/assertions.md` → verdict + evidence.
5. Assemble verdicts; **spot-check every 🔴** evidence line.
6. **State coverage limits** (roles/flows/scenarios not run; capture-only inconclusive writes; classes not scripted).
7. **Write** `<target>/security/E2E-SECURITY-FINDINGS.md` from `assets/e2e-findings-template.md`.
8. **Clean up** mutated throwaway rows via `profile.reset`.

## Output (to the user)
- Report path · verdict tally (🔴 confirmed / ✅ safe / ❔ inconclusive) · the confirmed-exploitable list ·
  mapping of each 🔴 back to a static finding where one is known.

## Rules
- Never production. Seed/throwaway only. App-DB read-only. Bounded volume, no fuzzing.
- No app-specific assumptions — paths/roles/tables from the profile or discovered.
- Only the report is written; the only app writes are the scenarios' driven actions on throwaway rows, reset after.
- Every 🔴 carries positive evidence; no evidence → ❔ inconclusive.
