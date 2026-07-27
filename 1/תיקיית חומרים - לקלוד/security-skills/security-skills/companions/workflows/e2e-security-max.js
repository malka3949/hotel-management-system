export const meta = {
  name: 'e2e-security-max',
  description: 'End-to-end behavioral security test for ANY web app: drive the running target through generic attack vuln-classes via browser-mcp, verify each from the capture DB and (dual-db) the app database, run a completeness critic, write the findings report. Target-agnostic (profile-driven + auto-discovery). Side-effecting — local/staging/seed only, never production.',
  whenToUse: 'After bringing up the target + browser-mcp (see e2e-security/references/bring-up.md), to behaviorally confirm vulns by driving the real UI of any app. args: { baseUrl, profile?, assert: "capture-only"|"dual-db", dbUrl?, target? }. baseUrl MUST be local/staging.',
  phases: [
    { title: 'Preflight', detail: 'refuse prod; build/confirm profile; verify browser-mcp + (dual-db) DB' },
    { title: 'DriveAssert', detail: 'one e2e-pentester per generic vuln-class — discover + drive + assert' },
    { title: 'Critic', detail: 'completeness — which roles/flows/vuln-classes were NOT exercised' },
    { title: 'Report', detail: 'write E2E-SECURITY-FINDINGS.md (confirmed + inconclusive + coverage gaps)' },
  ],
}

// ---- args (target-agnostic) -------------------------------------------------
const A = (args && typeof args === 'object') ? args : {}
const BASEURL = A.baseUrl
const PROFILE = A.profile || null        // path or inline object; missing fields are auto-discovered
const ASSERT = A.assert === 'dual-db' ? 'dual-db' : 'capture-only'
const DBURL = A.dbUrl || (PROFILE && typeof PROFILE === 'object' ? PROFILE.dbUrl : '') || ''
const TARGET = A.target || '.'
const REFDIR = '~/.claude/skills/e2e-security/references'
const TEMPLATE = '~/.claude/skills/e2e-security/assets/e2e-findings-template.md'
const PROFILE_STR = PROFILE ? (typeof PROFILE === 'string' ? `profile file: ${PROFILE}` : `profile (inline): ${JSON.stringify(PROFILE)}`) : 'no profile supplied — AUTO-DISCOVER from baseUrl (OpenAPI/crawl/snapshot/DB-introspection)'

if (!BASEURL) { log('ERROR: no baseUrl (args: { baseUrl, profile?, assert, dbUrl?, target? })'); return { error: 'no baseUrl' } }
if (/\b(prod|production)\b/i.test(BASEURL)) { log(`REFUSED: baseUrl "${BASEURL}" looks like production`); return { error: 'refused: production-like baseUrl' } }
if (ASSERT === 'dual-db' && !DBURL) { log('ERROR: dual-db requested but no dbUrl (arg or profile)'); return { error: 'dual-db needs dbUrl' } }

