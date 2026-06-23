# Agent Hardening Findings — home/runner — 2026-06-17

> Read-only audit of this repo's coding-agent configuration (`.claude/`) against the 8 hardening
> layers. No config files were created or modified — gaps are reported, not auto-fixed.
> Scope: `/home/runner`.

## Summary

| | Layer | Status | Severity |
|---|---|---|---|
| 1 | CLAUDE.md security rules | ⚠️ PARTIAL | 🟡 |
| 2 | permissions.deny on secrets | ❌ MISSING | 🟡 |
| 3 | PreToolUse block-secrets hook (`exit 2`) | ❌ MISSING | 🔴 |
| 4 | Sandbox / dev-container | ❌ MISSING | 🟡 |
| 5 | Read-only reviewer subagent | ❌ MISSING | 🟡 |
| 6 | CI security-review Action | ❌ MISSING | 🟡 |
| 7 | MCP trust segregation | ⚠️ UNVERIFIED | 🟡 |
| 8 | Secrets out of agent-visible files + CI secret-scan | ❌ MISSING | 🔴 |

**Enforcing layers present: 0 / 4** (layers 3, 4, 5, 6 are the ones that actually block).

**Headline:** No enforcing layer protects secret-file access. `permissions.deny` is absent, no `PreToolUse` hook checks paths against `.env`/credential patterns, sandbox is disabled, and `skipDangerousModePermissionPrompt: true` removes the last interactive safety prompt. A live JWT secret sits at `/home/runner/hotel-management-system/backend/.env` with nothing preventing the agent from reading and leaking it.

---

## Layer 1 — CLAUDE.md security rules *(behavioral)*

**Status:** ⚠️ PARTIAL

- `/home/runner/hotel-management-system/CLAUDE.md` — project-level file has an explicit security section (bcrypt rounds, HttpOnly JWT cookies, no secret logging, parameterized queries, HTTPS, "secrets: environment variables only — never committed to git"). Behavioral only.
- `/home/runner/CLAUDE.md` — root file covers workflow and scope rules but has **no dedicated security section**.

Risk: behavioral only — CLAUDE.md is a reminder, not a wall. A `CLAUDE.md` instruction does not prevent the agent from reading `.env` if asked or prompted to.

Recommends: add a security section to `/home/runner/CLAUDE.md` listing forbidden paths (`.env`, `secrets/**`, `~/.aws/**`, `~/.ssh/**`) and back it with a Layer-3 hook.

---

## Layer 2 — permissions.deny on secrets *(behavioral, enforcement-bug caveat)*

**Status:** ❌ MISSING

`/home/runner/.claude/settings.json:3` — `permissions` block contains only `"defaultMode": "auto"`. No `deny` array exists anywhere. `settings.local.json` contains only an `allow` rule.

No secret-path patterns (`*.env`, `secrets/**`, `~/.aws/**`, `~/.ssh/**`) are denied.

