# עדכוני מערכת — deep dive

קטגוריה: `updates`. שרת לא מעודכן = יעד קל. הרבה פריצות קורות דרך חולשות *ידועות* שכבר יש להן תיקון.

## מה זה
עדכונים מתקנים באגים וחולשות אבטחה. צריך לעדכן OS, Docker images, nginx ו-dependencies — בלי להשאיר
גרסאות ישנות ללא סיבה, ובלי לעדכן production עיוורת בלי גיבוי.

## פריטי ביקורת + פקודות read-only

### 1. עדכוני אבטחה ממתינים 🔴/🟡
- Debian/Ubuntu: `apt list --upgradable 2>/dev/null` (קריאה בלבד; אל תריץ `apt upgrade`).
  ספציפית אבטחה: `apt list --upgradable 2>/dev/null | grep -i security` או `sudo unattended-upgrade --dry-run -d 2>/dev/null | tail`.
- RHEL/Fedora: `dnf check-update --security 2>/dev/null` / `yum check-update`.
- הרבה עדכוני אבטחה ממתינים → 🔴. עדכונים רגילים ממתינים → 🟡.

### 2. עדכונים אוטומטיים (unattended-upgrades) 🟡
- `systemctl is-enabled unattended-upgrades 2>/dev/null` או `apt-config dump APT::Periodic::Unattended-Upgrade 2>/dev/null`.
- RHEL: `systemctl is-enabled dnf-automatic.timer 2>/dev/null`.
- לא מופעל → 🟡 (אין תיקון אוטומטי לחולשות ידועות).

### 3. גרסת OS נתמכת 🟡
- `cat /etc/os-release` + `uname -r`. דיסטרו End-of-Life (בלי עדכוני אבטחה) → 🔴.

### 4. Docker images — גרסאות מפורשות, לא latest 🟡
- `docker images --format '{{.Repository}}:{{.Tag}}'` — שימוש ב-`latest` על תשתית (postgres/redis/nginx) → 🟡
  (לא יודעים מה רץ; קשה לשחזר; עדכון לא צפוי). מאובטח: `postgres:15`, לא `postgres:latest`.
- images ישנים מאוד: `docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedSince}}'`.

### 5. אין עדכון production עיוור בלי גיבוי 🔵
- עיקרון תהליכי (לא נבדק טכנית): לפני עדכון production — גיבוי. לציין כהמלצה.

## חוק ברזל
> מעדכנים OS, Docker images, Nginx, dependencies. לא גרסאות ישנות ללא סיבה. לא מעדכנים production עיוורת
> בלי גיבוי.

## דוגמאות פלט
```text
🔴 [updates] `apt list --upgradable | grep security` → 14 חבילות אבטחה — חולשות ידועות לא מתוקנות. תיקון: apt upgrade (אחרי גיבוי) + הפעלת unattended-upgrades.
🟡 [updates] `systemctl is-enabled unattended-upgrades` → "not-found" — אין עדכוני אבטחה אוטומטיים. תיקון: התקנת unattended-upgrades.
🟡 [updates] `docker images` → "postgres:latest" — תשתית על תג latest, גרסה לא ידועה/לא יציבה. תיקון: נעילת גרסה מפורשת (postgres:15).
🔴 [updates] `os-release` → Ubuntu 18.04 (EOL) — דיסטרו ללא עדכוני אבטחה. תיקון: שדרוג ל-LTS נתמך.
```
