# חומת אש ופורטים — deep dive

קטגוריה: `network`. מי נכנס לשרת ומאיזה פורט. החשיפה הנפוצה ביותר: שירות פנימי (DB/Redis/dashboard)
שפתוח לאינטרנט.

## מה זה
Firewall מחליט אילו חיבורים להכניס. פורט פתוח = דלת. הכלל: רק 22/80/443 פתוחים מבחוץ, כל השאר סגור.
שירות פנימי (Postgres, Redis, MinIO, dashboards) לעולם לא ישירות לעולם.

## פריטי ביקורת + פקודות read-only

### 1. חומת אש פעילה, רק 22/80/443 🔴
- ufw: `sudo ufw status verbose`. מאובטח: `Status: active` + רק 22/80/443 (+OpenSSH). לא active → 🔴.
- firewalld: `sudo firewall-cmd --state` + `sudo firewall-cmd --list-all`.
- nftables/iptables: `sudo nft list ruleset` / `sudo iptables -S` (חפש policy DROP על INPUT + פתיחות מפורשות).
- פורט פתוח שאינו 22/80/443 בלי הצדקה → 🟡/🔴 לפי השירות.

### 2. פורטים מאזינים בפועל (מה *באמת* פתוח) 🔴
- `sudo ss -tlnp` (או `sudo netstat -tlnp`). זו האמת — מה מאזין ועל איזה interface.
- מאובטח: שירותים פנימיים מאזינים על `127.0.0.1:PORT`. מסוכן: `0.0.0.0:PORT` / `*:PORT` / `[::]:PORT`
  על DB/Redis/dashboard → 🔴 (חשוף).
- צולב מול ה-firewall: פורט שמאזין על 0.0.0.0 אבל חסום ב-firewall = 🟡 (תלוי-firewall, לא הגנת-עומק).

### 3. DB / Redis לא חשופים 🔴
- חפש בפלט `ss` את 5432 (Postgres), 3306 (MySQL), 6379 (Redis), 27017 (Mongo), 9200 (Elastic),
  9000/9001 (MinIO). אם על 0.0.0.0 → 🔴.
- Docker: `docker ps --format '{{.Names}}\t{{.Ports}}'` — מיפוי `0.0.0.0:5432->5432` = פורט DB פומבי → 🔴.
  מאובטח: `127.0.0.1:5432->5432` או בלי מיפוי החוצה כלל.

### 4. שירותים פנימיים — מי צריך ומאיפה 🟡
- כל פורט מאזין נוסף: שאל "מי ניגש אליו ומאיפה". dashboard/admin/metrics ללא הזדהות שפתוח → 🔴.
- העדפה: VPN / nginx עם הזדהות מול חשיפת פורט ישירה.

## חוק ברזל
> פותחים רק 22 / 80 / 443. כל השאר סגור מבחוץ. שירות פנימי? שואלים מי צריך + מאיפה. לא פותחים פורט רק
> כי "זה פתר את התקלה".

## דוגמאות פלט
```text
🔴 [network] `sudo ss -tlnp` → "0.0.0.0:5432 postgres" — Postgres מאזין על כל ה-interfaces, חשוף לאינטרנט. תיקון: bind 127.0.0.1, או הסר מיפוי הפורט ב-compose.
🔴 [network] `sudo ufw status` → "Status: inactive" — אין חומת אש פעילה, כל הפורטים המאזינים חשופים. תיקון: ufw default deny + allow 22/80/443 + enable.
🟡 [network] `docker ps` → "0.0.0.0:6379->6379 redis" — Redis ממופה החוצה. תיקון: 127.0.0.1:6379 או expose בלבד.
🔵 [network] פורט 8080 פתוח ב-ufw — לאמת שעדיין בשימוש; אם לא, לסגור.
```
