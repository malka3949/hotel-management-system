export const meta = {
  name: 'server-audit-max',
  description: 'Deterministic read-only live-server hardening audit: one server-hardening-auditor per category over SSH, adversarial verify, completeness critic, then write the Hebrew gap report',
  whenToUse: 'Thorough/token-heavy alternative to /server-audit. Fans out one read-only server-hardening-auditor per category (access/network/edge/secrets/updates/backups/observability/incident) over SSH, refutes each finding, runs a completeness critic, surfaces low-confidence findings, writes SERVER-HARDENING-FINDINGS.md (Hebrew). Pass the SSH target as args (user@host); optional {target, outDir}.',
  phases: [
    { title: 'Audit', detail: 'one read-only server-hardening-auditor per category, in parallel, over SSH' },
    { title: 'Verify', detail: 'adversarial refute of each finding (2 skeptics)' },
    { title: 'Critic', detail: 'completeness critic — what state the audit did NOT inspect' },
    { title: 'Report', detail: 'render confirmed + low-confidence + coverage gaps into the Hebrew report' },
  ],
}

const TARGET = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && args.target) ? args.target : null
const OUTDIR = (args && args.outDir) ? args.outDir : '.'
if (!TARGET) throw new Error('server-audit-max: missing SSH target (args = "user@host" or {target})')

const REFDIR = '~/.claude/skills/server-hardening-review/references'
const TEMPLATE = '~/.claude/skills/server-hardening-review/assets/server-findings-template.md'

const CATEGORIES = [
  { key: 'access',        ref: '02-access-ssh.md',          focus: 'SSH effective config (sudo sshd -T): PasswordAuthentication yes / PermitRootLogin yes; missing fail2ban; only root has a login shell; authorized_keys perms; recent failed logins (lastb)' },
  { key: 'network',       ref: '03-network-firewall.md',    focus: 'firewall inactive (ufw status / firewall-cmd / nft); listening sockets on 0.0.0.0 (ss -tlnp) for DB/Redis/Mongo/Elastic/MinIO/dashboards; docker ps port maps 0.0.0.0:DBPORT; ports beyond 22/80/443' },
  { key: 'edge',          ref: '04-edge-nginx-tls.md',      focus: 'no HTTP->HTTPS redirect; expired/near-expiry TLS cert (openssl x509 -dates); no renewal timer; missing security headers/HSTS, ssl_protocols TLSv1/1.1, server_tokens on; open default site; no dotfile (.env/.git) deny' },
  { key: 'secrets',       ref: '05-secrets-git-perms.md',   focus: '.env world-readable / wrong owner; private keys/dumps with loose perms; .env tracked in git / in git history (rotate, not delete); .env missing from .gitignore; world-writable files (chmod 777)' },
  { key: 'updates',       ref: '06-updates.md',             focus: 'pending security updates (apt list --upgradable / dnf check-update --security); unattended-upgrades / dnf-automatic not enabled; EOL distro (os-release); docker images on :latest for infra' },
  { key: 'backups',       ref: '07-backups.md',             focus: 'no backup mechanism at all (search scripts/cron/restic/borg); not scheduled; no offsite copy; last backup stale; backup dir world-readable / unencrypted dump' },
  { key: 'observability', ref: '08-logs-monitoring.md',     focus: 'no log retention/rotation; secrets in /var/log; unreviewed failed-login bursts; no monitoring tool present; monitoring dashboard (grafana/netdata) listening on 0.0.0.0 without auth' },
  { key: 'incident',      ref: '09-incident-readiness.md',  focus: 'unknown login users / duplicate uid 0; unknown containers/services; suspicious cron (curl|sh, base64) / persistence; recently changed system files; no log retention => no forensics; no runbook' },
]

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    notApplicable: { type: 'boolean' },
    findings: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        severity: { type: 'string', enum: ['critical', 'risk', 'nit'] },
        command: { type: 'string', description: 'the read-only command run, e.g. "sudo ss -tlnp"' },
        evidence: { type: 'string', description: 'the relevant line(s) of command output that prove the finding' },
        problem: { type: 'string', description: 'symptom + ROOT CAUSE (the live-state misconfig) + impact, in Hebrew' },
        ref: { type: 'string', description: 'reference file + section, e.g. "03-network-firewall.md §2"' },
        fix: { type: 'string', description: 'short recommended command/action (Hebrew); or "לא נמצא תיקון — דרושה החלטת אדם (סיבה: …)"' },
      },
      required: ['severity', 'command', 'evidence', 'problem', 'ref', 'fix'],
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

log(`server-audit-max on ${TARGET} — ${CATEGORIES.length} categories (read-only over SSH)`)

