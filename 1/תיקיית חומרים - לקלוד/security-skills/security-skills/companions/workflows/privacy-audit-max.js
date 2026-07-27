export const meta = {
  name: 'privacy-audit-max',
  description: 'Deterministic Israel Amendment-13 privacy compliance audit: classify → one read-only auditor per category → adversarial verify → write the Hebrew compliance document',
  whenToUse: 'Thorough/token-heavy alternative to /privacy-audit. Classifies data + security level, fans out one privacy-auditor per category, refutes each finding, writes PRIVACY-COMPLIANCE-AMENDMENT13.md. Pass the target path as args.',
  phases: [
    { title: 'Classify', detail: 'data classification + security level' },
    { title: 'Audit', detail: 'one read-only privacy-auditor per category, in parallel' },
    { title: 'Verify', detail: 'adversarial refute of each finding (2 skeptics)' },
    { title: 'Critic', detail: 'completeness critic — what did the audit NOT cover' },
    { title: 'Report', detail: 'render confirmed + low-confidence + coverage gaps into the document' },
  ],
}

const TARGET = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && args.path) ? args.path : '.'
const REFDIR = '~/.claude/skills/israel-privacy-compliance/references'
const TEMPLATE = '~/.claude/skills/israel-privacy-compliance/templates/compliance-report-template.md'

// ---- categories → reference + focus ------------------------------------------
const CATEGORIES = [
  { key: 'data-classification',  ref: '02-data-classification.md',  focus: 'map every PII/sensitive field; flag specially-sensitive (health, biometric, location/GPS, salary/financial, ethnicity/religion/political, criminal); determine the security level (Sec 3; 2017 regs)' },
  { key: 'consent-minimization', ref: '07-consent-minimization.md', focus: 'over-collection (fields with no purpose); secondary use beyond stated purpose (marketing/training/profiling) without consent; 3rd-party PII sharing without notice (Sec 8(b), 11; Reg 2(c))' },
  { key: 'access-logging',       ref: '04-access-logging.md',       focus: 'no MFA on a medium/high DB (Reg 9); no automatic access audit-log with the 5 fields incl. denied attempts / <24mo retention (Reg 10); broad or missing server-side ownership checks (Reg 8); secrets/PII in logs' },
  { key: 'encryption-network',   ref: '05-encryption-network.md',   focus: 'PII over non-TLS or disabled TLS verification (Reg 14); specially-sensitive data at rest unencrypted (Reg 12); no separation of sensitive DB / no env separation (Reg 13 — note pure network separation is infra)' },
  { key: 'data-subject-rights',  ref: '06-data-subject-rights.md',  focus: 'soft-delete-only with data still retrievable (Sec 14 → 15א exposure); no full per-user export (Sec 13); deletion ignoring derived data (cache/index/3rd-party/logs); no correction path' },
  { key: 'ai-processing',        ref: '08-ai-processing.md',        focus: 'if no AI usage → N/A. Else: PII to external LLM without DPA / no-training tier / masking; training or scraping without consent; no AI/bot disclosure; no human-in-the-loop for wrong output; no DPIA (2025 guidance; Reg 15)' },
]

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    notApplicable: { type: 'boolean', description: 'true if the category does not apply (e.g. no AI)' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['critical', 'risk', 'nit'] },
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'integer' },
          problem: { type: 'string', description: 'one sentence: the symptom + its ROOT CAUSE (the data/flow/pattern that creates it) + impact — so a reader understands what causes the non-compliance' },
          lawAnchor: { type: 'string', description: 'the section/regulation, e.g. "סעיף 14" / "תקנה 10(א)"' },
          fix: { type: 'string', description: 'short' },
        },
        required: ['severity', 'file', 'line', 'problem', 'lawAnchor', 'fix'],
      },
    },
  },
  required: ['findings', 'notApplicable'],
}
const CLASSIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    level: { type: 'string', enum: ['basic', 'medium', 'high', 'unknown'] },
    reasoning: { type: 'string' },
    sensitiveTypes: { type: 'array', items: { type: 'string' } },
    classificationTable: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { field: { type: 'string' }, classification: { type: 'string' }, storedIn: { type: 'string' }, sensitive: { type: 'boolean' } },
      required: ['field', 'classification', 'sensitive'],
    } },
  },
  required: ['level', 'reasoning', 'sensitiveTypes', 'classificationTable'],
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted', 'reason'],
}
const SEV = { critical: '🔴', risk: '🟡', nit: '🔵' }

