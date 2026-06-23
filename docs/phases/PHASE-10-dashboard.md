# Phase 7 — Dashboard & Reporting

## Purpose

Build operational dashboards that give managers and chain admins real-time visibility into hotel performance. Reporting enables data-driven decisions and reduces manual reporting overhead.

---

## Big Picture

This phase surfaces all the data already collected in Phases 1–6 into actionable visualizations. The dashboard is the landing page for managers after login. Chain admins see cross-branch aggregations. Hotel managers see their branch in depth.

Queries here can be expensive — they must not block the operational database. Read-optimized queries and careful indexing are mandatory. (Read replicas are a Phase 9 infrastructure concern.)

Architecture ref: ARCHITECTURE.md § 9 Reporting Architecture, § 3.1 Reporting & Dashboard Service

---

## Scope

### In Scope
- Manager dashboard: occupancy, revenue, arrivals/departures, reservation pipeline
- Chain admin dashboard: cross-branch comparison (occupancy %, revenue)
- Operational summary cards (today's KPIs)
- Reservation pipeline chart (upcoming 30 days)
- Occupancy trend chart (last 30 days)
- Revenue summary (current month vs. previous month)
- Room status summary widget (from availability engine — Phase 6)
- Cancellation report (list + rate)
- Future reservations report (configurable date range)
- Export to CSV (reservation list, revenue summary)

### Out of Scope
- BI-grade analytics (future phase)
- Dynamic pricing analytics (future phase)
- Predictive forecasting (future phase)
- Real-time P&L statements (future phase)
- Advanced accounting exports

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Dashboard load time | < 2 seconds (ARCHITECTURE.md § 12.2) |
| Query isolation | Reporting queries must not lock reservation tables |
| Branch scoping | Manager sees own branch; chain_admin sees all or selected branch |
| Date range | Configurable date range on all reports |
| Chart library | recharts (lightweight, React-native) |
| Export | CSV export via backend stream (no in-memory full dataset) |

---

## API Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/v1/reports/occupancy-summary` | Today's rooms: total, occupied, available, maintenance |
| `GET /api/v1/reports/revenue-summary` | Revenue: today, this month, prev month |
| `GET /api/v1/reports/arrivals-departures` | Today/tomorrow arrivals and departures count |
| `GET /api/v1/reports/reservation-pipeline` | Reservations per day for next 30 days |
| `GET /api/v1/reports/occupancy-trend` | Occupancy % per day for last 30 days |
| `GET /api/v1/reports/cancellations` | Cancelled reservations list + rate |
| `GET /api/v1/reports/future-reservations` | Confirmed reservations in date range |
| `GET /api/v1/reports/cross-branch` | Per-branch occupancy + revenue summary (chain_admin) |
| `GET /api/v1/reports/export/reservations` | CSV stream |
| `GET /api/v1/reports/export/revenue` | CSV stream |

All endpoints accept `?branchId=` (chain_admin only) and `?from=&to=` date range.

---

## Tasks

### Backend
- [ ] Create `ReportsModule` with `ReportsService`, `ReportsController`
- [ ] Implement all 10 endpoints listed above
- [ ] Each query uses read-optimized SQL (no N+1, uses aggregates)
- [ ] Validate that report queries do not conflict with reservation write transactions
- [ ] CSV export: stream response using `res.setHeader('Content-Type', 'text/csv')`
- [ ] Rate-limit heavy report endpoints (max 10 req/min per user)
- [ ] Chain admin cross-branch endpoint validates `chain_admin` role

### Frontend
- [ ] `/dashboard` — manager dashboard (default landing page after login)

  **Summary cards row:**
  - Occupied rooms today (with %)
  - Available rooms today
  - Arrivals today
  - Departures today
  - Revenue this month
  - Cancellations this month

  **Charts section:**
  - Occupancy trend (30-day line chart)
  - Reservation pipeline (30-day bar chart, upcoming bookings per day)

  **Tables section:**
  - Today's arrivals (paginated)
  - Today's departures (paginated)

- [ ] `/dashboard/chain` — chain admin cross-branch overview
  - Branch comparison table: occupancy %, revenue, rooms total
  - Branch selector for drill-down

- [ ] `/reports/cancellations` — cancellations report
  - Date range picker
  - Cancellation list table
  - Cancellation rate metric

- [ ] `/reports/future-reservations` — upcoming reservations
  - Date range picker
  - Reservation list table with export button

- [ ] `ReportDateRangePicker` component (RTL-compatible)
- [ ] `KPICard` component (icon + metric + trend indicator)
- [ ] `OccupancyChart` component (recharts line)
- [ ] `PipelineChart` component (recharts bar)
- [ ] CSV export download button (triggers backend CSV stream)

---

## Expected Deliverables

1. Manager dashboard loads in < 2 seconds with accurate today's KPIs
2. Charts render correctly with real data
3. Cross-branch dashboard works for chain_admin
4. Cancellation and future reservation reports functional with date range and export
5. All data branch-scoped correctly

---

## Validation Checklist

- [ ] Dashboard loads in < 2 seconds (measure with browser DevTools)
- [ ] Occupancy summary matches actual room statuses from DB
- [ ] Revenue summary matches sum of finalized invoice totals
- [ ] Today's arrivals count matches reservations with `check_in_date = today` and status `confirmed`
- [ ] Cross-branch endpoint returns `403` for non-chain_admin roles
- [ ] CSV export downloads correctly (opens in Excel/Google Sheets)
- [ ] Report queries do not lock the `reservations` table (verify with `pg_locks`)
- [ ] Date range filter applies correctly to all reports
- [ ] Charts render RTL-compatible (labels on right side where applicable)
- [ ] `chain_admin` dashboard shows all branches; manager sees only their branch
- [ ] TypeScript strict — zero `any` in reports module

---

## Exit Criteria

All of the following must be true before Phase 8 begins:

1. Manager dashboard loads in < 2s with all KPI cards and charts populated
2. Chain admin cross-branch view works with accurate per-branch data
3. Cancellation and future reservation reports downloadable as CSV
4. No report query causes noticeable slowdown to operational API
5. Integration tests: each report endpoint returns correct data for known test fixtures
