# גישה ו-SSH — deep dive

קטגוריה: `access`. גישה מרחוק מאובטחת לשרת + ניהול משתמשים. הדלת הראשית — אם היא חלשה, כל השאר לא משנה.

## מה זה
SSH = הגישה המרוחקת לשרת. רוב הפריצות מתחילות ב-brute-force על SSH עם סיסמאות, או ב-root login פתוח.
המודל המאובטח: משתמש רגיל (לא root) + מפתח SSH (לא סיסמה) + fail2ban נגד ניסיונות.

## פריטי ביקורת (audit items) + פקודות read-only

### 1. אימות מפתח בלבד — בלי סיסמאות 🔴
- בדוק את התצורה האפקטיבית (לא רק את הקובץ): `sudo sshd -T | grep -Ei 'passwordauthentication|permitrootlogin|pubkeyauthentication|challengeresponseauthentication|usepam'`
- מאובטח: `passwordauthentication no` · `pubkeyauthentication yes`. אם `passwordauthentication yes` → 🔴 (חשוף ל-brute-force).

### 2. PermitRootLogin no 🔴
- מתוך אותו `sudo sshd -T`: `permitrootlogin no` (או `prohibit-password` = מקובל). `yes` → 🔴.
- מי מחובר/יכול כ-root: `getent passwd | awk -F: '$3==0{print $1}'` (יותר ממשתמש אחד עם uid 0 → 🟡).

### 3. fail2ban פעיל נגד brute-force 🟡
- `sudo systemctl is-enabled fail2ban` + `sudo fail2ban-client status` + `sudo fail2ban-client status sshd`.
- לא מותקן / לא enabled → 🟡. בדוק שיש jail ל-sshd.

### 4. לא עובדים קבוע כ-root 🟡
- משתמשי login קיימים: `getent passwd | awk -F: '$7 ~ /(bash|sh|zsh)$/ {print $1":"$3}'`.
- בעלי sudo: `getent group sudo wheel 2>/dev/null`. ודא שקיים משתמש deploy רגיל, לא רק root.

### 5. הגבלת SSH לפי IP / פורט (אם רלוונטי) 🔵
- פורט SSH: מתוך `sudo sshd -T | grep -i '^port'`. פורט 22 פתוח לעולם זה תקין אם יש fail2ban+keys.
- מפתחות מורשים: `sudo find /home /root -maxdepth 3 -name authorized_keys -printf '%p %m\n' 2>/dev/null` —
  הרשאה רחבה מ-600 על authorized_keys → 🟡; מספר מפתחות לא מוכרים → לציין לבדיקה.
- ניסיונות כניסה כושלים אחרונים: `sudo lastb 2>/dev/null | head -20` (סימן ל-brute-force פעיל).

## חוק ברזל
> משתמש רגיל, לא root. מפתח SSH במקום סיסמה. `PasswordAuthentication no`, `PermitRootLogin no`,
> Fail2ban נגד ניסיונות כניסה.

## דוגמאות פלט (findings)
```text
🔴 [access] `sudo sshd -T` → "passwordauthentication yes" — אימות סיסמה פעיל ב-SSH, חשוף ל-brute-force. תיקון: PasswordAuthentication no + מפתחות בלבד.
🔴 [access] `sudo sshd -T` → "permitrootlogin yes" — כניסת root ישירה מאופשרת. תיקון: PermitRootLogin no/prohibit-password.
🟡 [access] `systemctl is-enabled fail2ban` → "not-found" — אין הגנת brute-force על SSH. תיקון: התקנת fail2ban + jail ל-sshd.
🟡 [access] `getent passwd` → רק root עם shell — אין משתמש עבודה רגיל. תיקון: צור משתמש deploy ב-sudo.
```
