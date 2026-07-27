export const meta = {
  name: 'infra-audit-max',
  description: 'Deterministic domain-2 infra-security audit: one read-only infra-auditor per category, adversarial verify, completeness critic, then write the gap report',
  whenToUse: 'Thorough/token-heavy alternative to /infra-audit. Fans out one infra-auditor per category (network/TLS/containers/secrets), refutes each finding, runs a completeness critic, surfaces low-confidence findings, writes INFRA-SECURITY-FINDINGS.md. Pass the target path as args.',
  phases: [
    { title: 'Audit', detail: 'one read-only infra-auditor per category, in parallel' },
    { title: 'Verify', detail: 'adversarial refute of each finding (2 skeptics)' },
    { title: 'Critic', detail: 'completeness critic — what did the audit NOT cover' },
    { title: 'Report', detail: 'render confirmed + low-confidence + coverage gaps into the report' },
  ],
}

const TARGET = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && args.path) ? args.path : '.'
const REFDIR = '~/.claude/skills/infra-security-review/references'
const TEMPLATE = '~/.claude/skills/infra-security-review/assets/infra-findings-template.md'

const CATEGORIES = [
  { key: 'network-exposure',   ref: '02-network-and-ports.md',     focus: 'published Docker ports on 0.0.0.0 for data-stores/internal services (Postgres/MySQL/Redis/Mongo/Elastic/MinIO/metrics/admin/queue dashboards); nginx location blocks exposing /metrics //admin/dashboards; published ports vs the repo port-map file (e.g. PORT_MAP.md) if present' },
  { key: 'tls-headers',        ref: '03-tls-and-headers.md',       focus: 'no HTTP->HTTPS redirect; missing HSTS/CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy; ssl_protocols TLSv1/1.1; weak ciphers; server_tokens on' },
  { key: 'container-hardening',ref: '04-containers-and-images.md', focus: 'no USER (runs root); floating base image (latest/untagged); secret COPY/ENV baked into image; missing .dockerignore; privileged:true / network_mode:host / docker.sock mount / broad cap_add; no resource limits' },
  { key: 'secrets-config',     ref: '05-secrets-and-ci.md',        focus: 'committed .env*/keys with live values; plaintext secret in compose environment:; hard-coded token in CI workflow; pull_request_target running untrusted code with secrets; over-broad GITHUB_TOKEN; no CI secret-scan; backups with PII committed/served' },
]

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    notApplicable: { type: 'boolean' },
    findings: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        severity: { type: 'string', enum: ['critical', 'risk', 'nit'] },
        file: { type: 'string', description: 'config file path' },
        directive: { type: 'string', description: 'the directive/line, e.g. ports "5432:5432"' },
        problem: { type: 'string', description: 'the symptom + ROOT CAUSE (the misconfig/directive that creates it) + impact — so a reader understands what causes it' },
        ref: { type: 'string', description: 'reference file + section, e.g. "02-network-and-ports.md §published-ports"' },
        fix: { type: 'string', description: 'short; or "could not find a fix — needs human decision (why: …)"' },
      },
      required: ['severity', 'file', 'directive', 'problem', 'ref', 'fix'],
    } },
  },
  required: ['findings', 'notApplicable'],
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted', 'reason'],
}
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
const SEV = { critical: '🔴', risk: '🟡', nit: '🔵' }

log(`infra-audit-max on ${TARGET} — ${CATEGORIES.length} categories`)

