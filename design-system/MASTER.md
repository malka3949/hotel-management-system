# Hotel Management System — Design System MASTER

> Source of Truth for all UI/UX decisions. Every page must follow this file unless a page-specific override exists in `design-system/pages/`.

---

## 1. Product Context

| Property | Value |
|---|---|
| **Product Type** | Internal Hotel Management System (SaaS-style) |
| **Users** | Receptionist, Hotel Manager, Operations Staff |
| **Usage Pattern** | Desktop-first, daily heavy use, task-oriented |
| **RTL Support** | Hebrew UI — full RTL layout required |
| **Stack** | Next.js + TypeScript + TailwindCSS + shadcn/ui |

---

## 2. Design Philosophy

This is a **tool**, not a marketing site. Every design decision must serve **speed, clarity, and error prevention** — not aesthetics.

- **Clarity > Beauty** — operators process dozens of actions per hour
- **Status is king** — room/reservation/payment status must be instantly readable
- **Zero ambiguity** — buttons say exactly what they do, no clever labels
- **Error prevention first** — disable invalid actions rather than show errors after

---

## 3. Color Palette

| Role | Token | Hex | Usage |
|---|---|---|---|
| Primary | `primary` | `#1E3A8A` | Main actions, nav active, headings |
| Primary Light | `primary-light` | `#3B82F6` | Hover states, secondary buttons, links |
| Accent / CTA | `accent` | `#CA8A04` | Primary CTA button only |
| Background | `bg-base` | `#F8FAFC` | Page background |
| Surface | `bg-surface` | `#FFFFFF` | Cards, panels, modals |
| Border | `border-default` | `#E2E8F0` | All borders |
| Text Primary | `text-primary` | `#0F172A` | Headings, important labels |
| Text Secondary | `text-secondary` | `#475569` | Supporting text, metadata |
| Text Muted | `text-muted` | `#94A3B8` | Placeholders, disabled |
 
### Status Colors (Critical — Used Everywhere)

| Status | Color | Hex | Tailwind Class |
|---|---|---|---|
| Available (פנוי) | Green | `#22C55E` | `bg-green-500` |
| Occupied (תפוס) | Red | `#EF4444` | `bg-red-500` |
| Preparing (בהכנה) | Amber | `#F59E0B` | `bg-amber-500` |
| Reserved | Blue | `#3B82F6` | `bg-blue-500` |
| Checked In | Indigo | `#6366F1` | `bg-indigo-500` |
| Checked Out | Gray | `#6B7280` | `bg-gray-500` |
| Cancelled | Rose | `#F43F5E` | `bg-rose-500` |
| Paid | Green | `#16A34A` | `bg-green-600` |
| Partial | Amber | `#D97706` | `bg-amber-600` |
| Unpaid | Red | `#DC2626` | `bg-red-600` |

---

## 4. Typography

**Font Family:** `Plus Jakarta Sans` (single font — used for all text)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

**Tailwind Config:**
```js
fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] }
```

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Page Title | 24px / `text-2xl` | 700 | 1.3 | Page headings (h1) |
| Section Title | 18px / `text-lg` | 600 | 1.4 | Card/section headings (h2) |
| Label | 14px / `text-sm` | 600 | 1.4 | Form labels, table headers |
| Body | 14px / `text-sm` | 400 | 1.6 | Table rows, descriptions |
| Caption | 12px / `text-xs` | 400 | 1.5 | Metadata, timestamps |

> **Rule:** Minimum 14px for all interactive content. Never use text below 12px.

---

## 5. Layout & Spacing

### Application Shell

```
┌─────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content Area     │
│                         │  max-w: fluid          │
│  [Logo]                 │  ┌───────────────────┐ │
│  [Nav Items]            │  │ Page Header       │ │
│  [Role Badge]           │  │ (title + actions) │ │
│  [User Info]            │  ├───────────────────┤ │
│                         │  │ Content           │ │
└─────────────────────────┴──┴───────────────────┴─┘
```

- **Sidebar width:** `w-60` (240px) fixed, hidden on mobile → hamburger menu
- **Main content padding:** `p-6` (24px) desktop, `p-4` (16px) mobile
- **Section gap:** `gap-6` between major sections
- **Card padding:** `p-4` or `p-6` depending on content density

### Spacing Scale (Tailwind)

| Use | Class | px |
|---|---|---|
| Within elements | `gap-2` / `p-2` | 8px |
| Between related items | `gap-4` / `p-4` | 16px |
| Between sections | `gap-6` / `p-6` | 24px |
| Page margin | `p-6` | 24px |

### Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | < 768px | Sidebar collapses → drawer, tables → cards |
| Tablet | 768px–1024px | Sidebar icons-only (56px) |
| Desktop | > 1024px | Full layout |

---

## 6. Component Patterns

### Status Badge

Always use a colored dot + text label. Never color-only.

```tsx
// Room Status
<Badge variant="available">פנוי</Badge>     // green dot + text
<Badge variant="occupied">תפוס</Badge>      // red dot + text
<Badge variant="preparing">בהכנה</Badge>    // amber dot + text

// Implementation
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  פנוי
</span>
```

### Action Buttons

| Type | Style | Usage |
|---|---|---|
| Primary | `bg-primary text-white` | Main action per page (1 max) |
| Secondary | `border border-primary text-primary` | Secondary actions |
| Destructive | `bg-red-600 text-white` | Delete, cancel reservation |
| Ghost | `text-primary hover:bg-blue-50` | Table row actions |

**Rules:**
- Primary button is disabled + shows spinner during async operation
- Confirm dialogs for all destructive actions (shadcn `AlertDialog`)
- Max 2 primary actions visible at once per section

### Data Tables (shadcn `Table`)

```
┌──────────────────────────────────────────────────────────┐
│ [Search Input]              [Filter Dropdown] [+ New]    │
├────────┬──────────┬──────────┬──────────┬────────────────┤
│ חדר   │ אורח     │ תאריכים  │ סטטוס   │ פעולות         │
├────────┼──────────┼──────────┼──────────┼────────────────┤
│ 101   │ ישראל כהן│ 24/5–27/5│ [תפוס]  │ [צ'ק-אאוט] [▾] │
└────────┴──────────┴──────────┴──────────┴────────────────┘
```

- Row height: `h-12` (48px) — meets touch target minimum
- Hover: `hover:bg-slate-50` with `cursor-pointer`
- Sticky header: `sticky top-0 bg-white z-10`
- Mobile: wrap in `overflow-x-auto`
- Empty state: friendly Hebrew message + illustration

### Forms (React Hook Form + shadcn `Form`)

- All inputs use shadcn `FormField` + `FormControl` + `FormMessage`
- Validation: on `blur` (not just on submit)
- Error messages: inline, below the field in Hebrew
- Required fields: `*` after label
- Date pickers: shadcn `Calendar` + `Popover`
- Select fields: shadcn `Select` (not native `<select>`)

### Modal / Dialog Pattern

- Use shadcn `Dialog` for all modal interactions
- Confirmation of destructive actions: shadcn `AlertDialog`
- Form modals: full form inside dialog, submit = primary action
- Max width: `max-w-md` for simple forms, `max-w-2xl` for complex

---

## 7. Navigation & Information Architecture

### Pages by Role

#### Receptionist
| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Quick stats + today's check-ins |
| Reservations | `/reservations` | Full list + search + filter |
| New Reservation | `/reservations/new` | Create reservation form |
| Reservation Detail | `/reservations/[id]` | View + edit + check-in/out |
| Guests | `/guests` | Guest directory |
| Rooms | `/rooms` | Room availability grid |

#### Hotel Manager
| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Full KPI overview |
| Active Guests | `/guests/active` | Who's in the hotel right now |
| Rooms | `/rooms` | Full room management |

#### Operations
| Page | Route | Description |
|---|---|---|
| Rooms | `/rooms` | Update cleaning status only |

### Sidebar Navigation Order
1. Dashboard
2. הזמנות (Reservations)
3. חדרים (Rooms)
4. אורחים (Guests)
5. ─── separator ───
6. (Settings — future)

---

## 8. UX Interaction Rules

### Check-in Flow
1. Find reservation (search by name or room)
2. Click "צ'ק-אין" button → `AlertDialog` confirmation
3. On confirm → API call → loading spinner on button
4. Success → toast notification → status badges update instantly
5. Error → error toast → button re-enables

### Check-out Flow
Same pattern as check-in. After checkout, room status → "בהכנה" badge updates inline.

### Create Reservation Flow
1. Open form (modal or page)
2. Select guest (autocomplete existing) or create new
3. Select dates → system checks availability in real-time
4. Select room (only shows available rooms for those dates)
5. Submit → validation → success with reservation ID

### Search Behavior
- Debounced search: 300ms delay before API call
- Search by: guest name, room number
- Show results count: "נמצאו 5 הזמנות"
- No results: "לא נמצאו תוצאות עבור "[query]" — נסה מונח אחר"