// ---- Phase 1: classify + determine security level (gates everything) ----------
phase('Classify')
const cls = await agent(
  `Read-only Israeli-privacy classification of the codebase at "${TARGET}". ` +
  `Load ${REFDIR}/02-data-classification.md and ${REFDIR}/03-security-levels.md. ` +
  `Scan DB schema / models / migrations (and logs, prompts, 3rd-party sinks) and map every personal/` +
  `sensitive field. Flag specially-sensitive types (health, biometric, location/GPS, salary/financial, ` +
  `ethnicity/religion/political, criminal). Determine the required security level (basic/medium/high) — ` +
  `medium is the floor once any specially-sensitive data exists; estimate scale + authorized-user count ` +
  `from roles/seed/config. Return the classification table, sensitive types, level, and reasoning.`,
  { label: 'classify', phase: 'Classify', agentType: 'privacy-auditor', schema: CLASSIFY_SCHEMA }
)
log(`security level: ${cls.level} — sensitive: ${(cls.sensitiveTypes || []).join(', ') || 'none'}`)

// ---- Phase 2+3: per-category audit → adversarial verify (pipeline, no barrier) -
const perCategory = await pipeline(
  CATEGORIES,
  (c) => agent(
    `Read-only Israeli-privacy-compliance audit of "${TARGET}".\n` +
    `CATEGORY: ${c.key}.  Determined security level: ${cls.level} (${cls.reasoning}).\n` +
    `Load ${REFDIR}/${c.ref} (and ${REFDIR}/01-amendment-13-overview.md for context).\n` +
    `Hunt: ${c.focus}.\n` +
    `Open and confirm each cited line before reporting. Every finding MUST carry a law anchor ` +
    `(סעיף/תקנה). Severity: critical = clear breach / 15א exposure, risk = gap, nit = minor. ` +
    `If the category does not apply, set notApplicable=true with empty findings.`,
    { label: `audit:${c.key}`, phase: 'Audit', agentType: 'privacy-auditor', schema: FINDINGS_SCHEMA }
  ),
  (res, c) => {
    const findings = (res && res.findings) ? res.findings : []
    if (!findings.length) return []
    return parallel(findings.map((f) => () =>
      parallel([0, 1].map((k) => () =>
        agent(
          `Adversarial review. A prior auditor claims this Israeli-privacy-compliance issue in "${TARGET}":\n` +
          `  category ${c.key} | ${SEV[f.severity]} ${f.file}:${f.line} | עוגן ${f.lawAnchor}\n  "${f.problem}"\n` +
          `Read the cited file/line + surrounding code and the law anchor. Try to REFUTE: is it a real ` +
          `non-compliance, or a false positive (handled elsewhere, not personal data, out-of-scope/infra)? ` +
          `Default refuted=true if not convinced.`,
          { label: `verify:${f.file.split('/').pop()}:${f.line}#${k}`, phase: 'Verify', agentType: 'privacy-auditor', schema: VERDICT_SCHEMA }
        )
      )).then((votes) => {
        const refutes = votes.filter(Boolean).filter(v => v.refuted).length
        return { ...f, category: c.key, survived: refutes < 2 }
      })
    ))
  }
)

// bucket — do NOT silently drop refuted findings; surface them as low-confidence
const allFindings = perCategory.flat().filter(Boolean)
const seen = new Set()
const dedupe = (arr) => arr.filter(f => {
  const key = `${f.file}:${f.line}:${f.problem}`
  if (seen.has(key)) return false
  seen.add(key); return true
})
const deduped = dedupe(allFindings.filter(f => f.survived))
const lowConfidence = dedupe(allFindings.filter(f => !f.survived))
const counts = {
  critical: deduped.filter(f => f.severity === 'critical').length,
  risk: deduped.filter(f => f.severity === 'risk').length,
  nit: deduped.filter(f => f.severity === 'nit').length,
}
log(`verified: ${deduped.length} (🔴${counts.critical} 🟡${counts.risk} 🔵${counts.nit}) · low-confidence: ${lowConfidence.length}`)

