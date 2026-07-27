# סודות, Git והרשאות קבצים — deep dive

קטגוריה: `secrets`. איפה הסודות חיים על השרת, מי יכול לקרוא אותם, והאם דלפו ל-git. דליפת API key = כמו
סיסמה לחשבון בנק עסקי.

## מה זה
`.env` מחזיק סודות (DB_PASSWORD, API_KEY, JWT_SECRET). הסכנות: `.env` שעלה ל-git (נשאר בהיסטוריה גם אחרי
מחיקה), הרשאות קובץ רחבות מדי, מפתחות/dumps נגישים.

## פריטי ביקורת + פקודות read-only

### 1. הרשאות `.env` וקבצי סוד 🔴
- מצא: `sudo find /home /opt /srv /var/www -maxdepth 4 -name '.env' -printf '%p %m %u:%g\n' 2>/dev/null`.
- מאובטח: מצב 600 (או 640), בעלים = משתמש האפליקציה. world-readable (`*4` / 644 / 777) → 🔴.
- מפתחות פרטיים: `sudo find / -maxdepth 5 \( -name 'id_rsa' -o -name '*.pem' -o -name '*.key' \) -printf '%p %m\n' 2>/dev/null | head` — הרשאה רחבה מ-600 → 🔴.

### 2. `.env` לא ב-git + .gitignore 🔴
- בכל repo (`sudo find /home /opt /srv -maxdepth 4 -name '.git' -type d 2>/dev/null` → הספריות):
  בתוך כל repo: `git -C <repo> ls-files | grep -E '(^|/)\.env$'` — אם `.env` tracked → 🔴.
- `git -C <repo> check-ignore .env` (אמור להחזיר `.env` = מתעלם). אין `.env` ב-.gitignore → 🟡.
- קיים `.env.example` בלי סודות אמיתיים = תקין; ערכים אמיתיים ב-`.env.example` → 🔴.

### 3. סודות בהיסטוריית git 🔴
- `git -C <repo> log --all --oneline -- .env` — אם `.env` הופיע אי-פעם → 🔴 (הסוד בהיסטוריה; **להחליף**, לא רק למחוק).
- חיפוש דפוסים: `git -C <repo> log -p --all -S 'PASSWORD' -- . 2>/dev/null | head` (זהירות בנפח; דגימה).

### 4. אין dumps / קבצים רגישים נגישים 🟡
- `sudo find /home /opt /srv /var/www -maxdepth 4 \( -name '*.sql' -o -name '*.dump' -o -name '*.bak' \) -printf '%p %m\n' 2>/dev/null` — dump עם נתונים בהרשאה רחבה → 🟡/🔴.

### 5. אין chmod 777 קבוע 🟡
- `sudo find /home /opt /srv /var/www -maxdepth 4 -perm -0002 -type f -printf '%p %m\n' 2>/dev/null | head` —
  קבצים world-writable → 🟡 (777 כ"פתרון" קבוע). העיקרון: ההרשאה המינימלית שצריך.

## חוקי ברזל
> `.env` ל-`.gitignore`, עובדים עם `.env.example` בלי סודות. מחיקה מהקוד לא מספיקה — את ה-secret מחליפים.
> נותנים את ההרשאה המינימלית שצריך — לא יותר.

## דוגמאות פלט
```text
🔴 [secrets] `find .env` → "/opt/app/.env 644" — קובץ סודות קריא לכל משתמש בשרת. תיקון: chmod 600 + בעלים = משתמש האפליקציה.
🔴 [secrets] `git log -- .env` → קומיט קיים — סודות בהיסטוריית git, נשארים גם אחרי מחיקה. תיקון: להחליף (rotate) את כל הסודות, לא רק למחוק את הקובץ.
🟡 [secrets] `git check-ignore .env` → ריק — .env לא ב-.gitignore, סיכון להעלאה. תיקון: הוסף .env ל-.gitignore.
🟡 [secrets] `find -perm -0002` → app.conf world-writable — הרשאות רחבות מדי. תיקון: chmod o-w.
```
