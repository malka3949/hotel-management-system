# Phase 13 — AI Features

## Status: 🟢 Complete

## Overview

6 AI features integrated into the hotel management system. No schema changes, no new DB tables. All features use existing entities.

---

## Feature 1 — AI Concierge (Guest Portal)

**Endpoint:** `POST /api/v1/portal/concierge/:token/chat`  
**Guard:** `GuestTokenGuard` (time-limited, single-reservation scope)  
**Model:** `claude-haiku-4-5` (~$0.0006/chat)  
**Pattern:** Stateless — context passed per request, no DB history  
**Module:** `AiModule > ConciergeService`  
**Frontend:** `AiConcierge.tsx` in `(portal)/[token]/page.tsx`

---

## Feature 2 — Smart Pricing Suggestions

**Endpoint:** `GET /api/v1/reports/pricing-suggestions`  
**Guard:** `JwtAuthGuard + @Roles('chain_admin', 'hotel_manager')`  
**Model:** `claude-sonnet-4-6` (~$0.01/analysis)  
**Data:** RoomType + Room + Reservation (30-day lookahead)  
**Module:** `AiModule > PricingService`  
**Frontend:** `PricingSuggestions.tsx` in reports page

---

## Feature 3 — Natural Language Reports

**Endpoint:** `POST /api/v1/reports/query`  
**Guard:** `JwtAuthGuard + @Roles('chain_admin', 'hotel_manager')`  
**Model:** `claude-sonnet-4-6` (~$0.005/query)  
**Data:** Aggregated reservation + revenue + room stats (30-day window)  
**Module:** `AiModule > NlReportsService`  
**Frontend:** `NlReportQuery.tsx` in reports page

---

## Feature 4 — Cancellation Risk Scoring (Rule-Based, $0)

**No AI API** — pure scoring algorithm (0–100 score)  
**Factors:** advance notice, booking source, stay duration, price  
**Integrated:** `ReservationsService` → `riskScore` field on reservation  
**Frontend:** risk badge on `/reservations` list

---

## Feature 5 — Housekeeping Schedule Optimizer (Rule-Based, $0)

**Endpoint:** `GET /api/v1/housekeeping/optimized-schedule`  
**Guard:** `JwtAuthGuard + @Roles('chain_admin', 'hotel_manager', 'housekeeping')`  
**No AI API** — priority sort: CRITICAL / HIGH / LOW / SKIP  
**Module:** `HousekeepingModule > ScheduleOptimizerService`

---

## Feature 6 — AI Email Drafting

**Trigger:** On reservation creation (`POST /api/v1/reservations`)  
**Model:** `claude-haiku-4-5` (~$0.0003/email)  
**Pattern:** Async, fire-and-forget via `NotificationService`  
**Module:** `AiModule > AiEmailService`

---

## Infrastructure

| Item | Value |
|---|---|
| SDK | `@anthropic-ai/sdk` v0.111.0 |
| Env var required | `ANTHROPIC_API_KEY` |
| New module | `backend/src/modules/ai/` |
| App registration | `AiModule` in `app.module.ts` |

---

## Exit Criteria — Verified

- [x] All 6 features implemented and compiled (TypeScript strict, zero errors)
- [x] Lint: PASS (zero violations)
- [x] Build: PASS
- [x] Frontend components integrated
- [x] PR #10 merged to `develop`
