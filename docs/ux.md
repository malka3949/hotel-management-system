# Hotel Management System — UX Document

> מסמך UX מרוכז. מבוסס על `design-system/MASTER.md` + page overrides.
> כל החלטת עיצוב חייבת להיות מתועדת כאן לפני מימוש.

---

## 1. עקרונות מנחים

| עיקרון | יישום |
|---|---|
| **כלי עבודה, לא שיווק** | כל החלטה משרתת מהירות + בהירות + מניעת שגיאות |
| **סטטוס מעל הכל** | סטטוס חדר/הזמנה/תשלום קריא ב-1 שניה |
| **אפס עמימות** | כפתורים אומרים בדיוק מה הם עושים |
| **מניעה > תיקון** | נטרל פעולות לא תקינות במקום להציג שגיאה אחרי |

---

## 2. משתמשים וגישות

| תפקיד | role enum | גישה לדפים | הרשאות |
|---|---|---|---|
| **מנהל רשת (Chain Admin)** | `chain_admin` | כל הדפים + cross-branch + ניהול סניפים/משתמשים | הכל + יצירת סניפים, ניהול משתמשים, דשבורד רשת |
| **מנהל מלון (Hotel Manager)** | `hotel_manager` | כל דפי הסניף + KPI מלא | הכל + ניהול חדרים, אישור החזרות, ניהול עובדי סניף |
| **קבלן (Receptionist)** | `receptionist` | Dashboard, הזמנות, חדרים, אורחים, חשבוניות | צ'ק-אין/אאוט, יצירת הזמנה, עריכה, הוספת חיוב |
| **צוות תפעול (Housekeeping)** | `housekeeping` | חדרים + דף ניקיון בלבד | עדכון סטטוס ניקיון בלבד |

**הערות:**
- `chain_admin`: אין `branch_id` ב-JWT — יכול לצפות בכל הסניפים ולעבור ביניהם
- `hotel_manager` + `receptionist` + `housekeeping`: מוגבלים לסניף שלהם בלבד
- דפי `/admin/*` נגישים ל-`chain_admin` בלבד

---

## 3. ארכיטקטורת מידע

### סדר ניווט בסיידבר

```
1. Dashboard          (/dashboard)            — כולם
2. הזמנות             (/reservations)         — קבלן + מנהל + chain_admin
3. חדרים              (/rooms)                — כולם (הרשאות שונות)
4. אורחים             (/guests)               — קבלן + מנהל
5. ניקיון              (/housekeeping)         — housekeeping + מנהל
6. דוחות              (/reports)              — מנהל + chain_admin
─────────────────────
7. ניהול (Admin)       (/admin)               — chain_admin בלבד
   └── סניפים          (/admin/branches)
   └── משתמשים         (/admin/users)
─────────────────────
8. הגדרות [עתידי]
```

**כלל:** פריטי סיידבר מסוננים לפי תפקיד — `chain_admin` רואה הכל, `housekeeping` רואה חדרים + ניקיון בלבד.

### מפת דפים

