---
name: server-hardening-review
description: >
  Audit a LIVE server's hardening state over SSH (read-only) against an end-to-end server-security
  model — SSH/access, firewall & open ports, internet edge (nginx/HTTPS/Cloudflare), secrets/.env/git
  & file permissions, system updates, backups, logs & monitoring, and incident-readiness — and produce
  a Hebrew Markdown gap report anchored to the command run + its output. Use when asked to harden/secure
  a server or VPS, check server security, audit ssh/ufw/firewall/fail2ban/updates/backups/monitoring on
  a host, or runs /server-audit. Read-only — runs only non-mutating commands and writes only the report;
  the server is never changed. Audits live server-STATE (sibling of infra-security-review, which audits
  repo config files).
metadata:
  author: skill-creator session
  version: "1.0"
---

# server-hardening-review

Audit a **live server over SSH** — the running state, not a repo's config files (that's
`infra-security-review` / `/infra-audit`). New modality: **server-state**. We check what is *actually*
running and exposed right now — `ufw status`, `sshd -T`, `fail2ban`, listening sockets, pending
updates, file perms, backups, monitoring — and report gaps in **Hebrew**, anchored to **the command +
its output**. **Read-only by construction**: only non-mutating commands; the only file written is the
report. Fixes are emitted as recommended commands for the user to run.

## Baseline (load on demand)
- **`references/01-overview.md`** — scope, the **read-only safety contract** (allowed vs forbidden
  commands), stack-detection, severity, category map. **Load first, always.**
- `references/02-access-ssh.md` — SSH & users [access]
- `references/03-network-firewall.md` — firewall & open ports [network]
- `references/04-edge-nginx-tls.md` — internet edge: nginx/HTTPS/Cloudflare [edge]
- `references/05-secrets-git-perms.md` — secrets/.env/git/permissions [secrets]
- `references/06-updates.md` — system updates [updates]
- `references/07-backups.md` — backups [backups]
- `references/08-logs-monitoring.md` — logs & monitoring [observability]
- `references/09-incident-readiness.md` — incident readiness [incident]

## The model (building analogy)
Server = building. Firewall = front guard · nginx = reception that routes inward · DB/.env = vault in
the basement · logs = security cameras · monitoring = alarm system · backups = the ability to roll back.
Every finding is a gap in one of the 8 categories above.

## Workflow
1. **Resolve target.** `$ARGUMENTS` = SSH target (`user@host`, or an `~/.ssh/config` alias) + optional
   output-dir. **Confirm with the user before connecting to any real host.** Load `references/01`.
2. **Detect the stack first** (`cat /etc/os-release`; which firewall/pkg-mgr/init) so you pick the
   matching read command. Missing tool → "לא נבדק — כלי לא קיים"; `sudo` denied → "לא ניתן לאמת".
3. **Spawn `server-hardening-auditor` subagents in PARALLEL, one per category** (Task tool, single
   message): read-only `[Read, Grep, Glob, Bash]`. Pass each: the SSH target, its category, its
   reference file, and the finding format. Each runs **only allowlisted read commands over SSH** and
   returns findings anchored to **command + output**.
4. **Collect + dedupe**; sort by severity. **Spot-check every 🔴** against the raw command output.
5. **State coverage limits.** Fill "פערי כיסוי": repo config → `/infra-audit`; app code →
   `/secure-audit`; privacy law → `/privacy-audit`; live HTTP reachability → `runtime-confirm`;
   cloud-provider firewall / security-groups / physical layer → out of scope (not visible from inside).
   Unconfirmed findings → "ממצאים בוודאות נמוכה", don't drop them.
6. **Write** `<output-dir>/security/SERVER-HARDENING-FINDINGS.md` (default cwd) in **Hebrew**, using
   `assets/server-findings-template.md` — real `command → output`, real date, real counts. Only this
   file is written. Tell the user the path + top-3.

## Rules
- **Read-only on the live server.** Run only commands in the reference 01 allowlist. Never enable/change
  firewall, SSH, services, perms, packages, containers, or any file. `sudo` only for read verbs.
- Anchor every finding to the **command + its output** (this is live state, not law and not a repo file).
- Severity: 🔴 internet-reachable exposure / leaked secret / root-login-on / expired cert · 🟡 missing
  hardening / weak default · 🔵 minor.
- Output language: **Hebrew** (technical terms in English).
- A finding from this layer often *re-confirms* a repo finding from `/infra-audit` from the live angle:
  compose says `ports: "5432:5432"`, and here `ss -tlnp` proves it's actually listening on 0.0.0.0.

## Gotchas
- **`ss -tlnp` is the truth, not the firewall.** A service can listen on 0.0.0.0 yet be blocked by ufw —
  that's 🟡 (defense-in-depth gap, firewall-dependent), not a clean pass. Report both.
- **`sshd -T` (effective config), not `cat sshd_config`.** Includes are merged; the file can say one
  thing and the running daemon another. Same for `ufw status` over reading rule files.
- **A leaked secret stays compromised after deletion** → recommend **rotate (החלפה)**, not just remove.
  A secret found in git history is already exposed even if the file was deleted.
- **No backups is itself a 🔴.** Backups are non-standard — search for evidence; absence of any backup
  mechanism is a finding, not "N/A".
- **Generic target:** apt≠dnf, ufw≠firewalld≠nft, systemd may be absent. Detect, then choose; never
  guess a PASS for a tool you couldn't run.
- **`lastb` / reading root files / `ufw status` need `sudo`.** If the SSH user is non-sudo, mark those
  items "לא ניתן לאמת" (coverage gap), never PASS.