// ---- generic vuln-classes (see references/playbooks.md) — NO app-specific paths
const SCENARIOS = [
  { key: 'unauth-exposure',  roles: 'none',         write: false, property: 'sensitive endpoints require authentication',
    drive: 'no login (fresh session); discover sensitive paths (profile.hints.sensitivePaths, or file-serving/metrics/admin/docs/backups routes via OpenAPI+crawl) and request each with no auth' },
  { key: 'idor',             roles: 'userA,userB',  write: false, property: 'a user reads only their own objects',
    drive: 'login userA; discover a resource userA owns + its id; obtain a userB-owned id; as userA request userB\'s object (fetch/navigate)' },
  { key: 'broken-func-authz',roles: 'userA',        write: true,  property: 'a low-priv user cannot perform admin functions',
    drive: 'login userA (low-priv); discover an admin-only action (OpenAPI roles / admin UI route); call it as userA' },
  { key: 'token-exposure',   roles: 'userA',        write: false, property: 'no token in URL; auth cookie HttpOnly+Secure+SameSite; no raw token in localStorage',
    drive: 'login; network_list post-login requests; cookies_list; localStorage_list' },
  { key: 'sensitive-in-resp',roles: 'userA',        write: false, property: 'responses expose only the caller\'s data, masked; no others\' PII / secret fields',
    drive: 'login userA; load own profile + the data/list endpoints the UI calls; network_search response bodies' },
  { key: 'mass-assignment',  roles: 'userA',        write: true,  property: 'privileged fields are not client-settable',
    drive: 'discover the self-update endpoint + privileged fields (profile.hints or schema); fetch PATCH/PUT it with a privileged field escalated (role/isAdmin/balance/owner)' },
  { key: 'rate-limit',       roles: 'none',         write: false, property: 'auth endpoints throttle brute force',
    drive: 'discover the login endpoint; ~12 rapid wrong-password attempts (bounded, low volume)' },
  { key: 'error-leak',       roles: 'any',          write: false, property: 'errors do not leak internals',
    drive: 'send a malformed request (bad JSON / wrong type / bad id) to a discovered API route' },
  { key: 'data-deletion',    roles: 'admin',        write: true,  property: 'a deletion request actually removes/anonymizes the personal data (not just a soft flag)',
    drive: 'login admin; discover the delete/anonymize action for a person record; perform it on a THROWAWAY record' },
]

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['vulnerable-confirmed', 'safe', 'inconclusive'] },
    http: { type: 'string' }, capture: { type: 'string' }, db: { type: 'string' },
    property: { type: 'string' }, note: { type: 'string' },
  },
  required: ['verdict', 'http', 'capture', 'db', 'property', 'note'],
}
const PREFLIGHT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { ok: { type: 'boolean' }, mcpConnected: { type: 'boolean' }, baseReachable: { type: 'boolean' }, dbReachable: { type: 'boolean' }, accountsFound: { type: 'integer' }, reason: { type: 'string' } },
  required: ['ok', 'mcpConnected', 'baseReachable', 'reason'],
}
const CRITIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    notExercised: { type: 'array', items: { type: 'string' } },
    missingClasses: { type: 'array', items: { type: 'string' } },
    residual: { type: 'array', items: { type: 'string' } },
  },
  required: ['notExercised', 'missingClasses', 'residual'],
}

log(`e2e-security-max: baseUrl=${BASEURL} assert=${ASSERT} (${PROFILE ? 'profile given' : 'auto-discover'})`)

// ---- Preflight (build/confirm profile + checks) ------------------------------
phase('Preflight')
const pf = await agent(
  `Preflight for a generic e2e security run. Load ${REFDIR}/target-profile.md + ${REFDIR}/bring-up.md.\n` +
  `Target baseUrl "${BASEURL}". ${PROFILE_STR}.\n` +
  `Verify: (1) baseUrl is NOT production and is reachable; (2) browser-mcp tools (mcp__browser-mcp__*) are ` +
  `available — if absent, ok=false with the bring-up instruction; (3) a way to authenticate exists and ` +
  `report how many accounts/roles are available (≥2 same-role for IDOR); ` +
  (ASSERT === 'dual-db' ? `(4) the app DB connects: psql "${DBURL}" -c 'select 1'.\n` : `(dual-db not requested.)\n`) +
  `Do NOT drive any scenario. ok=true only if the required checks pass.`,
  { label: 'preflight', phase: 'Preflight', agentType: 'e2e-pentester', schema: PREFLIGHT_SCHEMA }
)
if (!pf.ok) { log(`PREFLIGHT FAILED: ${pf.reason}`); return { error: 'preflight failed', reason: pf.reason, mcpConnected: pf.mcpConnected } }