// ---- Phase 3.5: completeness critic — what did the audit NOT cover? -----------
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
  `Completeness critic for a static Israeli-privacy-compliance audit of "${TARGET}" (security level ` +
  `${cls.level}). 6 per-category auditors ran (static read/grep only). Confirmed findings (JSON): ` +
  `${JSON.stringify(deduped)}\nIndependently inspect the repo and report BLIND SPOTS likely missed: a ` +
  `data store / table / flow holding personal data that no category opened; personal data leaving to a ` +
  `3rd-party not checked; a data-subject-rights path not traced; cross-file PII flow; any confirmed ` +
  `finding whose claim was not actually proven. Note that signed DPAs, infra network-separation, and ` +
  `org process are out-of-code — list under notScanned. Be concrete (name tables/dirs/files). Do not ` +
  `re-report the findings above.`,
  { label: 'critic', phase: 'Critic', agentType: 'privacy-auditor', schema: CRITIC_SCHEMA }
)
log(`coverage gaps: ${critic.coverageGaps.length} · not-scanned: ${critic.notScanned.length}`)

// ---- Phase 4: write the Hebrew compliance document ----------------------------
phase('Report')
await agent(
  `Write the Israeli privacy-compliance document (Hebrew). Read the template at ${TEMPLATE} and follow ` +
  `its format and its fill rules exactly.\n\n` +
  `Repo: "${TARGET}".  Security level: ${cls.level} — ${cls.reasoning}.\n` +
  `Classification table (JSON): ${JSON.stringify(cls.classificationTable)}\n` +
  `Sensitive types: ${(cls.sensitiveTypes || []).join(', ') || 'none'}\n` +
  `Counts: 🔴 ${counts.critical}  🟡 ${counts.risk}  🔵 ${counts.nit}.\n\n` +
  `VERIFIED FINDINGS (JSON — group by category into the report's per-category sections; each line: ` +
  `"- <emoji> \`file:line\` — <problem>. **סעיף/תקנה:** <lawAnchor>. **תיקון:** <fix>." with ` +
  `🔴=critical 🟡=risk 🔵=nit):\n${JSON.stringify(deduped, null, 2)}\n\n` +
  `LOW-CONFIDENCE FINDINGS (JSON — refuted by the skeptics; render in a clearly-separated appendix ` +
  `"## ממצאים בוודאות נמוכה — דורשים בדיקה אנושית" with a note that these were NOT confirmed and may be ` +
  `false positives, but are surfaced rather than dropped):\n${JSON.stringify(lowConfidence, null, 2)}\n\n` +
  `COVERAGE GAPS (JSON from the completeness critic — render in a section "## פערי כיסוי והמשך" listing ` +
  `what was NOT covered, what is out-of-code/not-scanned, and unverified claims, so the reader knows the ` +
  `document is not exhaustive):\n${JSON.stringify(critic, null, 2)}\n\n` +
  `Build the prioritized action plan table from the findings. Include the legal disclaimer (technical ` +
  `analysis, not legal advice). Use today's date. Write to ` +
  `"${TARGET}/privacy/PRIVACY-COMPLIANCE-AMENDMENT13.md" (create privacy/ if needed). Modify NO audited ` +
  `code — only that one report file. Reply with just the written path and the top-3 findings.`,
  { label: 'report:write', phase: 'Report' }
)

return {
  target: TARGET,
  securityLevel: cls.level,
  counts,
  total: deduped.length,
  lowConfidence: lowConfidence.length,
  coverageGaps: critic.coverageGaps.length,
  report: `${TARGET}/privacy/PRIVACY-COMPLIANCE-AMENDMENT13.md`,
}
