# לוגים וניטור — deep dive

קטגוריה: `observability`. לוגים = מצלמות האבטחה של השרת. ניטור = מערכת האזעקה. בלי שניהם — עיוורון.

## מה זה
לוגים = תיעוד של מה שקרה (מי התחבר, איזו שגיאה, איזה IP ניסה). ניטור = לדעת בזמן אמת שמשהו נשבר (שרת נפל,
דיסק מתמלא, CPU/RAM גבוה, SSL פג, container נפל, הרבה ניסיונות SSH).

## פריטי ביקורת + פקודות read-only

### לוגים

#### 1. לוגים קיימים ונשמרים מספיק זמן 🟡
- `sudo ls -la /var/log/ | head -30` (nginx, auth.log/secure, syslog). journald: `journalctl --disk-usage`.
- שמירה: `grep -E 'SystemMaxUse|MaxRetentionSec' /etc/systemd/journald.conf` / `sudo ls /etc/logrotate.d/`.
- אין rotation / שמירה קצרה מדי → 🟡 (אין מספיק היסטוריה לחקירת אירוע).

#### 2. אין סודות/tokens בלוגים 🟡
- דגימה: `sudo grep -riE 'password=|token=|api[_-]?key|authorization: bearer' /var/log/ 2>/dev/null | head` —
  סודות בלוגים → 🟡/🔴 (הלוג הופך לנקודת דליפה).

#### 3. ניסיונות כניסה חריגים נבדקים 🟡
- `sudo grep -i 'failed password' /var/log/auth.log 2>/dev/null | tail -20` / `sudo journalctl -u ssh --no-pager | grep -i fail | tail`.
- `sudo lastb 2>/dev/null | head`. הרבה ניסיונות מ-IP בודד = brute-force פעיל → לדווח + לבדוק fail2ban (ref 02).

### ניטור

#### 4. קיים ניטור בכלל 🟡
- חפש כלים: `docker ps --format '{{.Image}}' | grep -iE 'uptime-kuma|netdata|grafana|prometheus|node-exporter'`,
  `systemctl list-units --type=service 2>/dev/null | grep -iE 'netdata|prometheus|node_exporter'`.
- בסיס מינימלי: uptime, דיסק (`df -h`), CPU/RAM (`free -h`,`uptime`), תוקף SSL. אין שום ניטור → 🟡.

#### 5. dashboard ניטור לא חשוף בלי הזדהות 🔴
- אם רץ Grafana/Netdata/Prometheus: צולב מול `ss -tlnp` (ref 03) — מאזין על 0.0.0.0 בלי auth → 🔴.
- מאובטח: מאחורי VPN / basic-auth / IP allowlist / 127.0.0.1. אין secrets בכלי ניטור ללא צורך.

## חוקי ברזל
> לא שומרים סיסמאות/tokens בלוגים. לא מתעלמים משגיאות חוזרות. בודקים ניסיונות כניסה חריגים. לא חושפים
> dashboard ניטור בלי login. לא מספיק לבדוק ידנית פעם בשבוע.

## דוגמאות פלט
```text
🔴 [observability] `ss -tlnp` → "0.0.0.0:3000 grafana" בלי auth — dashboard ניטור חשוף לאינטרנט. תיקון: 127.0.0.1 + nginx basic-auth/VPN.
🟡 [observability] אין uptime-kuma/netdata/prometheus — אין ניטור, נופלים בלי לדעת. תיקון: Uptime Kuma + התראות דיסק/SSL.
🟡 [observability] `grep token= /var/log` → מופעים — סודות נכתבים ללוג. תיקון: סינון סודות בלוגינג.
🟡 [observability] `auth.log` → מאות failed password מ-IP בודד — brute-force פעיל. תיקון: ודא fail2ban (ref 02) + חסימת IP.
```