| דף | נתיב | גישה | Phase |
|---|---|---|---|
| **Auth** | | | |
| כניסה | `/login` | ציבורי | 1 |
| **Dashboard** | | | |
| לוח בקרה | `/dashboard` | כולם (תוכן שונה) | 10 |
| **הזמנות** | | | |
| רשימת הזמנות | `/reservations` | קבלן + מנהל | 5 |
| הזמנה חדשה | `/reservations/new` | קבלן + מנהל | 5 |
| פרטי הזמנה | `/reservations/[id]` | קבלן + מנהל | 5 |
| לוח שנה | `/reservations/calendar` | קבלן + מנהל | 5 |
| **חדרים** | | | |
| ניהול חדרים | `/rooms` | כולם (הרשאות שונות) | 2 |
| **אורחים** | | | |
| ספריית אורחים | `/guests` | קבלן + מנהל | 3 |
| פרטי אורח | `/guests/[id]` | קבלן + מנהל | 3 |
| אורחים פעילים | `/guests/active` | מנהל | 6 |
| **כניסה/יציאה** | | | |
| פעולות קבלה | `/front-desk` | קבלן + מנהל | 6 |
| **ניקיון** | | | |
| משימות ניקיון | `/housekeeping` | housekeeping + מנהל | 9 |
| **חשבונות ותשלומים** | | | |
| פרטי חשבונית | `/invoices/[id]` | קבלן + מנהל | 7 |
| תשלום בקופה | `/payments/checkout` | קבלן + מנהל | 7 |
| תשלום מקדמה | `/reservations/[id]/pre-payment` | קבלן + מנהל | 7 |
| **דוחות** | | | |
| לוחות מחוונים | `/reports` | מנהל + chain_admin | 10 |
| פיוס תשלומים | `/reports/reconciliation` | מנהל + chain_admin | 7 |
| **ניהול (chain_admin)** | | | |
| ניהול סניפים | `/admin/branches` | chain_admin | 1 |
| ניהול משתמשים | `/admin/users` | chain_admin + מנהל (סניף) | 1 |
| **פורטל אורח (ציבורי)** | | | |
| דף נחיתה | `/portal/[token]` | ציבורי (token) | 8 |
| צ'ק-אין אונליין | `/portal/[token]/check-in` | ציבורי (token) | 8 |
| תשלום אונליין | `/portal/[token]/payment` | ציבורי (token) | 8 |
| אישור | `/portal/[token]/confirmation` | ציבורי (token) | 8 |
| טוקן פג תוקף | `/portal/expired` | ציבורי | 8 |

---

## 4. צבעים ומצבי סטטוס

### פלטת בסיס

| תפקיד | Hex | שימוש |
|---|---|---|
| `primary` `#1E3A8A` | כחול כהה | פעולות ראשיות, nav פעיל, כותרות |
| `primary-light` `#3B82F6` | כחול | hover, כפתורים משניים, לינקים |
| `accent` `#CA8A04` | זהב | כפתור CTA ראשי בלבד |
| `bg-base` `#F8FAFC` | אפור בהיר | רקע דפים |
| `bg-surface` `#FFFFFF` | לבן | קארדים, מודלים, פאנלים |
| `border-default` `#E2E8F0` | גבולות | כל הגבולות |

### צבעי סטטוס (קריטי — בשימוש בכל מקום)

| סטטוס | עברית | צבע | Tailwind |
|---|---|---|---|
| Available | פנוי | `#22C55E` | `bg-green-500` |
| Occupied | תפוס | `#EF4444` | `bg-red-500` |
| Preparing | בהכנה | `#F59E0B` | `bg-amber-500` |
| Reserved | שמור | `#3B82F6` | `bg-blue-500` |
| Checked In | מתגורר | `#6366F1` | `bg-indigo-500` |
| Checked Out | יצא | `#6B7280` | `bg-gray-500` |
| Cancelled | מבוטל | `#F43F5E` | `bg-rose-500` |
| Paid | שולם | `#16A34A` | `bg-green-600` |
| Partial | חלקי | `#D97706` | `bg-amber-600` |
| Unpaid | לא שולם | `#DC2626` | `bg-red-600` |

**כלל:** סטטוס תמיד = נקודה צבעונית + טקסט. אף פעם לא צבע לבד.

```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  פנוי
</span>
```

---

## 5. טיפוגרפיה

**פונט:** `Plus Jakarta Sans` — פונט יחיד לכל הטקסט.

| רמה | גודל | משקל | שימוש |
|---|---|---|---|
| Page Title | 24px / `text-2xl` | 700 | כותרת דף (h1) |
| Section Title | 18px / `text-lg` | 600 | כותרת קארד/סקציה (h2) |
| Label | 14px / `text-sm` | 600 | תוויות טפסים, headers טבלה |
| Body | 14px / `text-sm` | 400 | שורות טבלה, תיאורים |
| Caption | 12px / `text-xs` | 400 | מטאדאטה, timestamps |

> מינימום: 14px לכל תוכן אינטראקטיבי. לא מתחת ל-12px בשום מקום.

---

## 6. לייאאוט ורווחים