const perCategory = await pipeline(
  CATEGORIES,
  (c) => agent(
    `Read-only domain-2 infrastructure-security audit of "${TARGET}".\n` +
    `CATEGORY: ${c.key}. Load ${REFDIR}/${c.ref} (and ${REFDIR}/01-infra-overview.md).\n` +
    `Hunt: ${c.focus}.\nLocate the config files (docker-compose*.yml, Dockerfile*, nginx/**.conf, ` +
    `.github/workflows/*.yml, .env*, .dockerignore). Open and confirm each directive before reporting. ` +
    `Anchor every finding to the file + directive. Severity: critical = internet-reachable exposure or ` +
    `committed live secret, risk = missing hardening, nit = minor. If the category's config does not ` +
    `exist, set notApplicable=true.`,
    { label: `audit:${c.key}`, phase: 'Audit', agentType: 'infra-auditor', schema: FINDINGS_SCHEMA }
  ),
  (res, c) => {
    const findings = (res && res.findings) ? res.findings : []
    if (!findings.length) return []
    return parallel(findings.map((f) => () =>
      parallel([0, 1].map((k) => () =>
        agent(
          `Adversarial review. A prior auditor claims this infra-security issue in "${TARGET}":\n` +
          `  ${c.key} | ${SEV[f.severity]} ${f.file}: ${f.directive}\n  "${f.problem}"\n` +
          `Read the cited config and surrounding files. Try to REFUTE: is it a real exposure/misconfig, ` +
          `or a false positive (bound to localhost, behind another guard, dev-only file, not actually ` +
          `internet-facing)? Default refuted=true if not convinced.`,
          { label: `verify:${(f.file||'').split('/').pop()}#${k}`, phase: 'Verify', agentType: 'infra-auditor', schema: VERDICT_SCHEMA }
        )
      )).then((votes) => {
        const refutes = votes.filter(Boolean).filter(v => v.refuted).length
        return { ...f, category: c.key, survived: refutes < 2 }
      })
    ))
  }
)

const allFindings = perCategory.flat().filter(Boolean)
const seen = new Set()
const dedupe = (arr) => arr.filter(f => {
  const key = `${f.file}:${f.directive}:${f.problem}`
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

phase('Critic')
const critic = await agent(
  `Completeness critic for a static infra-security audit of "${TARGET}". 4 per-category auditors ran ` +
  `(config read only). Confirmed findings (JSON): ${JSON.stringify(deduped)}\nIndependently inspect the ` +
  `repo's infra config and report BLIND SPOTS: a compose service / Dockerfile / nginx vhost / CI workflow ` +
  `not examined, a published port not cross-checked vs the repo port-map (if any), any confirmed finding whose ` +
  `reachability is config-only (not runtime-confirmed). Note cloud IAM / firewall / physical network as ` +
  `notScanned (out of scope → runtime-verify confirms live reachability). Be concrete (name files).`,
  { label: 'critic', phase: 'Critic', agentType: 'infra-auditor', schema: CRITIC_SCHEMA }
)
log(`coverage gaps: ${critic.coverageGaps.length} · not-scanned: ${critic.notScanned.length}`)

phase('Report')
await agent(
  `Write the infrastructure-security gap report. Read the template at ${TEMPLATE} and follow its format ` +
  `and FORMAT RULES exactly.\n\nRepo audited: "${TARGET}". Verify pass: adversarial refute (2 skeptics ` +
  `per finding). Note that reachability is config-level — confirm live with runtime-verify.\n\n` +
  `Counts: 🔴 ${counts.critical}  🟡 ${counts.risk}  🔵 ${counts.nit}.\n\n` +
  `VERIFIED FINDINGS (JSON — group by category; each line: "- <emoji> \`file: directive\` — <problem>. ` +
  `**Why:** <ref>. **Fix:** <fix>." with 🔴=critical 🟡=risk 🔵=nit; keep the ref on every line):\n${JSON.stringify(deduped, null, 2)}\n\n` +
  `LOW-CONFIDENCE FINDINGS (JSON — refuted; render in "## Low-confidence / needs human review", noted ` +
  `as unconfirmed, surfaced not dropped):\n${JSON.stringify(lowConfidence, null, 2)}\n\n` +
  `COVERAGE GAPS (JSON from the critic — render in "## Coverage gaps & follow-ups"; include the pointers ` +
  `to /secure-audit, /agent-harden-audit, runtime-verify):\n${JSON.stringify(critic, null, 2)}\n\n` +
  `Use today's date. Write to "${TARGET}/security/INFRA-SECURITY-FINDINGS.md" (create security/ if ` +
  `needed). Modify NO config — only that one report file. Reply with just the written path and top-3.`,
  { label: 'report:write', phase: 'Report' }
)

return {
  target: TARGET,
  counts,
  total: deduped.length,
  lowConfidence: lowConfidence.length,
  coverageGaps: critic.coverageGaps.length,
  report: `${TARGET}/security/INFRA-SECURITY-FINDINGS.md`,
}