// ---- DriveAssert (one pentester per generic vuln-class) ---------------------
phase('DriveAssert')
const results = await parallel(SCENARIOS.map((s) => () =>
  agent(
    `Run ONE generic e2e security vuln-class against the running app at baseUrl "${BASEURL}". ` +
    `Assert mode: ${ASSERT}${ASSERT === 'dual-db' ? ` (app DB: "${DBURL}", read-only SELECTs; discover the schema first)` : ''}.\n` +
    `${PROFILE_STR}.\n` +
    `Load ${REFDIR}/target-profile.md + ${REFDIR}/playbooks.md + ${REFDIR}/assertions.md + ${REFDIR}/bring-up.md.\n` +
    `VULN-CLASS ${s.key} — roles ${s.roles}, ${s.write ? 'WRITE (throwaway record; reset via profile.reset)' : 'read-only'}.\n` +
    `Property: ${s.property}.\nApproach: ${s.drive}.\n` +
    `DISCOVER the concrete endpoint/resource (do not assume any app-specific path). Use a fresh browser-mcp ` +
    `session, profile accounts only, bounded volume, never production. ` +
    (s.write && ASSERT !== 'dual-db'
      ? `Write-effect class in capture-only mode → return inconclusive unless the response itself proves the outcome.\n`
      : ``) +
    `Return the verdict with positive evidence (no evidence → inconclusive); in note, say which endpoint you discovered.`,
    { label: `e2e:${s.key}`, phase: 'DriveAssert', agentType: 'e2e-pentester', schema: VERDICT_SCHEMA }
  ).then((v) => ({ scenario: s.key, roles: s.roles, ...v }))
))
const verdicts = results.filter(Boolean)
const tally = {
  vulnerable: verdicts.filter(v => v.verdict === 'vulnerable-confirmed').length,
  safe: verdicts.filter(v => v.verdict === 'safe').length,
  inconclusive: verdicts.filter(v => v.verdict === 'inconclusive').length,
}
log(`🔴 ${tally.vulnerable} · ✅ ${tally.safe} · ❔ ${tally.inconclusive}`)

// ---- Critic ------------------------------------------------------------------
phase('Critic')
const critic = await agent(
  `Completeness critic for a generic e2e behavioral security run on "${BASEURL}". Vuln-classes run: ` +
  `${SCENARIOS.map(s => s.key).join(', ')}. Verdicts (JSON): ${JSON.stringify(verdicts)}.\n` +
  `List: roles/flows NOT exercised (given the discovered app surface); vuln-classes not in the playbook ` +
  `(CSRF, SSRF, stored-XSS, upload-type-bypass, open-redirect, CORS-reflection); residual human-only blind ` +
  `spots (business-logic correctness, multi-step races, threat-model gaps). Be concrete to THIS target.`,
  { label: 'critic', phase: 'Critic', agentType: 'e2e-pentester', schema: CRITIC_SCHEMA }
)

// ---- Report ------------------------------------------------------------------
phase('Report')
await agent(
  `Write the e2e behavioral security report. Read the template at ${TEMPLATE} and follow its format/rules.\n` +
  `Target: "${BASEURL}" (local/staging). Assert mode: ${ASSERT}. Date: today.\n` +
  `Tally: 🔴 ${tally.vulnerable} vulnerable-confirmed, ✅ ${tally.safe} safe, ❔ ${tally.inconclusive} inconclusive.\n\n` +
  `RESULTS (JSON — one section per vuln-class: verdict + property + http + capture snippet + db + note, ` +
  `where note includes the discovered endpoint and any mapping to a static finding):\n${JSON.stringify(verdicts, null, 2)}\n\n` +
  `COVERAGE GAPS (JSON from the critic — render in "## Coverage gaps & follow-ups"; feeds /security-ledger):\n` +
  `${JSON.stringify(critic, null, 2)}\n\n` +
  `Write to "${TARGET}/security/E2E-SECURITY-FINDINGS.md" (create security/ if needed). Reply with the path ` +
  `+ the confirmed-vulnerable list.`,
  { label: 'report:write', phase: 'Report' }
)

return { target: TARGET, baseUrl: BASEURL, assert: ASSERT, tally, report: `${TARGET}/security/E2E-SECURITY-FINDINGS.md` }
