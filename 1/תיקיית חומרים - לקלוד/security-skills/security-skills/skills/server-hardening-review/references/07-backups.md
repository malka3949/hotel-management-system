# גיבויים — deep dive

קטגוריה: `backups`. היכולת לחזור אחורה אחרי מחיקה, פריצה, תקלת עדכון, נפילת שרת או השחתת DB.
גיבוי שלא ניסית לשחזר — הוא לא גיבוי, הוא תקווה.

## מה זה
מגבים DB, uploads, docker-compose.yml, nginx, ו-.env (מאובטח). גיבוי טוב = אוטומטי + מחוץ-לשרת + מוצפן +
כמה גרסאות + נבדק שחזור + גישה מוגבלת.

## פריטי ביקורת + פקודות read-only
הערה: גיבויים לרוב לא סטנדרטיים — חפש עדויות, ואם אין → זה ממצא בפני עצמו.

### 1. בכלל קיים גיבוי 🔴
- חפש סקריפטים/ספריות גיבוי: `sudo ls -la /opt/backup* /var/backups /home/*/backup* 2>/dev/null`,
  `sudo find / -maxdepth 4 \( -name '*.sql.gz' -o -name '*backup*' -o -name '*.dump' \) -printf '%p %m %TY-%Tm-%Td\n' 2>/dev/null | head`.
- אין שום עדות לגיבוי → 🔴 (בלי גיבוי — אין production).

### 2. גיבוי אוטומטי (מתוזמן) 🟡
- cron: `crontab -l 2>/dev/null` + `sudo ls /etc/cron.d/ /etc/cron.daily/ 2>/dev/null` + `sudo cat` לחיפוש pg_dump/mysqldump/rsync/restic/borg.
- systemd timers: `systemctl list-timers --all 2>/dev/null | grep -iE 'backup|dump|restic|borg'`.
- כלי גיבוי: `which restic borg duplicity 2>/dev/null`. אין תזמון → 🟡 (גיבוי ידני נשכח).

### 3. גיבוי מחוץ לשרת (offsite) 🟡
- בדוק יעד: בסקריפטים — rsync/scp/aws s3/rclone ליעד חיצוני. גיבוי רק על אותו דיסק → 🟡 (נפילת שרת = אובדן הכל).

### 4. תאריך גיבוי אחרון + מספר גרסאות 🟡
- מהפלט של חיפוש הגיבויים: התאריך האחרון. גיבוי בן חודשים → 🟡. גרסה אחת בלבד → 🟡.

### 5. הצפנה + גישה מוגבלת לגיבויים 🟡
- הרשאות תיקיית גיבוי: world-readable → 🔴 (גיבוי DB מכיל הכל). restic/borg = מוצפן מובנה; גיבוי plain `.sql` לא מוצפן עם נתונים רגישים → 🟡.

## חוק ברזל
> גיבוי אוטומטי, גיבוי מחוץ לשרת, הצפנת גיבויים רגישים, כמה גרסאות אחורה, **בדיקת שחזור**, הגבלת גישה.
> גיבוי שלא ניסית לשחזר — הוא לא גיבוי, הוא תקווה.

## דוגמאות פלט
```text
🔴 [backups] `find *backup*` ריק + אין cron לגיבוי — אין שום מנגנון גיבוי, אובדן מוחלט בכל תקלה. תיקון: pg_dump מתוזמן + יעד offsite.
🟡 [backups] `crontab -l` יש pg_dump אך היעד מקומי בלבד — אין offsite, נפילת דיסק = אובדן הגיבוי. תיקון: העתקה ל-S3/rclone.
🟡 [backups] `ls /opt/backups` → גיבוי אחרון לפני 3 חודשים — לא מתוזמן/לא רץ. תיקון: timer יומי + ניטור הצלחה.
🔴 [backups] `ls -la /opt/backups` → 755, מכיל dump.sql — גיבוי DB קריא לכל. תיקון: chmod 700 + הצפנה.
```
