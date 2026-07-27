export const meta = {
  name: 'secure-audit-max',
  description: 'Deterministic per-principle software-security audit: one read-only auditor per principle, adversarial verify of each finding, then write the gap report',
  whenToUse: 'Thorough/token-heavy alternative to /secure-audit. Fans out 12 auditors (11 appsec-auditor per principle + 1 dependency-auditor for supply-chain), refutes each finding, runs a completeness critic, surfaces low-confidence findings, writes SOFTWARE-SECURITY-FINDINGS.md. Pass the target path as args.',
  phases: [
    { title: 'Audit', detail: 'one read-only appsec-auditor per principle, in parallel' },
    { title: 'Verify', detail: 'adversarial refute of each finding (2 skeptics)' },
    { title: 'Critic', detail: 'completeness critic — what did the audit NOT cover' },
    { title: 'Report', detail: 'render confirmed + low-confidence + coverage gaps into the report' },
  ],
}

// ---- target path -------------------------------------------------------------
const TARGET = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && args.path) ? args.path : '.'
const REFDIR = '~/.claude/skills/secure-code-review/references'
const TEMPLATE = '~/.claude/skills/secure-code-review/assets/findings-template.md'

// ---- the 11 code-auditable principles, each → its deep-dive(s) + focus -------
const PRINCIPLES = [
  { n: 1,  name: 'Authentication',        refs: ['02-software-principles.md'],                  focus: 'non-public routes lacking an auth guard; webhooks without signature/secret; "temporary" unauthenticated paths' },
  { n: 2,  name: 'Authorization / IDOR',  refs: ['07-authorization-and-roles.md','06-tokens-and-sessions.md'], focus: 'id-scoped mutating/sensitive-read endpoints with no ownership/tenant scope (IDOR); admin routes with auth but no authz; role/owner id accepted from the request body (privilege escalation)' },
  { n: 3,  name: 'Input Validation',      refs: ['08-input-validation-and-injection.md'],       focus: 'mass-assignment (whole-body save, no field allowlist); SQL/NoSQL/command injection; XSS sinks; missing boundary validation' },
  { n: 4,  name: 'Data Protection',       refs: ['09-secrets-management.md'],                   focus: 'plaintext/fast-hash credentials; secrets read in client-bundled code; over-collected/unmasked sensitive fields; hard-coded encryption keys' },
  { n: 5,  name: 'Privacy (Amendment 13)',refs: ['02-software-principles.md'],                  focus: 'no personal-data mapping / retention-cleanup / delete-export capability / audit log on sensitive actions' },
  { n: 6,  name: 'Sessions & Tokens',     refs: ['06-tokens-and-sessions.md'],                  focus: 'tokens in URL/logs; JWT verify trusting header alg / no exp; refresh tokens not rotated / stored plaintext; reset/magic tokens reusable; cookie missing HttpOnly/Secure/SameSite' },
  { n: 7,  name: 'Safe File Handling',    refs: ['08-input-validation-and-injection.md'],       focus: 'upload type checked by extension only; original filename used in path (traversal); uploads stored in a web-executable path; no size cap; download without ownership check' },
  { n: 8,  name: 'Secure Communication',  refs: ['11-secure-communication.md'],                 focus: 'webhook handler without signature verify; non-constant-time signature compare; disabled TLS verification; no rate limit on login/reset/OTP; wildcard/credentialed CORS; replay-able webhooks/payments' },
  { n: 9,  name: 'Logging & Audit',       refs: ['10-logging-and-audit.md'],                    focus: 'secrets/tokens/PII/full request bodies written to logs or error responses; no audit log on export/delete/permission-change; stack traces returned to client' },
  { n: 10, name: 'Error Handling',        refs: ['03-error-handling.md'],                       focus: 'fail-open auth (error path/default allows); empty/ignore catch around critical ops; multi-write with no transaction; raw DB/stack errors to client; blind retry without idempotency' },
  { n: 11, name: 'Secure Defaults',       refs: ['04-secure-defaults.md'],                      focus: 'default-open roles/routes/fields; new user/role defaults broad; DEBUG=true / wildcard CORS / seeded admin / test routes in prod; hard delete of sensitive records' },
  { n: 12, name: 'Supply Chain',          refs: ['12-supply-chain.md'], agent: 'dependency-auditor', focus: 'run the ecosystem vuln scanner (npm audit / pip-audit / osv-scanner, read-only); known CVEs; missing/uncommitted lockfile; wide version floats; install-time scripts; typosquat/abandoned deps; committed registry creds' },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['critical', 'risk', 'nit'] },
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'integer' },
          problem: { type: 'string', description: 'one sentence: the symptom + its ROOT CAUSE (the bad pattern/mechanism in this code) + the impact — so a reader understands what causes it, not just that it is wrong' },
          ref: { type: 'string', description: 'the reference file + section that explains it, e.g. "07-authorization-and-roles.md §IDOR"' },
          fix: { type: 'string', description: 'short; or "could not find a fix — needs human decision (why: …)"' },
        },
        required: ['severity', 'file', 'line', 'problem', 'ref', 'fix'],
      },
    },
    pass: { type: 'boolean', description: 'true if the principle is clean (no findings)' },
  },
  required: ['findings', 'pass'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    refuted: { type: 'boolean', description: 'true if this is NOT a real exploitable issue' },
    reason: { type: 'string' },
  },
  required: ['refuted', 'reason'],
}

