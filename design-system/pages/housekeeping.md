# Page Override: Housekeeping (`/housekeeping`)

> Overrides MASTER.md for the housekeeping task page.
> Users: housekeeping staff (primary), hotel_manager (oversight).

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ משימות ניקיון                      [X חדרים לניקיון]         │
├──────────────────────────────────────────────────────────────┤
│ [סטטוס ▾: הכל | בהכנה | זמין | תפוס]    [קומה ▾]            │
├──────────────────────────────────────────────────────────────┤
│ [כרטיס חדר]  [כרטיס חדר]  [כרטיס חדר]  [כרטיס חדר]         │
│ [כרטיס חדר]  [כרטיס חדר]  [כרטיס חדר]  [כרטיס חדר]         │
└──────────────────────────────────────────────────────────────┘
```

- Grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`
- ברירת מחדל: מסנן `status = preparing` בלבד (חדרים שצריך לנקות)

---

## כרטיס חדר

```
┌──────────────────────────────┐
│  205                    ●    │  ← status dot
│  [חדר זוגי]                  │  ← room type
│  קומה 2                      │
│  ─────────────────────────── │
│  [סמן כנוקה]                 │  ← primary button
└──────────────────────────────┘
```

- `border-right-4` צבעוני לפי סטטוס (amber = preparing, green = available)
- "סמן כנוקה" — זמין רק לחדרים בסטטוס `preparing`
- לחיצה → AlertDialog "לסמן חדר 205 כנוקה ופנוי?" → אשר
- לאחר אישור: status → `available`, badge מתעדכן inline, toast

---

## הרשאות לפי תפקיד

| פעולה | housekeeping | hotel_manager |
|---|---|---|
| צפייה בכל החדרים | ✓ | ✓ |
| עדכון `preparing` → `available` | ✓ | ✓ |
| עדכון סטטוסים אחרים | ✗ | ✓ |

---

## Real-time Updates

- סטטוסי חדרים מתעדכנים via WebSocket
- badge משתנה ללא reload
- חדר שעודכן נעלם מהתצוגה הממוקדת (`status = preparing`) אחרי 2 שניות עם animation fade-out
