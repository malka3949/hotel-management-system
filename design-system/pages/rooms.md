# Page Override: Rooms (`/rooms`)

> Overrides MASTER.md for the rooms management page.

## Layout — Two Views (Toggle)

Toggle between Grid View and List View.

### Grid View (Default)
- `grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3`
- Each card: room number (large) + type + status badge
- Card border-left colored by status: green / red / amber
- Click → popover with quick actions

### List View
- Standard table with all columns
- Sortable by: room number, type, status

## Operations Staff View

- Same grid, but only action available is "עדכן סטטוס"
- "עדכן סטטוס" opens a simple select:
  - `preparing` → `available` only (cannot → `occupied`)
- Confirmation toast after update

## Room Status Quick-Change (Manager/Receptionist)

- Click status badge → inline dropdown (not modal)
- Show only valid next-states based on business rules
- Optimistic UI update → revert on error