const SEV = { critical: '🔴', risk: '🟡', nit: '🔵' }

// ---- pipeline: each principle audits, then each of its findings is refuted ----
log(`secure-audit-max on ${TARGET} — ${PRINCIPLES.length} principles`)

const perPrinciple = await pipeline(
  PRINCIPLES,
  // stage 1 — audit one principle (read-only appsec-auditor)
  (p) => agent(
    `Read-only software-security audit of the codebase at "${TARGET}".\n` +
    `FOCUS: principle ${p.n} — ${p.name}.\n` +
    `Load these references for the full check list: ${p.refs.map(r => `${REFDIR}/${r}`).join(', ')}.\n` +
    `Hunt specifically: ${p.focus}.\n` +
    `Open and confirm each cited line before reporting it. If you cannot confirm, don't assert it as a 🔴 — ` +
    `but don't silently drop a plausible concern: mark it "unconfirmed — recheck" with what's needed. ` +
    `Use repo-relative paths and real line numbers. Severity: critical = exploitable/wrong now, ` +
    `risk = edge/missing-guard, nit = minor. Return findings only.`,
    { label: `audit:P${p.n}-${p.name.split(/[ /]/)[0]}`, phase: 'Audit', agentType: p.agent || 'appsec-auditor', schema: FINDINGS_SCHEMA }
  ),
  // stage 2 — adversarially verify each finding from this principle (2 skeptics; survives if <2 refute)
  (res, p) => {
    const findings = (res && res.findings) ? res.findings : []
    if (!findings.length) return []
    return parallel(findings.map((f) => () =>
      parallel([0, 1].map((k) => () =>
        agent(
          `Adversarial review. A prior auditor claims this software-security issue in "${TARGET}":\n` +
          `  principle ${p.n} ${p.name} | ${SEV[f.severity]} ${f.file}:${f.line}\n  "${f.problem}"\n` +
          `Read the cited file/line and the surrounding code. Try to REFUTE it — is it actually ` +
          `exploitable/wrong, or a false positive (guard exists elsewhere, framework handles it, not user-reachable)? ` +
          `Default refuted=true if you are not convinced it is real.`,
          { label: `verify:${f.file.split('/').pop()}:${f.line}#${k}`, phase: 'Verify', agentType: 'appsec-auditor', schema: VERDICT_SCHEMA }
        )
      )).then((votes) => {
        const refutes = votes.filter(Boolean).filter(v => v.refuted).length
        return { ...f, principle: p.n, principleName: p.name, survived: refutes < 2, refutes }
      })
    ))
  }
)

// bucket — do NOT silently drop refuted findings; surface them as low-confidence
const allFindings = perPrinciple.flat().filter(Boolean)
const seen = new Set()
const dedupe = (arr) => arr.filter(f => {
  const key = `${f.file}:${f.line}:${f.problem}`
  if (seen.has(key)) return false
  seen.add(key); return true
})
const deduped = dedupe(allFindings.filter(f => f.survived))
const lowConfidence = dedupe(allFindings.filter(f => !f.survived)) // refuted by >=2 skeptics — kept, not dropped
const counts = {
  critical: deduped.filter(f => f.severity === 'critical').length,
  risk: deduped.filter(f => f.severity === 'risk').length,
  nit: deduped.filter(f => f.severity === 'nit').length,
}
const cleanPrinciples = PRINCIPLES
  .filter(p => !deduped.some(f => f.principle === p.n))
  .map(p => `${p.n} ${p.name}`)