### Loading States
- Table loading: skeleton rows (5 rows, pulsing)
- Button loading: spinner icon replaces text + disabled
- Page loading: skeleton layout (not spinner)
- Never: blank/frozen UI

---

## 9. Accessibility Requirements

| Rule | Implementation |
|---|---|
| Color contrast | 4.5:1 minimum for all text (WCAG AA) |
| Focus rings | `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` — never `outline-none` alone |
| Keyboard nav | Tab order = visual order (RTL-aware) |
| Form labels | Every input has `<label>` with `htmlFor` — no placeholder-only |
| ARIA labels | Icon-only buttons have `aria-label` in Hebrew |
| Skip link | "דלג לתוכן הראשי" — first element in DOM |
| Heading hierarchy | h1 → h2 → h3, never skip levels |
| Status not color-only | Always dot + text label for status badges |
| Screen reader | `aria-live="polite"` for dynamic status updates |

---

## 10. RTL (Right-to-Left) Rules

Since the system is in Hebrew:

```html
<html lang="he" dir="rtl">
```

- Tailwind RTL: use `rtl:` variant where needed
- Sidebar: appears on the RIGHT
- Icons that indicate direction (chevron, arrow) must be mirrored
- Text alignment: `text-right` default for content
- Flex direction: logical (flex-row works — RTL browser handles it)
- Form layout: labels on right, inputs flow right-to-left

---

## 11. Icon System

**Library:** Lucide React (consistent with shadcn/ui)

| Action | Icon |
|---|---|
| Add / New | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Search | `Search` |
| Check-in | `LogIn` |
| Check-out | `LogOut` |
| Room | `BedDouble` |
| Guest | `User` |
| Payment | `CreditCard` |
| Dashboard | `LayoutDashboard` |
| Reservations | `CalendarDays` |
| Status: Available | `CheckCircle2` (green) |
| Status: Occupied | `XCircle` (red) |
| Status: Preparing | `Clock` (amber) |
| Filter | `Filter` |
| More actions | `MoreHorizontal` |

**Rules:**
- Size: `w-4 h-4` inline, `w-5 h-5` standalone buttons
- Always use `aria-hidden="true"` on decorative icons
- Always use `aria-label` on icon-only buttons

---

## 12. Animation & Transitions

| Element | Duration | Easing | Class |
|---|---|---|---|
| Button hover | 150ms | ease-out | `transition-colors duration-150` |
| Modal open | 200ms | ease-out | shadcn default |
| Toast | 300ms | ease-in-out | shadcn default |
| Skeleton pulse | 1.5s | ease-in-out | `animate-pulse` |
| Status badge change | 200ms | ease | `transition-colors duration-200` |

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 13. Toast Notifications

Use shadcn `Toaster` + `toast()`:

| Event | Type | Message (Hebrew) |
|---|---|---|
| Reservation created | success | "ההזמנה נוצרה בהצלחה" |
| Check-in complete | success | "צ'ק-אין בוצע בהצלחה" |
| Check-out complete | success | "צ'ק-אאוט בוצע בהצלחה" |
| Status updated | success | "סטטוס החדר עודכן" |
| Error | error | "שגיאה — אנא נסה שנית" |
| Validation fail | warning | "יש לתקן את השדות המסומנים" |

Position: `top-right` (= top-left in RTL display)

---

## 14. Z-Index Scale

```
z-10  — Sticky table headers
z-20  — Sidebar (mobile overlay)
z-30  — Dropdowns, popovers
z-40  — Modals / Dialogs
z-50  — Toasts / Notifications
```

---

## 15. Pre-Delivery Checklist

Before shipping any page:

- [ ] No emojis as icons — use Lucide React SVGs
- [ ] All clickable elements have `cursor-pointer`
- [ ] All interactive elements have `focus:ring-2 focus:ring-blue-500`
- [ ] Status badges use dot + text (never color alone)
- [ ] Buttons show spinner + are disabled during async ops
- [ ] Form fields have `<label>` with `htmlFor`
- [ ] Error messages appear inline below fields
- [ ] Tables wrapped in `overflow-x-auto`
- [ ] Loading states: skeleton screens (not blank UI)
- [ ] Empty states have Hebrew message
- [ ] `prefers-reduced-motion` respected
- [ ] `dir="rtl"` on html element
- [ ] Heading hierarchy h1→h2→h3 maintained
- [ ] Confirm dialog before destructive actions
- [ ] Toast feedback after every user action
