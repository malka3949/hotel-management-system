# Page Override: Reservations (`/reservations`)

> Overrides MASTER.md for the reservations list and detail pages.

## List Page Layout

```
┌──────────────────────────────────────────────────────────┐
│ הזמנות                                    [+ הזמנה חדשה] │
├──────────────────────────────────────────────────────────┤
│ [חיפוש: שם / חדר]     [סטטוס ▾] [תאריך ▾]  [5 תוצאות]  │
├────────┬──────────┬──────────┬──────────┬────────────────┤
│ חדר   │ אורח     │ כניסה    │ סטטוס   │ פעולות         │
└────────┴──────────┴──────────┴──────────┴────────────────┘
```

## Status Filter

- Default: show all
- Chips: הכל | שמורות | מתגוררים | יצאו | מבוטלות
- Active chip: `bg-primary text-white`

## Table Row Actions

- Primary action changes by status:
  - `reserved` → button "צ'ק-אין"
  - `checked_in` → button "צ'ק-אאוט"
  - `checked_out` / `cancelled` → button "הצג"
- `MoreHorizontal` dropdown: עריכה | ביטול | היסטוריה

## Reservation Detail Page (`/reservations/[id]`)

Two-column layout (RTL: main column on right side of viewport, info panel on left):
- Main col (2/3): Reservation details + Payment history + Charges + Timeline
- Info panel (1/3): Room info card + Guest info card

Action bar at top (RTL: buttons align to start/right): primary action (check-in/out) + secondary (edit) + destructive (cancel).

Buttons visible by role:
- "גבה תשלום" — receptionist + manager (only when invoice pending)
- "הוסף חיוב" — receptionist + manager (only when checked_in)
- "החזר" — manager only (only when payment exists)