### מעטפת האפליקציה

```
┌───────────────────────────────────────────────────┐
│  Sidebar (240px קבוע)  │  אזור תוכן ראשי           │
│                        │  ┌─────────────────────┐  │
│  [לוגו]                │  │ כותרת דף + פעולות   │  │
│  [ניווט]               │  ├─────────────────────┤  │
│  [תפקיד]               │  │ תוכן                │  │
│  [פרטי משתמש]          │  └─────────────────────┘  │
└────────────────────────┴──────────────────────────┘
```

- סיידבר: `w-60` קבוע. במובייל — נסתר עם תפריט המבורגר
- Padding ראשי: `p-6` (desktop), `p-4` (mobile)
- רווח בין סקציות: `gap-6`
- Padding קארד: `p-4` / `p-6` לפי צפיפות תוכן

### Responsive

| Breakpoint | רוחב | התנהגות |
|---|---|---|
| Mobile | < 768px | סיידבר מתמוטט → drawer, טבלאות → קארדים |
| Tablet | 768px–1024px | סיידבר icons בלבד (56px) |
| Desktop | > 1024px | לייאאוט מלא |

---

## 7. קומפוננטות — פטרנים

### כפתורי פעולה

| סוג | סגנון | שימוש |
|---|---|---|
| Primary | `bg-primary text-white` | פעולה ראשית אחת בדף |
| Secondary | `border border-primary text-primary` | פעולות משניות |
| Destructive | `bg-red-600 text-white` | מחיקה, ביטול הזמנה |
| Ghost | `text-primary hover:bg-blue-50` | פעולות שורה בטבלה |

- כפתור primary: disabled + spinner בזמן async
- פעולות הרסניות: תמיד `AlertDialog` אישור לפני
- מקסימום 2 כפתורים primary גלויים בו זמנית בסקציה

### טבלאות נתונים

```
┌──────────────────────────────────────────────────────┐
│ [חיפוש]                      [פילטר ▾] [+ חדש]       │
├────────┬──────────┬──────────┬──────────┬────────────┤
│ עמודה │ עמודה    │ עמודה    │ סטטוס   │ פעולות     │
├────────┼──────────┼──────────┼──────────┼────────────┤
│ נתון  │ נתון     │ נתון     │ [badge]  │ [כפתור][▾] │
└────────┴──────────┴──────────┴──────────┴────────────┘
```

- גובה שורה: `h-12` (48px)
- hover: `hover:bg-slate-50` + `cursor-pointer`
- header: `sticky top-0 bg-white z-10`
- מובייל: `overflow-x-auto`
- ריק: הודעה ידידותית בעברית

### טפסים

- React Hook Form + shadcn `Form`
- ולידציה: ב-`blur` (לא רק ב-submit)
- שגיאות: inline מתחת לשדה, בעברית
- שדות חובה: `*` אחרי תווית
- Date picker: shadcn `Calendar` + `Popover`
- Select: shadcn `Select` (לא `<select>` נייטיב)

### מודלים

- `Dialog` — לכל אינטראקציה מודלית
- `AlertDialog` — לאישור פעולות הרסניות
- `max-w-md` — טפסים פשוטים
- `max-w-2xl` — טפסים מורכבים

---

## 8. Topbar

```
┌──────────────────────────────────────────────────────────────┐
│  [לוגו]  [שם סניף / בחירת סניף (chain_admin)]     [🔔] [👤 שם + תפקיד ▾] │
└──────────────────────────────────────────────────────────────┘
```

### אלמנטים

| אלמנט | תפקיד | הרשאה |
|---|---|---|
| שם סניף (טקסט) | מציג סניף פעיל | hotel_manager, receptionist, housekeeping |
| בחירת סניף (dropdown) | מעבר בין סניפים | chain_admin בלבד |
| פעמון התראות | מציג count badge (עתידי) | כולם |
| Avatar + שם | dropdown: פרופיל, יציאה | כולם |

### בחירת סניף (chain_admin)

```
[▾ שם סניף פעיל]
  ├── סניף ירושלים
  ├── סניף תל אביב  ← active ✓
  └── סניף חיפה
```

