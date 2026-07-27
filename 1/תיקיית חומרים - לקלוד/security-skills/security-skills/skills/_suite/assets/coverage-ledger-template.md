# Security Coverage Ledger — <REPO> — <YYYY-MM-DD>

> The explicit register of what was tested and what remains blind. Assembled from the reports present
> under `<path>/security/` and `<path>/privacy/`. "Zero blindness" is impossible; this makes the residual
> blindness **visible and tracked** instead of silently absent.

## Modalities run

| # | Modality | Tool | Ran? | Report | 🔴 | low-conf | Coverage |
|---|---|---|---|---|---|---|---|
| 1 | static-code | /secure-audit | ✅/❌ | SOFTWARE-SECURITY-FINDINGS.md | N | N | full / partial / none |
| 2 | dependencies | dependency-auditor | ✅/❌ | (in software report, supply-chain) | N | — | … |
| 3 | infra-config | /infra-audit | ✅/❌ | INFRA-SECURITY-FINDINGS.md | N | N | … |
| 4 | agent-config | /agent-harden-audit | ✅/❌ | AGENT-HARDENING-FINDINGS.md | N | — | … |
| 5 | privacy-law | /privacy-audit | ✅/❌ | PRIVACY-COMPLIANCE-AMENDMENT13.md | N | N | … |
| 6 | runtime-probe | /runtime-confirm | ✅/❌ | RUNTIME-CONFIRMATION.md | conf/notrepro | — | … |
| 7 | e2e-behavioral | /e2e-security | ✅/❌ | E2E-SECURITY-FINDINGS.md | vuln/inconcl | — | … |

**Modalities not yet run:** <list> → run them to close mechanizable blindness.

## Cross-modality corroboration
Findings confirmed by more than one angle (highest confidence):
- `<finding>` — static (`file:line`) + infra (`directive`) + e2e (vulnerable-confirmed) → **proven**.

Static findings still **unconfirmed at runtime** (candidate false positives or just not probed):
- `<finding>` — only static; run /runtime-confirm or /e2e-security to settle.

## Residual blind spots for this target (human / future)
From `_suite/references/blind-spots.md`, the ones that apply here:
- [ ] Business-logic abuse — needs human review of <which flows: points/settlement/…>
- [ ] Multi-step races / TOCTOU — not exercised
- [ ] Threat-model / design gaps — needs a human threat-model pass
- [ ] Cryptographic usage correctness — needs human crypto review
- [ ] e2e playbook gaps — <CSRF/SSRF/stored-XSS/upload-bypass/open-redirect/CORS> not scripted
- [ ] Third-party vendor internals / signed DPAs — contractual
- [ ] Infra-ops (cloud IAM, DNS, CI-runner, physical) — outside the suite

## Bottom line
Mechanizable blindness removed across **<X>/7** modalities. Residual blindness is the checklist above —
**explicit and assigned**, not hidden. To shrink further: run the un-run modalities, then close the human-only items.

<!-- Assembled by /security-ledger: read each report's Summary + "Coverage gaps" section; fill counts;
mark a modality ✅ only if its report file exists. Do not invent counts — read them. -->
