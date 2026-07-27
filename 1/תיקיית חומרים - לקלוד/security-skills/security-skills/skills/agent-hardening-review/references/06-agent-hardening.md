# Embedding security into coding agents (e.g. Claude Code) — the 8 layers

When an agent writes the code, the question shifts:
```text
not "how do I write safe code" — but "how do I configure an agent that can't write/run dangerous things".
```
Security moves from the code to the **agent's configuration**. The agent doesn't understand security —
it completes patterns — so you build **enforcement layers** around it. Defense-in-depth, applied to the
agent itself.

## The core split: weakest → strongest

```text
Behavioral (the agent is "asked")   → CLAUDE.md, cooperation-based permissions
Enforcing  (the system blocks)       → Hooks, Sandbox, tool-restricted subagent
```
Golden rule: **for anything critical, never rely on a behavioral layer alone.** A CLAUDE.md instruction
is a reminder, not a wall.

---

## Layer 1 — CLAUDE.md: guide the agent  *(behavioral)*
Loaded into the system prompt each session. The place for project security rules in natural language
(parameterized queries only; don't read/edit `.env`/`secrets/`/`~/.aws`/`~/.ssh`; every id-scoped
mutation checks ownership; default closed).
**AUDIT:** does a `CLAUDE.md` exist with an explicit security section? It's necessary but **behavioral
only** — present = WARN-level credit, never counts as enforcement.

