# Security Skills — מדריך הסוויטה

סוויטת ביקורת אבטחה רב-מודאלית. כל מערכת = **skill (מוח) · subagent פרמטרי · command (רזה) · `*-max`
workflow (דטרמיניסטי + אימות אדוורסרי + completeness-critic + low-confidence bucket)**. הפלט תמיד דוח
Markdown; כל המערכות read-only חוץ מ-runtime/e2e שמסומנות במפורש כ-side-effecting.

## 8 המודאליות — זוויות בלתי-תלויות על אותו יעד
```text
# מודאליות        Command              מה זה בודק
1 static-code      /secure-audit        קוד מול 16 עקרונות (authn/IDOR/input/secrets/errors/defaults…)
2 dependencies     (בתוך /secure-audit) npm/pip/osv audit · lockfile · install-hooks · typosquat
3 infra-config     /infra-audit         דומיין 2: nginx/פורטים/TLS/containers/secrets-CI (קונפיג ב-repo)
4 agent-config     /agent-harden-audit  תצורת סוכן-הקוד עצמו (.claude/, 8 שכבות)
5 privacy-law      /privacy-audit       תיקון 13 / תקנות 2017 / הנחיית AI (מסמך עברי)
6 runtime-probe    /runtime-confirm     curl ממוקד מאשר ממצא סטטי בזמן-ריצה (DAST-lite)
7 e2e-behavioral   /e2e-security        מנהיג את האפליקציה האמיתית + capture + אימות (כולל ה-DB)
8 server-state     /server-audit        SSH read-only לשרת חי: ufw/sshd/ss/fail2ban/עדכונים/גיבויים/ניטור (מצגת אבטחת-שרת, עברית)
+ /security-ledger  מרכיב COVERAGE-LEDGER.md — איזו מודאליות רצה + פנקס-העיוורון השיורי
```
> **על "אפס עיוורון":** בלתי-אפשרי לאנליזה. הסוויטה מסירה את העיוורון ה*מכניזבילי* על פני 8 מודאליות,
> ו**`/security-ledger` הופך את השיורי למפורש ומתועד** (לא נסתר). הרשימה המלאה: `_suite/references/blind-spots.md`.

```text
skills/
├── secure-code-review/      (1+2) קוד + תלויות · references 01–12 · appsec-auditor + dependency-auditor
├── infra-security-review/   (3)   תשתית (קונפיג ב-repo) · references 01–05 · infra-auditor
├── server-hardening-review/ (8)   שרת חי דרך SSH (read-only) · references 01–09 · server-hardening-auditor
├── agent-hardening-review/  (4)   תצורת הסוכן · 06-agent-hardening · agent-config-auditor
├── e2e-security/            (7)   e2e התנהגותי · playbooks/bring-up/assertions · e2e-pentester (side-effecting)
├── runtime-verify/          (6)   אישור runtime · runtime-verifier (side-effecting)
├── _suite/                        blind-spots.md + coverage-ledger-template (ל-/security-ledger)
└── README.md
# privacy: ~/.claude/skills/israel-privacy-compliance (5)
```
קבצים פעילים מחוץ ל-`skills/`: `~/.claude/agents/*-auditor|pentester.md` · `~/.claude/commands/*.md` ·
`~/.claude/workflows/*-max.js` + `runtime-confirm.js` · `~/.claude/skills/` symlinks.

---

## מה כל תהליך עושה

### Flow A — ביקורת קוד (`/secure-audit [path]`)
1. מזהה את ה-stack (NestJS / Express / Flask / …) ואת מיקום ה-routes/models/uploads.
2. טוען את `references/02-software-principles.md` — האינדקס של 16 העקרונות, כל אחד עם **audit check**
   (הדבר הקונקרטי שמחפשים בקוד).
3. מפעיל את הסוכן `appsec-auditor` **במקביל, אחד לכל דומיין**:
   `authn-authz` · `input-files` · `data-secrets-sessions` · `errors-defaults`.
   כל סוכן read-only (`Read,Grep,Glob,Bash`), טוען את ה-deep-dive של הדומיין שלו, ומחזיר ממצאים בלבד.