log(`verified: ${deduped.length} (🔴${counts.critical} 🟡${counts.risk} 🔵${counts.nit}) · low-confidence: ${lowConfidence.length}`)

// ---- completeness critic: what did the audit NOT cover? ----------------------
phase('Critic')
const CRITIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    coverageGaps: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { area: { type: 'string' }, why: { type: 'string' }, suggestedCheck: { type: 'string' } },
      required: ['area', 'why', 'suggestedCheck'],
    } },
    unverifiedClaims: { type: 'array', items: { type: 'string' } },
    notScanned: { type: 'array', items: { type: 'string' } },
  },
  required: ['coverageGaps', 'unverifiedClaims', 'notScanned'],
}
const critic = await agent(
  `Completeness critic for a static security audit of "${TARGET}". The audit ran ${PRINCIPLES.length} ` +
  `per-principle auditors (static grep/read only). Confirmed findings (JSON): ${JSON.stringify(deduped)}\n` +
  `Independently inspect the repo and report BLIND SPOTS this audit likely missed: a subsystem/dir never ` +
  `opened, a cross-file/data-flow taint not traced, frontend code, business-logic flaws, anything ` +
  `outside the 11 principles, and any confirmed finding whose claim was not actually proven. ` +
  `Note that supply-chain (deps) and infrastructure (nginx/docker/ports/CI secrets) are OUT of this ` +
  `audit's scope — list them under notScanned. Be concrete (name dirs/files). Do not re-report the ` +
  `findings above.`,
  { label: 'critic', phase: 'Critic', agentType: 'appsec-auditor', schema: CRITIC_SCHEMA }
)
log(`coverage gaps: ${critic.coverageGaps.length} · not-scanned: ${critic.notScanned.length}`)

// ---- report: one agent renders the template and WRITES the report file -------
phase('Report')
const findingsBlock = JSON.stringify(deduped, null, 2)
await agent(
  `Write the software-security gap report. Read the template at ${TEMPLATE} and follow its format ` +
  `and its FORMAT RULES comment exactly.\n\n` +
  `Repo audited: "${TARGET}".  Verify pass: adversarial refute (2 skeptics per finding) — note this ` +
  `in the Method section; the built-in /security-review is NOT available inside a workflow, so mark it ` +
  `"skipped (run /secure-audit for the /security-review verify pass)".\n\n` +
  `Counts: 🔴 ${counts.critical}  🟡 ${counts.risk}  🔵 ${counts.nit}. ` +
  `Principles covered: ${PRINCIPLES.length}. Clean (PASS) principles: ${cleanPrinciples.join('; ') || 'none'}.\n\n` +
  `VERIFIED FINDINGS (JSON — group these by principle into the report's per-principle sections, ` +
  `each line: "- <emoji> \`file:line\` — <problem>. **Why:** <ref>. **Fix:** <fix>." with emoji 🔴=critical 🟡=risk 🔵=nit; ` +
  `keep the ref on EVERY line so each finding points to the principle doc + section that explains it):\n` +
  `${findingsBlock}\n\n` +
  `LOW-CONFIDENCE FINDINGS (JSON — refuted by the skeptics; render in a clearly-separated appendix ` +
  `"## Low-confidence / needs human review" with a one-line note that these were NOT confirmed and ` +
  `may be false positives, but are surfaced rather than dropped):\n${JSON.stringify(lowConfidence, null, 2)}\n\n` +
  `COVERAGE GAPS (JSON from the completeness critic — render in a section "## Coverage gaps & follow-ups" ` +
  `listing what this audit did NOT cover, what's out-of-scope/not-scanned, and any unverified claims, so ` +
  `the reader knows the report is not exhaustive):\n${JSON.stringify(critic, null, 2)}\n\n` +
  `Write the result to "${TARGET}/security/SOFTWARE-SECURITY-FINDINGS.md" (create the security/ dir if needed). ` +
  `Use today's date. Do NOT modify any audited code — only write that one report file. ` +
  `Reply with just the written path and the top-3 findings.`,
  { label: 'report:write', phase: 'Report' }
)

return {
  target: TARGET,
  counts,
  total: deduped.length,
  lowConfidence: lowConfidence.length,
  coverageGaps: critic.coverageGaps.length,
  cleanPrinciples,
  report: `${TARGET}/security/SOFTWARE-SECURITY-FINDINGS.md`,
}