- בחירת סניף → מחדש את כל הנתונים לסניף הנבחר
- `chain_admin` שלא בחר סניף → רואה נתוני רשת מאוחדים בלבד
- הסניף הנבחר נשמר ב-session (לא קבוע)

### תפריט משתמש (dropdown)

```
[👤 ישראל ישראלי — קבלן]
  ├── פרופיל [עתידי]
  └── יציאה
```

---

## 9. פלואים עיקריים

### צ'ק-אין

```
חפש הזמנה → לחץ "צ'ק-אין" → AlertDialog אישור
→ API call + spinner על כפתור
→ הצלחה: toast "צ'ק-אין בוצע בהצלחה" + badges מתעדכנים
→ כישלון: error toast + כפתור חוזר לפעיל
```

### צ'ק-אאוט

```
אותו פטרן כמו צ'ק-אין.
אחרי checkout → סטטוס חדר עובר ל-"בהכנה" (badge מתעדכן inline)
→ toast "צ'ק-אאוט בוצע — חדר עבר לבהכנה"
→ חשבונית עוברת ל-pending_payment (אם לא שולמה)
```

### יצירת הזמנה

```
פתח טופס (modal/דף) → בחר אורח (autocomplete) / צור חדש
→ בחר תאריכים → בדיקת זמינות real-time
→ בחר חדר (רק פנויים בתאריכים אלו מוצגים)
→ submit → ולידציה → הצלחה + מספר הזמנה
→ email נשלח לאורח (NotificationService)
```

### ביטול הזמנה

```
לחץ "בטל הזמנה" (destructive) → AlertDialog עם שדה "סיבת ביטול"
→ הזן סיבה (חובה) → אשר
→ API call → הצלחה: badge מתעדכן ל-"מבוטל"
→ toast "ההזמנה בוטלה"
→ אם שולמה מראש: הצג prompt "האם לבצע החזר כספי?"
```

### תשלום בקופה

```
מתוך פרטי הזמנה → לחץ "גבה תשלום" / מתוך checkout flow
→ דף תשלום: פירוט חשבונית + יתרה לתשלום
→ בחר שיטת תשלום: כרטיס אשראי / מזומן / מסוף POS
  כרטיס: → Stripe Elements form → Pay → spinner → הצלחה
  מזומן: → הזן סכום → אשר → הצלחה
  POS: → לחץ "חייב מסוף" → spinner "ממתין למסוף..." → עד לאישור המסוף
→ הצלחה: חשבונית → paid, toast "תשלום התקבל"
→ כישלון: error toast + פירוט שגיאה, כפתור חוזר לפעיל
```

### הוספת חיוב

```
מתוך פרטי הזמנה / פרטי חשבונית → לחץ "הוסף חיוב"
→ Dialog: בחר סוג (מינibar/חניה/כביסה/אחר) + סכום + תיאור
→ אשר → חיוב מתווסף לחשבונית inline
→ toast "חיוב התווסף"
```

### החזר כספי (מנהל בלבד)

```
מתוך פרטי חשבונית → לחץ "החזר" (מנהל בלבד, נסתר לקבלן)
→ Dialog: מלא / חלקי? + סכום (אם חלקי) + סיבה (חובה)
→ AlertDialog "האם לאשר החזר של ₪X?" → אשר
→ API call → הצלחה: payment.status = refunded, toast "ההחזר בוצע"
→ כישלון: error toast + ניסיון לא מבוטל
```

### ניקיון (Housekeeping)

```
צוות רואה רשימת חדרים לניקיון (status = preparing)
→ לחץ "סמן כנוקה" → status עובר ל-available
→ badge מתעדכן real-time (WebSocket) לכל המשתמשים
→ toast "חדר 205 עודכן — פנוי"
```

### פורטל אורח (ציבורי)