4. מאחד + מסיר כפילויות, ממיין לפי חומרה.
5. מריץ את **`/security-review` המובנה** כשלב verify אחרון וממזג ממצאים נוספים.
6. בודק כל 🔴 מול השורות בפועל לפני שמדווח עליו (false 🔴 הורס אמון בכל הדוח).
7. כותב `<path>/security/SOFTWARE-SECURITY-FINDINGS.md`.

### Flow B — ביקורת הקשחת הסוכן (`/agent-harden-audit [path]`)
מפעיל את `agent-config-auditor` (read-only) שסורק את `.claude/` של ה-repo מול **8 שכבות הקשחה**
(CLAUDE.md · permissions.deny · PreToolUse hook · sandbox · reviewer subagent · CI · MCP · secrets),
וכותב `<path>/security/AGENT-HARDENING-FINDINGS.md`. רק 4 שכבות (3,4,5,6) באמת *אוכפות*; השאר
התנהגותיות. בקרות חסרות מדווחות כ-finding — **לא** נוצרות אוטומטית.

---

## skill מול workflow — ההבדל המהותי

שתי הדרכים מפעילות את **אותם סוכנים** (`appsec-auditor`). ההבדל הוא ב**מי שולט בזרימה**:

| | **Skill + Command** (`/secure-audit`) | **Workflow** (`secure-audit-max.js`) |
|---|---|---|
| מי מנהל את הזרימה | המודל (אני) קורא הוראות בטקסט ומחליט | סקריפט JS דטרמיניסטי |
| ה-fan-out | **מונחה** — "תפעיל 4 סוכנים" כהוראה | **מובטח** — `pipeline()` תמיד מריץ N |
| גרנולריות | 4 סוכנים לפי דומיין | 11 סוכנים, אחד לכל עיקרון |
| אימות ממצאים | spot-check + `/security-review` | **2 ספקנים אדוורסריים** לכל ממצא (נשמר אם <2 הפריכו) |
| חזרתיות | יכול להשתנות בין הרצות (זה prompt) | זהה בכל הרצה (same script+args) |
| עלות טוקנים | נמוכה | גבוהה |
| `/security-review` | ✅ רץ כ-verify | ❌ לא זמין בתוך workflow → מאמת אדוורסרית במקום |
| מתי | ברירת מחדל, בדיקה מהירה | ביקורת יסודית, "מי שיכול לבזבז טוקנים" |
| הפעלה | הקלד `/secure-audit /path` | `Workflow({name:"secure-audit-max", args:"/path"})` |

**הכלל:** Skill = מומחיות + שיקול-דעת גמיש, מודל-מונחה. Workflow = אורקסטרציה דטרמיניסטית של אותם
הסוכנים — כשצריך *להבטיח* שכל שלב קורה, באותו סדר, בכל פעם.

> נקודה חשובה: **גרנולריות = כמה instances של הסוכן הפרמטרי מפעילים, לא כמה קבצי-סוכן יש.**
> `appsec-auditor` מקבל `focus` — אותו קובץ אחד נפרס 4 פעמים (skill) או 11 פעמים (workflow).

---

## הרכיבים — מי כל אחד

| רכיב | מה זה | מתי בוחרים בו |
|---|---|---|
| **Skill** | חבילת ידע + מתודולוגיה שנטענת on-demand לפי `description` | ידע/נוהל שחוזר; הבסיס לשתי המערכות |
| **Subagent** | context מבודד עם כלים מוגבלים (כאן: read-only) | עבודה שצריך לבודד ולהבטיח שלא תיגע בקוד |
| **Command** | טריגר `/` מפורש עם `$ARGUMENTS` | "תריץ עכשיו על הנתיב הזה" |
| **Workflow** | סקריפט שמתזמר סוכנים דטרמיניסטית | fan-out מובטח, אימות אדוורסרי, scale |

---

## הפעלה מהירה

```bash
# ביקורת קוד — מסלול רזה (ברירת מחדל)
/secure-audit <path-to-repo>

# ביקורת הקשחת הסוכן
/agent-harden-audit <path-to-repo>

# ביקורת קוד — מסלול מקסימום, דטרמיניסטי (יקר, opt-in)
Workflow({ name: "secure-audit-max", args: "<path-to-repo>" })
```

הפלט תמיד תחת `<path>/security/`. הקוד שנבדק לעולם לא משתנה.

לפרטים על כל מערכת בנפרד: `secure-code-review/README.md` · `agent-hardening-review/README.md`.