const perCategory = await pipeline(
  CATEGORIES,
  (c) => agent(
    `ביקורת read-only של מצב שרת חי ב-"${TARGET}" דרך SSH.\n` +
    `CATEGORY: ${c.key}. טען ${REFDIR}/${c.ref} (וגם ${REFDIR}/01-overview.md).\n` +
    `חפש: ${c.focus}.\n` +
    `הרץ אך ורק פקודות read-only מה-allowlist ב-01-overview.md, דרך ssh ${TARGET} '<read-cmd>' ` +
    `(sudo רק לפעלי קריאה). זהה תחילה את ה-stack (cat /etc/os-release; איזה firewall/pkg-mgr/init). ` +
    `עגן כל ממצא ל-command + evidence (פלט הפקודה בפועל) לפני דיווח. אל תריץ שום פקודה משנה. ` +
    `חומרה: critical = חשיפה לאינטרנט בפועל / סוד דלוף / root-login / תעודה פגה, risk = הקשחה חסרה, ` +
    `nit = מינורי. כלי חסר/sudo נדחה → אל תקבע PASS; דווח כלא-אומת. אם הקטגוריה לא רלוונטית כלל → notApplicable=true.`,
    { label: `audit:${c.key}`, phase: 'Audit', agentType: 'server-hardening-auditor', schema: FINDINGS_SCHEMA }
  ),
  (res, c) => {
    const findings = (res && res.findings) ? res.findings : []
    if (!findings.length) return []
    return parallel(findings.map((f) => () =>
      parallel([0, 1].map((k) => () =>
        agent(
          `סקירה אדוורסרית. auditor קודם טוען על השרת "${TARGET}" את בעיית האבטחה הזו:\n` +
          `  ${c.key} | ${SEV[f.severity]} ${f.command} → ${f.evidence}\n  "${f.problem}"\n` +
          `הרץ מחדש (read-only) את אותה פקודה / פקודה משלימה ונסה להפריך: האם זו חשיפה/הקשחה-חסרה אמיתית, ` +
          `או false positive (מאזין על 127.0.0.1 ולא 0.0.0.0, חסום ע"י firewall, כלי dev בלבד, sudo נדחה ` +
          `ולכן לא נצפה)? ברירת מחדל refuted=true אם לא השתכנעת. read-only בלבד, אל תשנה דבר.`,
          { label: `verify:${c.key}#${k}`, phase: 'Verify', agentType: 'server-hardening-auditor', schema: VERDICT_SCHEMA }
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
  const key = `${f.category}:${f.command}:${f.problem}`
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
  `Completeness critic לביקורת מצב-שרת-חי read-only של "${TARGET}". רצו 8 auditors לפי קטגוריה (קריאה בלבד ` +
  `דרך SSH). ממצאים מאומתים (JSON): ${JSON.stringify(deduped)}\n` +
  `הסתכל עצמאית (read-only) ודווח BLIND SPOTS: קטגוריה/בדיקה שלא הורצה כי כלי חסר או sudo נדחה; ממצא שתלוי ` +
  `ב-firewall ולא אומת חשיפה ישירה; שירות מאזין שלא נבדק. ציין כ-notScanned: חומת אש של ספק הענן / ` +
  `security-groups / רשת פיזית / נגישות HTTP חיה (→ runtime-confirm) / קונפיג ב-repo (→ /infra-audit). היה קונקרטי.`,
  { label: 'critic', phase: 'Critic', agentType: 'server-hardening-auditor', schema: CRITIC_SCHEMA }
)
log(`coverage gaps: ${critic.coverageGaps.length} · not-scanned: ${critic.notScanned.length}`)

phase('Report')
await agent(
  `כתוב את דוח פערי הקשחת-השרת **בעברית**. קרא את התבנית ב-${TEMPLATE} ועקוב אחר הפורמט ו-FORMAT RULES בדיוק.\n\n` +
  `שרת שנבדק: "${TARGET}". מעבר אימות: הפרכה אדוורסרית (2 ספקנים לכל ממצא). ביקורת מצב-חי בלבד — ` +
  `נגישות HTTP חיה מאשרים עם runtime-confirm, קונפיג ב-repo עם /infra-audit.\n\n` +
  `ספירות: 🔴 ${counts.critical}  🟡 ${counts.risk}  🔵 ${counts.nit}.\n\n` +
  `ממצאים מאומתים (JSON — קבץ לפי קטגוריה; כל שורה: "- <emoji> \`command → evidence\` — <בעיה>. ` +
  `**חוק:** <ref>. **תיקון:** <fix>." עם 🔴=critical 🟡=risk 🔵=nit; שמור את ה-ref בכל שורה):\n${JSON.stringify(deduped, null, 2)}\n\n` +
  `ממצאים בוודאות נמוכה (JSON — הופרכו; הצג בסעיף "## ממצאים בוודאות נמוכה / לבדיקת אדם" כלא-מאומת, ` +
  `מוצג ולא נמחק):\n${JSON.stringify(lowConfidence, null, 2)}\n\n` +
  `פערי כיסוי (JSON מה-critic — הצג ב-"## פערי כיסוי והמשך"; כלול את המצביעים ל-/infra-audit, /secure-audit, ` +
  `runtime-confirm, ומה שדרש sudo/כלי-חסר):\n${JSON.stringify(critic, null, 2)}\n\n` +
  `השתמש בתאריך של היום. כתוב ל-"${OUTDIR}/security/SERVER-HARDENING-FINDINGS.md" (צור security/ אם צריך). ` +
  `אל תשנה דבר בשרת — רק קובץ הדוח הזה נכתב. השב רק עם הנתיב שנכתב ו-top-3.`,
  { label: 'report:write', phase: 'Report' }
)

return {
  target: TARGET,
  counts,
  total: deduped.length,
  lowConfidence: lowConfidence.length,
  coverageGaps: critic.coverageGaps.length,
  report: `${OUTDIR}/security/SERVER-HARDENING-FINDINGS.md`,
}