## Layer 2 — Permissions: allow / deny / ask  *(behavioral-ish)*
`.claude/settings.json` `permissions`, evaluated **deny → ask → allow**, first match wins. Modes:
`default`, `plan`, `acceptEdits`, `bypassPermissions` (isolated env only).
```json
{ "permissions": {
  "deny": ["Read(./.env)","Read(./.env.*)","Read(./secrets/**)","Read(~/.aws/**)"],
  "ask":  ["Bash(git push:*)","Edit(./src/auth/**)"],
  "allow":["Read(./src/**)","Bash(npm run test:*)"] } }
```
**⚠️ verified caveat:** `deny` rules have been reported NOT enforced for Read/Write in some versions
(issues #6699, #6631, #8961, #24846). Treat permissions as a convenient first line — **not** the real
guard for secrets. Real enforcement = Layer 3.
**AUDIT:** is there a `permissions.deny` covering secret patterns? Present = partial credit; **flag that
it must be backed by a hook**.

## Layer 3 — Hooks: the real enforcement gate 🔒  *(enforcing)*
Strongest, most reliable code-level layer. **PreToolUse** is the only hook that can *block* before an
action. It gets `tool_name`/`tool_input` on stdin; **`exit 2` = block** (action cancelled, stderr sent
to the model); `exit 1` = warn only (does NOT block); `exit 0` = continue.
```bash
#!/bin/bash
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')
if echo "$path" | grep -qE '\.env|secrets/|\.aws/|\.ssh/'; then
  echo "blocked: access to sensitive file denied" >&2; exit 2
fi
exit 0
```
Critical rule: **a security hook must `exit 2`** or it enforces nothing. Common uses: block edits to
auth/middleware in prod; block dangerous shell (`rm -rf`, `curl | sh`); require approval before DB ops.
PostToolUse can run a secret-scan/linter on what was written. Hooks run **even in `bypassPermissions`** —
the last safety net.
**AUDIT:** is there a `PreToolUse` hook that blocks secret-file access with `exit 2`? **This is the one
layer you can rely on** — its absence is the headline finding.

## Layer 4 — Sandbox: OS-level isolation  *(enforcing)*
Limits what commands can touch at the OS level. File isolation (read/write only the workdir), network
isolation (internet only via a domain-filtering proxy). Linux bubblewrap / macOS seatbelt.
**⚠️ limit:** sandbox applies to **Bash and its children only** — Read/Edit run outside it; combine with
permissions/hooks. For serious autonomous work, run the agent in a dev container: mount only the project,
run non-root, default-deny outbound network with an allowlist.
**AUDIT:** is sandbox enabled in settings? Is autonomous work containerized?

## Layer 5 — Tool-restricted review subagent  *(enforcing)*
A subagent with **read-only tools** (e.g. `[Read, Grep, Glob]`, no Edit/Bash/Write) physically can't
change anything.
```markdown
---
name: security-reviewer
description: reviews code for security vulnerabilities — read-only
tools: [Read, Grep, Glob]
---
Hunt: SQL injection, secrets in code, XSS, unsafe deserialization, IDOR. Report only — change nothing.
```
**⚠️** a subagent **inherits the parent's permission mode** (parent in bypass → it too); the real limit
is the narrow `tools` list.
**AUDIT:** is there a read-only reviewer subagent defined?

## Layer 6 — Automated CI review: /security-review + GitHub Action  *(enforcing-ish)*
Built-in `/security-review` scans the current diff (SQLi, XSS, auth bugs, unsafe data handling,
dependency issues). Same capability as the official **`anthropics/claude-code-security-review`** GitHub
Action — diff-aware, inline PR comments.
**⚠️ official warning:** the Action is **not hardened against prompt injection** — run only on trusted
PRs; enable "Require approval for all external contributors".
**AUDIT:** is the security-review Action wired into CI, with external-contributor approval required?

## Layer 7 — MCP: every server is a new trust boundary
Each MCP connection (GitHub, DB, APIs) is an attack vector — tool output can carry prompt injection.
Treat every tool output as untrusted; separate read-only from write/action servers; require user
approval for sensitive tools. Anthropic vets connectors for the directory but does **not** security-audit
servers — that's on you.
**AUDIT:** are connected MCP servers segregated by trust (read vs write)? sensitive tools gated?

## Layer 8 — Secrets: the most sensitive point
Reported: `.env` contents can reach the transcript/logs **despite** a CLAUDE.md ban — the behavioral
block is too late. The agent also does **not** automatically respect `.gitignore`. What to do:
```text
1. permissions.deny on every sensitive pattern (remember the Layer-2 enforcement caveat)
2. PreToolUse hook blocking secret-file reads — the guard you can actually trust
3. secrets in a vault / env vars, not in files the agent can see
4. secret-scanning in CI (trufflehog / git-secrets) as the last net
```
**AUDIT:** secrets out of agent-visible files? deny + hook both present? CI secret-scan present?

---

## 16-principles → agent-enforcement mapping
```text
authn / authz / input / errors   → CLAUDE.md (guide) + security-reviewer + /security-review
secret & sensitive-data access   → permissions.deny + PreToolUse hook (enforcement)
running dangerous commands        → Sandbox + PreToolUse hook
supply chain (packages)           → hook/CI running npm/pip audit + version pinning
secret management                 → blocking hook + vault + CI secret-scan
human review                      → plan mode + human PR review (never skip)
automated tests                   → GitHub Action + PostToolUse hooks
the agent's own permissions       → permission modes + sandbox + tool-restricted subagent
```

## Recommended starter layout
```text
.claude/
├── settings.json        → permissions (deny on secrets) + sandbox enabled
├── CLAUDE.md            → project security rules
├── hooks/
│   └── block-secrets.sh → PreToolUse, exit 2 on secret files
└── agents/
    └── security-reviewer.md → read-only subagent
CI (GitHub):
└── claude-code-security-review → on every PR, require-approval for externals
```

## Don't / don't-rely-on
```text
✗ rely on CLAUDE.md alone to protect secrets (behavioral only)
✗ rely on permissions.deny alone (enforcement bugs reported — add a hook)
✗ run bypassPermissions outside an isolated env
✗ run security-review on untrusted PRs (not injection-hardened)
✗ skip human review of security code — no automation replaces it
```

## One-line summary
```text
Embed security in the agent not via nice requests but via enforcement layers:
hooks block, sandbox isolates, a tool-restricted subagent can't touch code, CI scans every PR.
CLAUDE.md guides; the rest enforces; a human always reviews the sensitive parts.
```

## Sources
Claude Code docs: permissions · settings · hooks · sandboxing · memory/CLAUDE.md · subagents · MCP.
Anthropic Engineering: Claude Code sandboxing. GitHub: anthropics/claude-code-security-review.
deny-enforcement issues: #6699 · #6631 · #8961 · #24846.
