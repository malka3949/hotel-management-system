export const meta = {
  name: 'runtime-confirm',
  description: 'Actively confirm static security findings against a running instance (DAST-lite): extract confirmable findings from a report, probe each with non-destructive HTTP, write a confirmation report. Side-effecting — local/staging only, never production.',
  whenToUse: 'After /secure-audit or /infra-audit, to turn static "exposed" findings into runtime-confirmed facts with HTTP evidence. args: { report: "<path>", baseUrl: "http://127.0.0.1:PORT" } (or "<report> <baseUrl>"). baseUrl MUST be local/staging.',
  phases: [
    { title: 'Extract', detail: 'read the report, pick runtime-confirmable findings' },
    { title: 'Probe', detail: 'one runtime-verifier per finding — non-destructive HTTP' },
    { title: 'Report', detail: 'write RUNTIME-CONFIRMATION.md with verdict + evidence' },
  ],
}

// ---- args -------------------------------------------------------------------
let REPORT, BASEURL
if (typeof args === 'string') { const p = args.trim().split(/\s+/); REPORT = p[0]; BASEURL = p[1] }
else if (args && typeof args === 'object') { REPORT = args.report; BASEURL = args.baseUrl }
const REFS = '~/.claude/skills/runtime-verify/references/runtime-checks.md'
if (!REPORT) { log('ERROR: no report path given (args: { report, baseUrl })'); return { error: 'no report' } }
if (!BASEURL) { log('ERROR: no baseUrl given — refusing to boot a stack unattended. Pass a local/staging baseUrl.'); return { error: 'no baseUrl' } }
// crude prod guard — the agent re-checks too
if (/\b(prod|production)\b/i.test(BASEURL)) { log(`REFUSED: baseUrl "${BASEURL}" looks like production`); return { error: 'refused: production-like baseUrl' } }
const REPORT_DIR = REPORT.replace(/\/[^/]*$/, '') || '.'

const EXTRACT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    confirmable: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        type: { type: 'string', description: 'unauth-endpoint | missing-header | http-no-redirect | error-leak | idor | rate-limit | open-cors | banner' },
        method: { type: 'string' },
        path: { type: 'string', description: 'request path or header to check' },
        severity: { type: 'string', enum: ['critical', 'risk', 'nit'] },
        source: { type: 'string', description: 'the original file:line/directive from the report' },
        problem: { type: 'string' },
      },
      required: ['type', 'method', 'path', 'severity', 'source', 'problem'],
    } },
    sourceOnly: { type: 'array', items: { type: 'string' }, description: 'findings with no black-box probe (kept static)' },
  },
  required: ['confirmable', 'sourceOnly'],
}
const PROBE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'not-reproduced', 'inconclusive', 'not-applicable'] },
    status: { type: 'string' },
    evidence: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['verdict', 'status', 'evidence', 'note'],
}

log(`runtime-confirm: report=${REPORT} baseUrl=${BASEURL}`)

// ---- Extract -----------------------------------------------------------------
phase('Extract')
const extracted = await agent(
  `Read the security findings report at "${REPORT}" and the probe guide at ${REFS}. ` +
  `Extract the RUNTIME-CONFIRMABLE findings (unauth endpoint, missing security header, http-not-redirected, ` +
  `verbose error leak, IDOR, missing rate-limit, open CORS, server banner) — for each, give the request ` +
  `method + path (or header to check), severity, the original file:line/directive as "source", and the ` +
  `problem. Put source-only findings (hard-coded secret, plaintext token in DB, mass-assignment, fail-open ` +
  `catch, committed secret) into sourceOnly — they have no black-box probe.`,
  { label: 'extract', phase: 'Extract', agentType: 'runtime-verifier', schema: EXTRACT_SCHEMA }
)
log(`confirmable: ${extracted.confirmable.length} · source-only: ${extracted.sourceOnly.length}`)

// ---- Probe (parallel, low volume) -------------------------------------------
phase('Probe')
const probed = await parallel(extracted.confirmable.map((f) => () =>
  agent(
    `Probe ONE finding against the running instance at baseUrl "${BASEURL}" (must be local/staging — if it ` +
    `looks like production, refuse and return inconclusive). Read ${REFS} for the safe probe of this type.\n` +
    `Finding: type=${f.type} method=${f.method} path=${f.path} — "${f.problem}" (source: ${f.source}).\n` +
    `Send a few non-destructive ${f.method || 'GET'}/HEAD/OPTIONS probes only (no destructive verbs, no ` +
    `fuzzing, -m 10). Return the verdict with HTTP status + a short evidence snippet.`,
    { label: `probe:${f.type}:${(f.path||'').slice(0, 24)}`, phase: 'Probe', agentType: 'runtime-verifier', schema: PROBE_SCHEMA }
  ).then((v) => ({ ...f, ...v }))
))
const results = probed.filter(Boolean)
const tally = {
  confirmed: results.filter(r => r.verdict === 'confirmed').length,
  notReproduced: results.filter(r => r.verdict === 'not-reproduced').length,
  inconclusive: results.filter(r => r.verdict === 'inconclusive').length,
}
log(`confirmed: ${tally.confirmed} · not-reproduced: ${tally.notReproduced} · inconclusive: ${tally.inconclusive}`)

// ---- Report ------------------------------------------------------------------
phase('Report')
await agent(
  `Write a runtime-confirmation report (Markdown) to "${REPORT_DIR}/RUNTIME-CONFIRMATION.md".\n` +
  `Source report: "${REPORT}". Target: "${BASEURL}" (local/staging). Date: today.\n` +
  `Header note: this confirms static findings at runtime via non-destructive probes; it is NOT a full ` +
  `DAST. Counts: confirmed ${tally.confirmed}, not-reproduced ${tally.notReproduced}, inconclusive ` +
  `${tally.inconclusive}, source-only ${extracted.sourceOnly.length}.\n\n` +
  `RESULTS (JSON) — render as a table: Finding (source) | Type | Verdict | HTTP | Evidence. Put ✅ ` +
  `confirmed first (fix these first), then ⚠️ not-reproduced (recheck — likely false positives in the ` +
  `static report), then inconclusive:\n${JSON.stringify(results, null, 2)}\n\n` +
  `SOURCE-ONLY (no runtime probe — remain static findings): ${JSON.stringify(extracted.sourceOnly)}\n\n` +
  `Write only that one file. Reply with the path + the confirmed count.`,
  { label: 'report:write', phase: 'Report' }
)

return { report: `${REPORT_DIR}/RUNTIME-CONFIRMATION.md`, baseUrl: BASEURL, tally, sourceOnly: extracted.sourceOnly.length }
