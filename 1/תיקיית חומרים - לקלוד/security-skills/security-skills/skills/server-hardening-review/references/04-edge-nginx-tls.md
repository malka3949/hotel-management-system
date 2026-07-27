# חשיפה לאינטרנט — nginx, HTTPS, Cloudflare — deep dive

קטגוריה: `edge`. הקצה הפומבי: איך בקשות מהאינטרנט מגיעות לשירות. nginx = הכניסה המסודרת; HTTPS = הצפנה;
Cloudflare = שכבת DNS/proxy.

## מה זה
nginx מקבל בקשות מבחוץ ומעביר פנימה — המשתמש נכנס לדומיין, לא לפורט. HTTPS מצפין את התקשורת. בלי
HTTPS, סיסמאות/cookies/tokens עוברים בגלוי.

## פריטי ביקורת + פקודות read-only

### 1. HTTPS נאכף + הפניה מ-HTTP 🔴
- קונפיגים: `sudo ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null` ואז `sudo cat <file>`.
- חפש `listen 443 ssl` + בלוק שמפנה `listen 80` → `return 301 https://`. אין הפניה / login על HTTP → 🔴.
- mixed content / `proxy_pass http://` החוצה — לבדוק.

### 2. תוקף תעודה + חידוש אוטומטי 🔴
- תוקף: `echo | openssl s_client -servername DOMAIN -connect DOMAIN:443 2>/dev/null | openssl x509 -noout -dates`
  (או מקומית: `sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/*/fullchain.pem`).
- תעודה פגה / פגה בקרוב → 🔴/🟡. חידוש: `sudo systemctl list-timers | grep -i certbot` או
  `systemctl is-enabled certbot.timer` / `snap`. אין טיימר חידוש → 🟡.

### 3. security headers + הקשחת nginx 🟡
- `sudo grep -RiE 'server_tokens|add_header|client_max_body_size|ssl_protocols' /etc/nginx/`.
- מאובטח: `server_tokens off`, `ssl_protocols TLSv1.2 TLSv1.3` (אין TLSv1/1.1), HSTS
  (`Strict-Transport-Security`), `X-Content-Type-Options`, `X-Frame-Options`/CSP, `client_max_body_size`.
- חוסר → 🟡. `ssl_protocols` עם TLSv1/1.1 → 🟡.

### 4. אין default site פתוח + חסימת קבצים רגישים 🟡
- default site: `sudo ls /etc/nginx/sites-enabled/ | grep -i default` + בדוק אם יש `server` ללא `server_name`.
- חסימת `location ~ /\.` (קבצי dot כמו `.env`, `.git`): `sudo grep -RiE 'location ~ /\\.|\.git|\.env' /etc/nginx/`.
- חוסר חסימה → 🟡.

### 5. Cloudflare (אם בשימוש) 🔵
- אם הדומיין מאחורי Cloudflare: לוודא ש-80/443 מוגבלים ל-Cloudflare IPs (אחרת אפשר לעקוף לפי IP חשוף).
- בדיקה מהשרת מוגבלת; לציין כפער כיסוי אם לא ניתן לאמת. Cloudflare ≠ אבטחת שרת.

## חוקי ברזל
> Nginx = הכניסה המסודרת; משתמשים לא ניגשים ישר ל-containers. HTTPS היום זו דרישת בסיס, לא בונוס.
> Cloudflare לא מחליף אבטחת שרת — IP חשוף = אפשר לעקוף אותו.

## דוגמאות פלט
```text
🔴 [edge] `openssl x509 -dates` → "notAfter expired" — תעודת SSL פגה, הדפדפן חוסם / תקשורת לא מאובטחת. תיקון: certbot renew + טיימר חידוש.
🔴 [edge] nginx `listen 80` ללא return 301 https — login נגיש ב-HTTP לא מוצפן. תיקון: בלוק הפניה 80→443.
🟡 [edge] `grep server_tokens` ריק + אין HSTS — חסרים security headers והקשחה. תיקון: server_tokens off, add_header HSTS/X-Frame-Options, ssl_protocols TLSv1.2/1.3.
🟡 [edge] אין `location ~ /\.` — קבצי .env/.git עלולים להיות מוגשים. תיקון: בלוק deny לקבצי dot.
```
