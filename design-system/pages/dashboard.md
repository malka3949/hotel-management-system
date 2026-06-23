# Page Override: Dashboard (`/dashboard`)

> Overrides MASTER.md for the dashboard page only.

## Layout

4 KPI cards at top → rooms grid below (manager) OR today's check-ins table (receptionist).

```
┌──────────────────────────────────────────────────────────┐
│ [KPI] חדרים תפוסים  [KPI] חדרים פנויים  [KPI] אורחים  [KPI] הזמנות היום │
├──────────────────────────────────────────────────────────┤
│ [לוח חדרים / רשימת צ'ק-אינים להיום]                    │
└──────────────────────────────────────────────────────────┘
```

## KPI Cards

- Font size for metric number: `text-4xl font-bold` (48px)
- Include trend indicator: arrow + color
- Cards: `grid grid-cols-2 md:grid-cols-4 gap-4`

## Room Grid (Manager View)

- Grid: `grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2`
- Each cell: room number + colored status dot
- Click cell → quick view popover with room details

## Today's Actions (Receptionist View)

- Split table: "צ'ק-אינים צפויים היום" | "צ'ק-אאוטים צפויים היום"
- Tabs with count badge: `<Tabs>` component
- Inline action button per row (not modal — must be fast)
