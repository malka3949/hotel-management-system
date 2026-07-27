# The security-audit suite — modalities & residual blind spots

"Zero blindness" is not achievable by analysis tooling. What IS achievable: **make every blind spot
explicit and tracked**, and cover the same target from as many independent angles as possible so a miss in
one modality is caught by another. This file is the master register of what the suite sees and what it
structurally can't.

## The 6 modalities (independent angles on the same target)
```text
1. static-code     /secure-audit · secure-audit-max     reads source; principles 1–11 (+ supply-chain entry)
2. dependencies    dependency-auditor (in /secure-audit) npm/pip/osv audit, lockfile, install hooks
3. infra-config    /infra-audit · infra-audit-max        nginx/ports/TLS/containers/secrets-CI (domain 2)
4. agent-config    /agent-harden-audit                   the coding agent's own .claude/ (8 layers)
5. privacy-law     /privacy-audit                        Amendment 13 / 2017 regs / AI guidance
6. runtime-probe   /runtime-confirm                      a few curls confirm a static finding at runtime
7. e2e-behavioral  /e2e-security · e2e-security-max       drive the real app + capture + assert (incl. app DB)
8. server-state    /server-audit · server-audit-max      read-only SSH into a live host; ufw/sshd -T/ss/fail2ban/updates/backups/monitoring
```
(Privacy and agent-config are domain layers rather than pure detection modalities, but they cover ground
the others don't — listed so the ledger is complete. server-state inspects the *running host*, the live
counterpart of infra-config's *repo files*.)

## What each modality structurally CANNOT see
```text
static-code    → runtime-only behavior (races/TOCTOU), real exploitability, config/infra, deployed state
dependencies   → vulns with no published advisory; first-party code; runtime-only dep behavior
infra-config   → whether a "published" port is actually reachable now; cloud IAM / firewall appliances
agent-config   → the app's own runtime security; anything outside .claude/
privacy-law    → signed DPAs, org process, infra network-separation, whether deletion truly purges backups
runtime-probe  → anything needing auth/multi-step flows; source-only facts (hard-coded secret, mass-assign)
e2e-behavioral → only what the playbook drives; un-scripted flows; deep business-logic correctness
server-state   → cloud-provider firewall/security-groups, physical/BIOS layer, app-logic; items needing sudo the SSH user lacks; tools not installed on the host
```

## Residual blind spots — NOT covered by ANY modality (mitigation = human / future)
```text
- Business-logic correctness & abuse (e.g. points/settlement math exploited within the rules) — HUMAN review
- Multi-step race conditions / TOCTOU not explicitly exercised by an e2e scenario — HUMAN + targeted e2e
- Design / threat-model gaps (the wrong thing built securely) — HUMAN threat-modeling
- Cryptographic correctness (right primitive, wrong usage/IV/mode) — HUMAN crypto review
- Social engineering / phishing / insider — process & training, not code
- Third-party server internals (the vendor's own security behind a DPA) — contractual, not testable here
- Supply-chain zero-days with no advisory yet — partial: pinning + monitoring, not detection
- Physical / cloud-account / DNS / CI-runner compromise — infra-ops, outside this suite
- Anything the e2e playbook doesn't script (CSRF, SSRF, stored-XSS, upload-bypass, open-redirect, CORS) until added
```

## How to drive blindness toward zero (bounded)
1. Run **all applicable modalities** on the target (the ledger shows which ran).
2. Each report ends with a **Coverage gaps & follow-ups** section (the per-tool critic) — read it.
3. Assemble the per-target **COVERAGE-LEDGER.md** (`/security-ledger`) — it lists which modalities ran,
   their counts, and this residual list, so the remaining blindness is *on the page*, not hidden.
4. Close the named residuals with **human review** for the human-only items. That's the floor; the suite
   removes the mechanizable blindness and surfaces the rest.