```
אורח מקבל email עם לינק מאובטח
→ פותח /portal/[token] → רואה פרטי הזמנה
→ בוחר פעולה:
  צ'ק-אין אונליין: → /portal/[token]/check-in
    → טופס מולא מראש (שם, דרכון, פלאפון)
    → שלח → /portal/[token]/confirmation
  תשלום: → /portal/[token]/payment
    → Stripe Elements → Pay → /portal/[token]/confirmation
  הורדת חשבונית: → PDF download

טוקן פג תוקף: → /portal/expired (הודעה ברורה + טלפון מלון)
```

### חיפוש

- debounce: 300ms לפני API call
- חיפוש לפי: שם אורח, מספר חדר
- ספירת תוצאות: `"נמצאו 5 הזמנות"`
- ריק: `"לא נמצאו תוצאות עבור "[query]" — נסה מונח אחר"`

---

## 10. מצבי טעינה

| סיטואציה | פתרון |
|---|---|
| טבלה בטעינה | 5 שורות skeleton פועמות |
| כפתור בטעינה | spinner מחליף טקסט + disabled |
| דף בטעינה | skeleton layout מלא |
| **אסור** | UI ריק / קפוא |

---

## 11. RTL — כללים

```html
<html lang="he" dir="rtl">
```

- סיידבר מופיע בצד **ימין**
- אייקונים עם כיוון (chevron, arrow) — חייבים לחוג
- טקסט ברירת מחדל: `text-right`
- Tailwind: השתמש ב-`rtl:` variant לפי צורך

---

## 12. אייקונים

**ספרייה:** Lucide React

| פעולה | אייקון |
|---|---|
| הוסף / חדש | `Plus` |
| ערוך | `Pencil` |
| מחק | `Trash2` |
| חיפוש | `Search` |
| צ'ק-אין | `LogIn` |
| צ'ק-אאוט | `LogOut` |
| חדר | `BedDouble` |
| אורח | `User` |
| תשלום | `CreditCard` |
| Dashboard | `LayoutDashboard` |
| הזמנות | `CalendarDays` |
| סטטוס פנוי | `CheckCircle2` (ירוק) |
| סטטוס תפוס | `XCircle` (אדום) |
| סטטוס בהכנה | `Clock` (amber) |

- גדלים: `w-4 h-4` inline, `w-5 h-5` כפתור עצמאי
- אייקונים דקורטיביים: `aria-hidden="true"`
- כפתורי icon בלבד: `aria-label` בעברית

---

## 13. Toasts (הודעות מערכת)

| אירוע | סוג | הודעה |
|---|---|---|
| הזמנה נוצרה | success | "ההזמנה נוצרה בהצלחה" |
| צ'ק-אין | success | "צ'ק-אין בוצע בהצלחה" |
| צ'ק-אאוט | success | "צ'ק-אאוט בוצע בהצלחה" |
| סטטוס עודכן | success | "סטטוס החדר עודכן" |
| שגיאה | error | "שגיאה — אנא נסה שנית" |
| ולידציה | warning | "יש לתקן את השדות המסומנים" |

מיקום: `top-right` (= top-left בתצוגת RTL)

---

## 14. נגישות (Accessibility)

| כלל | יישום |
|---|---|
| ניגודיות צבעים | 4.5:1 מינימום (WCAG AA) |
| Focus ring | `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` — לא `outline-none` לבד |
| ניווט מקלדת | סדר Tab = סדר ויזואלי (RTL-aware) |
| תוויות טפסים | כל input עם `<label htmlFor>` — אין placeholder בלבד |
| ARIA | כפתורי icon: `aria-label` בעברית |
| Skip link | "דלג לתוכן הראשי" — אלמנט ראשון ב-DOM |
| היררכיית כותרות | h1 → h2 → h3, לא מדלגים רמות |
| סטטוס | תמיד נקודה + טקסט (לא צבע לבד) |
| עדכונים דינמיים | `aria-live="polite"` |

---

## 15. אנימציות

| אלמנט | משך | Class |
|---|---|---|
| כפתור hover | 150ms | `transition-colors duration-150` |
| modal פתיחה | 200ms | shadcn default |
| toast | 300ms | shadcn default |
| skeleton | 1.5s | `animate-pulse` |
| שינוי badge | 200ms | `transition-colors duration-200` |

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 16. Z-Index