**Caveat:** even if added, `permissions.deny` has known enforcement bugs (issues #6699, #6631, #8961, #24846) — it must always be backed by the Layer-3 hook to be reliable.

Recommends: add `permissions.deny` entries for sensitive path patterns in `.claude/settings.json`, then add a Layer-3 hook as the real guard.

---

## Layer 3 — PreToolUse block-secrets hook 🔒 *(enforcing — the one to rely on)*

**Status:** 🔴 MISSING (for secret-file protection)

Two `PreToolUse` hooks are wired (`/home/runner/.claude/settings.json:50-70`):

- `/home/runner/.claude/hooks/rm-blocker.js` — blocks `rm`/`rmdir`/`unlink`/`trash`/`shred` via JSON `decision: block`. Effective for its purpose.
- `/home/runner/.claude/hooks/git-prd-validator.js` — blocks `git push`/`commit`. Effective for its purpose.

**Neither hook inspects `file_path` or `path` against `.env`, `secrets/`, `~/.aws`, `~/.ssh`, or any credential pattern.** Reading or writing secret files is completely unblocked. The hooks use the JSON `decision: block` protocol (functionally equivalent to `exit 2` for Bash), so the mechanism is correct — it is only the secret-path check that is absent.

Also note: `skipDangerousModePermissionPrompt: true` and `skipAutoPermissionPrompt: true` (`/home/runner/.claude/settings.json:89-91`) suppress interactive safety prompts, removing the last fallback when hooks don't cover a case.

Recommends: add a `PreToolUse` hook that reads `tool_input.file_path` (and `tool_input.path`) and returns `{ decision: "block" }` when the path matches `.env`, `secrets/`, `~/.aws/`, `~/.ssh/`, or similar patterns. This is the one layer you can actually rely on.

---

## Layer 4 — Sandbox / dev-container *(enforcing, Bash-only)*

**Status:** ❌ MISSING

No `sandbox` key in `/home/runner/.claude/settings.json` or any `settings.local.json`. No dev-container, bubblewrap, or network-isolation config found.

**Caveat:** sandbox covers only Bash children — Read/Edit run outside it regardless. Combine with permissions/hooks for full coverage.

Recommends: enable `"sandbox": true` in `.claude/settings.json` for Bash isolation, and consider running the agent in a dev container with only the project directory mounted and default-deny outbound network.

---

## Layer 5 — Read-only reviewer subagent *(enforcing via narrow tools)*

**Status:** ❌ MISSING

Seven subagents exist under `/home/runner/.claude/agents/`:
- `agent-config-auditor.md`, `appsec-auditor.md`, `dependency-auditor.md`, `e2e-pentester.md`, `infra-auditor.md`, `privacy-auditor.md`, `runtime-verifier.md`

**All seven include `Bash` in their `tools` list** (`appsec-auditor.md:9`: `tools: [Read, Grep, Glob, Bash]`). Despite descriptions claiming "read-only by construction," the `tools` list is what physically enforces this. With `Bash` present, any subagent can run arbitrary shell commands — they are not read-only.

**Caveat:** a subagent inherits the parent's permission mode; the real enforcement gate is the narrow `tools` list — which is absent here.

Recommends: for auditor/reviewer subagents that should be read-only, change `tools` to `[Read, Grep, Glob]` (drop `Bash`). Keep `Bash` only for subagents that legitimately need shell execution.

---

## Layer 6 — CI security-review Action *(enforcing-ish)*

**Status:** ❌ MISSING

No `.github/` directory exists under `/home/runner`. No CI workflow files of any kind. No `claude-code-security-review` Action, no external-contributor approval gate, no PR-triggered security scan.

**Caveat:** the official `anthropics/claude-code-security-review` Action is not hardened against prompt injection — when added, enable "Require approval for all external contributors."

Recommends: add `.github/workflows/security-review.yml` using `anthropics/claude-code-security-review`, gated on external-contributor approval.

---

## Layer 7 — MCP trust boundaries

**Status:** ⚠️ UNVERIFIED

Multiple MCP plugin manifests exist under `/home/runner/.claude/plugins/marketplaces/` (github, firebase, telegram, discord, playwright, linear, asana, and others). However, no active `mcpServers` key was found in `/home/runner/.claude/settings.json`, and no `.mcp.json` at project root or `~/.claude/mcp.json` was found in static files.

Whether any MCP servers are connected at runtime, and whether read/write servers are segregated, cannot be confirmed from static config alone.

Recommends: if MCP servers are in use, separate read-only servers (e.g. GitHub read) from write/action servers, and gate sensitive tools behind user-approval in session config.

---

## Layer 8 — Secrets handling

**Status:** 🔴 MISSING

Live secrets found in agent-visible files:
- `/home/runner/hotel-management-system/backend/.env:5` — `JWT_SECRET=hotel-jwt-secret-development-32chars!!`
- `/home/runner/hotel-management-system/backend/.env:6` — `JWT_REFRESH_SECRET=hotel-refresh-secret-dev-32chars!!`
- `/home/runner/hotel-management-system/backend/.env` — `DATABASE_URL=postgresql://hotel_user:hotel_pass@...`

Git exposure is partially mitigated: `/home/runner/hotel-management-system/.gitignore:5-7` covers `.env` and `.env.local`. However:

1. **No `permissions.deny`** blocks the agent from reading these files (Layer 2 absent).
2. **No `PreToolUse` hook** blocks secret-file reads (Layer 3 absent for secrets).
3. **No CI secret-scan** (no CI at all — Layer 6 absent).
4. The CLAUDE.md behavioral instruction ("never committed to git") does not prevent the agent from *reading* already-present `.env` files.

The `.env` file sits in the working tree the agent reads, with no blocking layer between the agent and the live credentials.

Recommends:
1. Add a `PreToolUse` hook blocking reads of `.env*`, `secrets/**`, `~/.aws/**`, `~/.ssh/**` (Layer 3 — the real guard).
2. Add `permissions.deny` covering the same patterns as a secondary layer.
3. Move development secrets to a secrets manager or environment injection — avoid secrets-in-files entirely where possible.
4. Add CI secret-scanning (trufflehog / git-secrets) as a last net.

---

## Method

- Auditor (read-only): agent-config-auditor subagent + manual file verification.
- Baseline: 8 layers in `.claude/skills/agent-hardening-review/references/06-agent-hardening.md`.
- Enforcing-layer verification: hook files read directly to confirm block mechanism and scope; subagent tool lists read directly to confirm `Bash` inclusion.
- Reported gaps are recommendations only — no `.claude/` file was written.
