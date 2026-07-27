# סקירה — ביקורת הקשחת שרת חי (modality: server-state) · טען ראשון

מודאליות חדשה בסוויטה: לא בודקים קונפיג ב-repo (זה `/infra-audit`), אלא את **מצב השרת החי** דרך SSH —
מה *באמת* רץ ופתוח עכשיו: ufw, sshd אפקטיבי, fail2ban, פורטים מאזינים, עדכונים ממתינים, הרשאות קבצים,
גיבויים, ניטור. **read-only מוחלט**: רק פקודות שקוראות מצב, אף פעם לא משנות שרת.

## המודל (אנלוגיית הבניין מהמצגת)
שרת = בניין. **Firewall** = שומר בכניסה · **Nginx** = פקיד קבלה שמנתב פנימה · **Database / .env** = כספת
במרתף · **Logs** = מצלמות אבטחה · **Monitoring** = מערכת אזעקה · **גיבויים** = יכולת לחזור אחורה.
כל ממצא הוא פער מול אחת מ-8 הקטגוריות הללו.

## 8 הקטגוריות (כל אחת = reference + הרצת auditor אחת)
```text
access          02-access-ssh.md           SSH + משתמשים: key-only, no-root, fail2ban, PermitRootLogin/PasswordAuthentication
network         03-network-firewall.md     חומת אש ופורטים: ufw/firewalld, פורטים מאזינים, DB/Redis לא ציבוריים
edge            04-edge-nginx-tls.md        חשיפה לאינטרנט: nginx (HTTPS/headers/default-site/קבצים רגישים), תוקף תעודה, Cloudflare
secrets         05-secrets-git-perms.md     .env (הרשאות + לא ב-git), היסטוריית git, מפתחות/dumps, אין chmod 777
updates         06-updates.md               unattended-upgrades, עדכוני אבטחה ממתינים, גרסאות OS/docker/nginx
backups         07-backups.md               גיבויים: קיימים + אוטומטיים + מחוץ-לשרת + מוצפנים + נבדק שחזור + גישה מוגבלת
observability   08-logs-monitoring.md        לוגים (שמירה, אין סודות, ניסיונות כניסה) + ניטור (קיים, לא ציבורי)
incident        09-incident-readiness.md     מוכנות לאירוע: runbook, יכולת זיהוי (משתמשים/containers/cron/קבצים), שלמות לוגים
```

## חוזה ה-read-only (קריטי — גם כשרק קוראים)
הסוכן מתחבר ל**שרת חי**. כל פקודה חייבת להיות לא-משנה (non-mutating). מותר רק קריאה:

**מותר (allowlist):** `ssh <target> '<read-cmd>'` כאשר ה-cmd הוא רק:
`cat`, `ls`, `stat`, `grep`, `head`, `tail`, `wc`, `find ... -type f` (ללא `-delete`/`-exec`-שמשנה),
`ss -tlnp` / `netstat -tlnp`, `sshd -T`, `ufw status verbose`, `firewall-cmd --list-all`,
`iptables -S` / `nft list ruleset`, `systemctl status|is-enabled|list-unit-files|list-timers`,
`fail2ban-client status`, `apt list --upgradable` / `dnf check-update` / `unattended-upgrade --dry-run`,
`docker ps`, `docker port`, `docker inspect`, `docker images`, `journalctl ... --no-pager` (קריאה בלבד),
`crontab -l`, `lastb`/`last`, `getent`, `id`, `uname`, `cat /etc/os-release`, `lsb_release -a`, `df -h`,
`free -h`, `uptime`, `openssl x509 -noout` (קריאת תעודה), `git log`/`git ls-files`/`git check-ignore`.
`sudo` מותר **רק** עם פעלי קריאה (`sudo ufw status`, `sudo sshd -T`, `sudo cat`, `sudo ls`,
`sudo fail2ban-client status`, `sudo journalctl`).

**אסור לחלוטין (mutating):** `ufw enable/disable/allow/deny`, `apt upgrade/install/remove`,
`dnf/yum install/update`, `systemctl start/stop/restart/enable/disable`, `chmod`, `chown`, `rm`, `mv`,
`kill`/`pkill`, `docker run/stop/rm/exec`, `crontab -e`, כל הפניית פלט (`>`, `>>`), כל pipe-לכתיבה
(`| tee`, `| dd`), `sed -i`, התקנת חבילות, יצירה/מחיקה/עריכה של קבצים על השרת.
אם פעולה לא ברשימת ה-allowlist — **לא מריצים**. תיקונים נכתבים כ**המלצות בדוח** למשתמש.

## זיהוי ה-stack לפני בדיקה (יעד גנרי)
דיסטרוס שונים. תחילה: `cat /etc/os-release`, ואז בחר את הפקודה התואמת —
firewall: `ufw` מול `firewall-cmd` מול `nft/iptables` · packages: `apt` מול `dnf/yum` · init: `systemctl`.
כלי שלא קיים → רשום **"לא נבדק — כלי לא קיים"** (פער כיסוי), לא ניחוש ולא PASS.
צריך `sudo` ואין הרשאה → רשום **"לא ניתן לאמת"** (פער כיסוי), לא PASS.

## חומרה
- 🔴 **חשיפה לאינטרנט בפועל / סוד דלוף**: DB/Redis/dashboard/SSH-password פתוחים לעולם, root login מאופשר,
  תעודה פגה, `.env` world-readable, סוד בהיסטוריית git.
- 🟡 **הקשחה חסרה / ברירת מחדל חלשה**: אין fail2ban, אין unattended-upgrades, אין HSTS, אין גיבוי מחוץ-לשרת,
  אין ניטור, הרשאות רחבות מדי.
- 🔵 **מינורי**: שיפור מומלץ, ניסוח, redundancy.

## עיגון ראיה
כל ממצא מעוגן ל**פקודה + הפלט שלה** (לא לחוק, לא לקובץ-ב-repo). זו ראיית-מצב חיה: הפקודה ששאלה והתשובה
שהתקבלה הן ההוכחה. אם לא הצלחת לאמת — אל תקבע; רשום `❔ לא אומת — לבדוק שוב` + מה צריך כדי לאמת.