```
z-10  — sticky headers טבלה
z-20  — sidebar (mobile overlay)
z-30  — dropdowns, popovers
z-40  — modals / dialogs
z-50  — toasts / notifications
```

---

## 17. Override דפים

### Dashboard (`/dashboard`)

```
┌──────────────────────────────────────────────────────────┐
│ [KPI] חדרים תפוסים  [KPI] פנויים  [KPI] אורחים  [KPI] הזמנות היום │
├──────────────────────────────────────────────────────────┤
│ [לוח חדרים (מנהל)] / [רשימת צ'ק-אינים להיום (קבלן)]   │
└──────────────────────────────────────────────────────────┘
```

- KPI metric: `text-4xl font-bold` + trend arrow
- Grid KPI: `grid grid-cols-2 md:grid-cols-4 gap-4`
- Grid חדרים (מנהל): `grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2`
- לחיצה על תא → popover עם פרטים מהירים

### הזמנות (`/reservations`)

```
┌──────────────────────────────────────────────────────────┐
│ הזמנות                                   [+ הזמנה חדשה] │
├──────────────────────────────────────────────────────────┤
│ [חיפוש]    [סטטוס ▾] [תאריך ▾]  [5 תוצאות]             │
├────────┬──────────┬──────────┬──────────┬────────────────┤
│ חדר   │ אורח     │ כניסה   │ סטטוס   │ פעולות         │
└────────┴──────────┴──────────┴──────────┴────────────────┘
```

**כפתור ראשי לפי סטטוס:**
- `reserved` → "צ'ק-אין"
- `checked_in` → "צ'ק-אאוט"
- `checked_out` / `cancelled` → "הצג"

**פרטי הזמנה (`/reservations/[id]`):** 2 עמודות — תוכן (2/3) + info panel (1/3)

### חדרים (`/rooms`)

**2 תצוגות (toggle):**

*Grid (ברירת מחדל):*
- `grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3`
- כל קארד: מספר חדר + סוג + status badge
- border-right צבעוני לפי סטטוס
- לחיצה → popover עם פעולות מהירות

*List:* טבלה סטנדרטית, ניתנת למיון

**תפעול בלבד:** "עדכן סטטוס" בלבד (`preparing` → `available` בלבד)

### דפים נוספים — Page Overrides מלאים

> ראה קבצי override נפרדים ב-`design-system/pages/`:

| קובץ | דפים |
|------|------|
| `guests.md` | `/guests`, `/guests/[id]`, `/guests/active` |
| `housekeeping.md` | `/housekeeping` |
| `reports.md` | `/reports`, `/reports/reconciliation` |
| `auth.md` | `/login` |
| `admin.md` | `/admin/branches`, `/admin/users` |
| `billing.md` | `/invoices/[id]`, `/payments/checkout`, `/reservations/[id]/pre-payment` |
| `guest-portal.md` | `/portal/[token]`, `/portal/[token]/check-in`, `/portal/[token]/payment`, `/portal/[token]/confirmation`, `/portal/expired` |

---

## 18. צ'קליסט לפני שחרור דף

- [ ] אין emojis כאייקונים — Lucide React בלבד
- [ ] כל אלמנט לחיץ: `cursor-pointer`
- [ ] כל אלמנט אינטראקטיבי: `focus:ring-2 focus:ring-blue-500`
- [ ] badge סטטוס: נקודה + טקסט (לא צבע לבד)
- [ ] כפתורים: spinner + disabled בזמן async
- [ ] שדות טופס: `<label htmlFor>`
- [ ] שגיאות: inline מתחת לשדה
- [ ] טבלאות: עטופות ב-`overflow-x-auto`
- [ ] טעינה: skeleton screens (לא UI ריק)
- [ ] מצב ריק: הודעה בעברית
- [ ] `prefers-reduced-motion` מיושם
- [ ] `dir="rtl"` על אלמנט html
- [ ] היררכיה h1→h2→h3
- [ ] AlertDialog לפני פעולות הרסניות
- [ ] toast אחרי כל פעולת משתמש
