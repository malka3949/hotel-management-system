# Software Security Findings — <REPO_NAME> — <YYYY-MM-DD>

> Read-only audit against the 16 software-security principles. No code was modified.
> Scope: <PATH audited>.  Verify pass: /security-review <ran | skipped>.

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | N |
| 🟡 risk | N |
| 🔵 nit | N |

**Principles covered:** X / 11 code-auditable  ·  **Domains:** authn/authz · input/files · data/secrets/sessions · errors/defaults

Top 3 to fix first:
1. 🔴 `<file:line>` — <one-line>
2. 🔴 `<file:line>` — <one-line>
3. 🟡 `<file:line>` — <one-line>

---

## 2. Authorization (IDOR / ownership) — FAIL | WARN | PASS

- 🔴 `src/controllers/client.py:48` — `update_client` loads `Client` by `id` from the URL with no
  ownership check; any authenticated user can edit any client (IDOR).
  **Why:** `07-authorization-and-roles.md §IDOR`. **Fix:** scope the query to the current user
  (`where owner_id = current_user.id`) or 403.

<repeat the `- <emoji> \`file:line\` — <problem>. **Fix:** <short>.` shape per finding>

## 3. Input Validation (mass-assignment) — FAIL | WARN | PASS
- ...

## 1. Authentication — ...
## 4. Data Protection — ...
## 5. Privacy by design (Amendment 13) — ...
## 6. Sessions & tokens — ...
## 7. Safe file handling — ...
## 8. Secure communication — ...
## 9. Logging & monitoring — ...
## 10. Error handling (fail-closed) — ...
## 11. Secure defaults — ...

---

## Out-of-code (process/infra) notes
Operational-permission items (domain 3) that surfaced — reported as context, not code defects:
- ...

## Low-confidence / needs human review
Findings the adversarial verify could **not** confirm (≥2 skeptics refuted). Surfaced — not dropped —
because the verifier may be wrong. Treat as leads, not facts:
- 🟡? `path:line` — <claim>. (refuted: <why the skeptics weren't convinced>)

## Coverage gaps & follow-ups
This report is **not exhaustive**. What was not covered (from the completeness critic):
- **Not scanned / out of scope:** <e.g. dependencies/supply-chain → /secure-audit supply-chain; infra → /infra-audit; runtime behavior → runtime-confirm>
- **Blind spots:** <subsystem/dir/data-flow not traced>
- **Unverified claims:** <any confirmed finding whose proof is incomplete>

## Method
- Auditors (read-only): appsec-auditor ×N, by domain.
- Baseline: the 16 principles in `secure-code-review/references/`.
- Each 🔴 was spot-checked against the actual code before listing.

<!-- FORMAT RULES for whoever fills this in:
- Every finding line: `- <emoji> \`relative/path.ext:line\` — <one-sentence problem>. **Why:** <ref doc §section>. **Fix:** <short>.`
- **Why = the reference** — every finding cites the principle deep-dive + section that explains it
  (e.g. `07-authorization-and-roles.md §IDOR`), so a reader can follow it to learn the rule. Keep it on every line.
- Use repo-relative paths so file:line is clickable in the terminal.
- Severity: 🔴 wrong/exploitable now · 🟡 edge/missing-guard · 🔵 style/minor.
- Only list a principle section if it has findings OR you explicitly mark it PASS.
- Never invent a line number — if unsure, omit the finding.
- HONESTY: never fabricate confidence or a fix. If a concern can't be confirmed → put it in the
  "Low-confidence / needs human review" section as `❔ unconfirmed — recheck` (+ what's needed), not as a 🔴.
  If a real finding has no clean fix → write `**Fix:** couldn't find a fix — needs human decision (why: <tension/decision>)`
  rather than a fix that only looks like an answer. "Couldn't confirm / couldn't find a fix" is a valid, trusted result. -->
