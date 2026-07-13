# Phase 14 — AI Extended Features

## Overview

5 additional AI features built on top of the Cohere integration from Phase 13.

---

## Feature 1 — Daily AI Digest (סיכום יומי למנהל)

**What:** Every morning at 08:00, AI sends an email to the branch manager with:
- Today's occupancy and expected check-ins/check-outs
- Yesterday's revenue
- Guests with special requests arriving today
- Alerts (low occupancy, high cancellations)

**Backend — new files:**
```
backend/src/modules/ai/digest/
  daily-digest.service.ts     ← fetch data + AI generateText
  daily-digest.cron.ts        ← @Cron('0 8 * * *')
  daily-digest.module.ts
```

**Backend — changes:**
- `ai.module.ts` — import DigestModule
- Uses existing `NotificationService` to send email

**Frontend:** None — email only

**Complexity:** Low

---

## Feature 2 — Smart Staff Reminders (תזכורות חכמות לצוות)

**What:** Every evening at 20:00, check tomorrow's arrivals. For reservations with special notes (allergies, birthdays, accessibility needs) — AI drafts a reminder and sends to relevant staff via `NotificationService`.

**Backend — new files:**
```
backend/src/modules/ai/reminders/
  staff-reminder.service.ts   ← fetch tomorrow arrivals with notes + AI generateText
  staff-reminder.cron.ts      ← @Cron('0 20 * * *')
  staff-reminder.module.ts
```

**Frontend:** None

**Complexity:** Low

---

## Feature 3 — Cancellation Auto-Response (תגובה אוטומטית לביטולים)

**What:** When a guest cancels a reservation, AI drafts a personalized email with a recovery offer (discount / upgrade for a future stay).

**Backend — new files:**
```
backend/src/modules/ai/cancellation/
  cancellation-response.service.ts  ← AI generateText for offer email
  cancellation-response.module.ts
```

**Backend — changes:**
- `reservations.service.ts` → after successful cancellation: call `CancellationResponseService` → `NotificationService.sendEmail()`

**Frontend:** None

**Complexity:** Low

---

## Feature 4 — Guest Feedback Analysis (ניתוח ביקורות אורחים)

**What:** After check-out, guest receives a short survey in the portal (1-5 stars + free text). AI analyzes sentiment and generates insights for the manager.

**Backend — new files:**
```
backend/src/modules/ai/feedback/
  feedback.service.ts              ← store feedback + AI sentiment analysis
  feedback.controller.ts           ← POST /api/v1/portal/feedback/:token
  feedback-insights.controller.ts  ← GET /api/v1/reports/feedback-insights
  dto/submit-feedback.dto.ts       ← { rating: number, comment: string }
  feedback.module.ts
```

**Database — new migration:**
```sql
CREATE TABLE guest_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  guest_id UUID NOT NULL REFERENCES guests(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  sentiment VARCHAR(20),     -- positive / neutral / negative
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Frontend — new components:**
```
frontend/components/guest-portal/FeedbackForm.tsx   ← stars + textarea + submit
frontend/components/shared/FeedbackInsights.tsx     ← insights widget for reports page
```

**Frontend — changes:**
- `app/(portal)/[token]/confirmation/page.tsx` — add `<FeedbackForm token={token} />`
- `app/(dashboard)/reports/page.tsx` — add FeedbackInsights tab

**Complexity:** Medium

---

## Feature 5 — Smart Room Upgrade (הצעת שדרוג חדר)

**What:** Every day at 14:00, check guests arriving tomorrow. If a higher room type is available, AI drafts a personalized upgrade offer and sends it to the guest.

**Backend — new files:**
```
backend/src/modules/ai/upgrade/
  room-upgrade.service.ts   ← check availability via AvailabilityService + AI generateText
  room-upgrade.cron.ts      ← @Cron('0 14 * * *')
  room-upgrade.module.ts
```

**Backend — changes:**
- Uses existing `AvailabilityService` to find available higher-category rooms
- Uses existing `NotificationService` to send upgrade offer email

**Frontend:** None — email only

**Complexity:** Medium (must use AvailabilityService, not duplicate logic)

---

## Implementation Order

| Priority | Feature | Effort | Value |
|----------|---------|--------|-------|
| 1 | Daily Digest | 2h | High |
| 2 | Cancellation Response | 1h | High |
| 3 | Smart Reminders | 2h | Medium |
| 4 | Smart Upgrade | 3h | High |
| 5 | Guest Feedback | 4h | Medium |

---

## Shared Dependencies

- `AiService` (Cohere) — already available from Phase 13
- `NotificationService` — already available
- `AvailabilityService` — Feature 5 only
- No new env vars required

## What's NOT in scope

- Analytics dashboard for AI usage
- Fine-tuning models on hotel data
- Multi-language support beyond Hebrew
- SMS delivery (email only via NotificationService)
