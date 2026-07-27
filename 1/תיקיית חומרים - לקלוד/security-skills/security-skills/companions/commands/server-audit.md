---
name: server-audit
description: Audit a live server's hardening state over SSH (read-only); writes a Hebrew Markdown gap report
argument-hint: "<ssh-target> [output-dir]"
allowed-tools: Read, Grep, Glob, Bash, Task, Skill, Write
---

# /server-audit

ביקורת **read-only של שרת חי** דרך SSH. בודק גישה/SSH, חומת אש ופורטים, קצה (nginx/HTTPS/Cloudflare),
סודות/.env/git/הרשאות, עדכונים, גיבויים, לוגים+ניטור, ומוכנות לאירוע; כותב **דוח פערים אחד בעברית**.
מריץ רק פקודות לא-משנות; **השרת לעולם לא משתנה** — רק הדוח נכתב.

## קלט
`$ARGUMENTS` = יעד SSH (`user@host` או alias מ-`~/.ssh/config`) + ספריית-פלט אופציונלית. ריק → לבקש יעד.

## שלבים (לפי skill server-hardening-review)
1. **הפעל את ה-skill `server-hardening-review`** (כלי Skill) למתודולוגיה + הבסיס.
2. **אשר עם המשתמש לפני חיבור לשרת אמיתי.** `TARGET = $ARGUMENTS`. טען `references/01-overview.md`.
3. **זהה stack** תחילה: `ssh TARGET 'cat /etc/os-release'` + איזה firewall/pkg-mgr/init קיים.
4. **הפעל `server-hardening-auditor` במקביל, אחד לכל קטגוריה** (הודעה אחת, 8 קריאות Task):
   `access`, `network`, `edge`, `secrets`, `updates`, `backups`, `observability`, `incident`.
   העבר לכל אחד: TARGET, הקטגוריה, קובץ ה-reference שלו (02–09), ופורמט השורה (עיגון לפקודה→פלט).
5. **אחד + הסר כפילויות**; מיין לפי חומרה. **בדוק כל 🔴** מול הפלט הגולמי של הפקודה.
6. **ציין פערי כיסוי** בדוח: קונפיג ב-repo → `/infra-audit`; קוד → `/secure-audit`; פרטיות → `/privacy-audit`;
   נגישות HTTP חיה → `runtime-confirm`; חומת אש של הענן/security-groups/פיזי → מחוץ לטווח. לא אומת → "בוודאות נמוכה".
7. **כתוב** `<output-dir>/security/SERVER-HARDENING-FINDINGS.md` (ברירת מחדל cwd) מתוך
   `assets/server-findings-template.md`, **בעברית**.

## פלט (למשתמש)
- נתיב הדוח · סיכום (🔴/🟡/🔵) · top-3 · הערה שכיסוי תלוי בהרשאות SSH ובכלים על השרת.

## כללים
- read-only על השרת החי. רק פקודות מ-allowlist ב-reference 01. `sudo` רק לקריאה. רק קובץ הדוח נכתב.
- עיגון ממצאים לפקודה + פלט. לכל סוד דלוף — המלצת **החלפה (rotate)**, לא רק מחיקה. אין פקודות מומצאות.
