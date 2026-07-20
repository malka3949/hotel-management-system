# מדיניות שמירת נתונים (Data Retention Policy)
**פרויקט:** מערכת ניהול מלון  
**תאריך:** 2026-07-20  
**בסיס חוקי:** חוק הגנת הפרטיות תיקון 13 + תקנות אבטחת מידע תשע"ז

---

## עיקרון

נתוני PII נשמרים רק כל עוד קיים צורך עסקי מוגדר.  
נתונים שפג תוקפם נמחקים/מאונינמים אוטומטית.

---

## טבלת שמירה

| סוג נתון | מיקום | תקופת שמירה | פעולה בפקיעה |
|---|---|---|---|
| נתוני אורח (שם, מייל, טלפון) | `guests` | 7 שנים מיום שהייה אחרונה | anonymize: שם → `[מחוק]`, מייל/טלפון → null |
| הזמנות | `reservations` | 7 שנים (חובה חשבונאית) | שמור — ללא PII אחרי anonymize |
| לוג ביקורת | `audit_logs` | 3 שנים (תקנות אבטחת מידע) | מחיקה מלאה |
| feedback אורח | `guest_feedback` | 2 שנים | comment + aiSummary → null (כבר נעשה ב-softDelete) |
| WebSocket sessions | Redis | TTL 24h (מוגדר ב-Redis) | פקיעה אוטומטית |
| JWT refresh tokens | `refresh_tokens` | 7 ימים (JWT_REFRESH_EXPIRES_IN) | מחיקה אוטומטית ב-cleanup job |
| לוגי שגיאות | Sentry/logs | 90 ימים | מחיקה אוטומטית (Sentry) |

---

## יישום טכני

### Cron job נדרש

קובץ: `backend/src/modules/maintenance/retention.service.ts`  
לוח זמנים: ריצה חודשית ב-1 בחודש בשעה 03:00

```
Guests: WHERE lastCheckout < NOW() - 7 years
  → UPDATE SET fullName='[מחוק]', email=null, phone=null, idNumber=null

AuditLogs: WHERE createdAt < NOW() - 3 years
  → DELETE

GuestFeedback: WHERE createdAt < NOW() - 2 years
  → UPDATE SET comment=null, aiSummary=null
```

**סטטוס:** 🔴 לא מומש — נדרש לפני production עם משתמשים אמיתיים

---

## זכויות נושא מידע (תיקון 13)

| זכות | תגובה נדרשת תוך | מנגנון קיים? |
|---|---|---|
| עיון בנתונים | 30 יום | ❌ — צריך API endpoint |
| תיקון נתונים | 30 יום | ✅ חלקי — דרך staff UI |
| מחיקה ("זכות להישכח") | 30 יום | ✅ — `guests.softDelete` + anonymize |
| ניידות נתונים | 30 יום | ❌ — צריך export endpoint |

---

## פעולות נדרשות

1. 🔴 **לממש** `retention.service.ts` עם cron job חודשי
2. 🟡 **לממש** endpoint לעיון בנתונים (GDPR-style subject access request)
3. 🟡 **לממש** endpoint לייצוא נתונים (data portability)
4. 🟢 **לתעד** מדיניות זו בתנאי השימוש ובמדיניות הפרטיות
