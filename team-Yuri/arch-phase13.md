# Architect Phase 13 — AI Features

## Phase Identifier
PHASE=13

## Status
STATUS: COMPLETE

## Scope
6 AI features integrated into the hotel management system.
No Prisma schema changes. No new DB tables. All features use existing entities.

## Feature Architecture

### Feature 1 — AI Concierge (Guest Portal)
- **Endpoint:** `POST /api/v1/portal/concierge/:token/chat`
- **Guard:** `GuestTokenGuard` (time-limited, single-reservation scope)
- **Model:** `claude-haiku-4-5` (~$0.0006/chat)
- **Pattern:** Stateless — context passed per request, no DB history
- **Service:** `AiModule > ConciergeService`
- **Frontend:** `AiConcierge.tsx` component in `(portal)/[token]/page.tsx`

### Feature 2 — Smart Pricing Suggestions
- **Endpoint:** `GET /api/v1/reports/pricing-suggestions`
- **Guard:** `JwtAuthGuard + @Roles('chain_admin', 'hotel_manager')`
- **Model:** `claude-sonnet-4-6` (~$0.01/analysis)
- **Data source:** RoomType + Room + Reservation (30-day lookahead)
- **Service:** `AiModule > PricingService`
- **Frontend:** `PricingSuggestions.tsx` in reports page

### Feature 3 — Natural Language Reports
- **Endpoint:** `POST /api/v1/reports/query`
- **Guard:** `JwtAuthGuard + @Roles('chain_admin', 'hotel_manager')`
- **Model:** `claude-sonnet-4-6` (~$0.005/query)
- **Data source:** Aggregated reservation + revenue + room stats (30-day window)
- **Service:** `AiModule > NlReportsService`
- **Frontend:** `NlReportQuery.tsx` in reports page

### Feature 4 — Cancellation Risk Scoring (Rule-Based, $0)
- **No Claude API** — pure scoring algorithm
- **Score range:** 0–100
- **Factors:** no payment (+40), last-minute booking (+25), walk-in (+20), past cancellations (+15), peak season (-10)
- **Service:** `ReservationsModule > CancellationRiskService`
- **Output:** `riskScore` field added to all Reservation responses
- **Frontend:** Colored badge in reservations table (yellow ≥40, red ≥70)

### Feature 5 — Housekeeping Schedule Optimization (Rule-Based, $0)
- **No Claude API** — priority scoring by checkout/checkin state
- **Priority levels:** CRITICAL (checkout+checkin same day) / HIGH (checkout only) / LOW (occupied) / SKIP (vacant)
- **Endpoint:** `GET /api/v1/housekeeping/optimized-schedule`
- **Guard:** `@Roles('chain_admin', 'hotel_manager', 'housekeeping')`
- **Service:** `HousekeepingModule > ScheduleOptimizerService`

### Feature 6 — Automated Email Drafting
- **No new endpoint** — fires automatically on reservation creation
- **Model:** `claude-haiku-4-5` (~$0.001/email)
- **Pattern:** Fire-and-forget after existing confirmation email
- **Service:** `AiModule > AiEmailService` (injected `@Optional()` into ReservationsService)
- **Degradation:** If `ANTHROPIC_API_KEY` absent → AI email silently skipped

## SDK & Config
- Dependency: `@anthropic-ai/sdk@0.111.0` (backend only)
- Config: `ANTHROPIC_API_KEY` — optional in dev/test, configured in Render for production
- Graceful degradation: `AiService.isAvailable()` check before every Claude call

## Security
- Guest concierge: `GuestTokenGuard` — existing token scope unchanged
- Staff features: existing `JwtAuthGuard + RolesGuard` — no new attack surface
- API key: env var only, never in git, never logged

## Constraints
- No schema migration
- No guest history stored in DB
- No RAG / vector search
- No streaming (synchronous responses for simplicity)
