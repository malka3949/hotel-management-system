# Privacy Compliance Findings — AI & Public Booking Delta Audit

**Date:** 2026-07-20
**Delta from:** PRIVACY-COMPLIANCE-FINDINGS.md (2026-07-07)
**Scope:** `backend/src/modules/ai/` (all submodules) · `backend/src/modules/public-booking/` · new DTOs
**AI Provider confirmed:** Cohere (Canada) via `cohere-ai` SDK v8.0.0, model `command-a-03-2025`
**Law:** חוק הגנת הפרטיות תשמ"א-1981 (תיקון 13, תשפ"ג-2023) + תקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 + הנחיית AI 2025

---

## Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 5 |
| 🟡 High | 7 |
| 🔵 Medium | 2 |
| **Total** | **14** |

---

## Critical Findings

### [AI-C01] כל בקשות ה-AI נשלחות ל-Cohere ללא DPA ובלי Tier ללא אימון — PII נחשף לאימון מודל

- **LAW:** תקנה 15 לתקנות 2017 (מיקור-חוץ של עיבוד מידע); סעיף 36ב לחוק (תיקון 13) (העברת מידע לחו"ל); הנחיית AI 2025 סעיף ג'
- **File:line:** `backend/src/modules/ai/ai.service.ts:14`
- **Problem:** All guest PII is sent to Cohere (a Canadian commercial LLM provider) using the standard `CohereClient` without any enterprise/no-training tier configuration, no DPA with Cohere referenced anywhere in the codebase or documentation, and no masking applied before transmission. By default Cohere's standard API tier may use prompt data for model improvement, meaning guest names, emails, special requests (including health/allergy notes), cancellation reasons, and staff email addresses are transferred to a foreign provider and potentially used for AI training without data-subject consent or a lawful cross-border transfer basis.
- **Fix:** Upgrade to Cohere Enterprise/private-deployment tier with contractual no-training guarantee; execute a DPA with Cohere referencing Israeli law; until then disable all AI features in production.

---

### [AI-C02] שם אורח אמיתי ב-Prompt של שדרוג חדר — PII ל-LLM ללא מיסוך

- **LAW:** תקנה 15 לתקנות 2017; סעיף 8 לחוק (מסירת מידע לגורם שלישי)
- **File:line:** `backend/src/modules/ai/upgrade/room-upgrade.service.ts:77-82`
- **Problem:** The room-upgrade prompt inserts the real guest full name (`safeName = reservation.guest.fullName`) directly into the Cohere prompt: `פנה לאורח בשם ${safeName}`, transmitting an identified guest's personal name to an external LLM without masking; combined with the absence of a no-training DPA (AI-C01) this constitutes PII transfer to a third-party model with no legal basis.
- **Fix:** Replace real name in prompt with a generic salutation (e.g., "האורח הנכבד") until a valid no-training DPA is in place; mask all PII before prompts are sent.

---

### [AI-C03] שם אורח + נתונים פיננסיים ב-Prompt של דוא"ל ברכה

- **LAW:** תקנה 15 לתקנות 2017; הנחיית AI 2025 סעיף ג'
- **File:line:** `backend/src/modules/ai/email/ai-email.service.ts:30`
- **Problem:** `AiEmailService.draftWelcomeEmail()` embeds `ctx.guestName` (real full name), room number, check-in/out dates, and total financial amount in the Cohere prompt, sending identified guest financial and stay data to the external LLM without masking or a no-training agreement.
- **Fix:** Mask name to generic token; omit financial totals from prompt; ensure Enterprise/no-training tier.

---

### [AI-C04] מידע בריאותי (אלרגיות, נגישות) ב-Prompts של Reminders — מידע רגיש מיוחד ל-LLM

- **LAW:** תקנה 15 לתקנות 2017; סעיף 2א לחוק (מידע רגיש מיוחד — בריאות); הנחיית AI 2025 סעיף ג'
- **File:line:** `backend/src/modules/ai/reminders/staff-reminder.service.ts:58-68`
- **Problem:** The staff-reminder prompt explicitly instructs Cohere to "highlight special notes requiring preparation (allergies, birthdays, accessibility, special requests)" and then injects the raw `r.notes` field verbatim. Reservation notes may contain health/medical data (allergies, disabilities), which is **specially-sensitive data** under Amendment 13; sending specially-sensitive data to an external LLM without a no-training DPA and without explicit data-subject consent for AI processing is a clear breach.
- **Fix:** Strip health/medical keywords from notes before sending to LLM, or apply a field-level classification filter; require Enterprise tier + DPA before any specially-sensitive data enters a prompt.

---

### [AI-C05] אימייל עובד מוכנס ל-Prompt של NL-Reports

- **LAW:** תקנה 15 לתקנות 2017; הנחיית AI 2025 סעיף ג'
- **File:line:** `backend/src/modules/ai/reports/nl-reports.service.ts:152`
- **Problem:** The NL-reports Cohere system prompt includes the staff user's email address literally: `המשתמש: ${user.email}`, transmitting an identified employee's PII to the external LLM without masking or a no-training agreement.
- **Fix:** Replace with role label only (`תפקיד: ${roleLabel}`); omit `user.email` from all prompts.

---

### [AI-C06] Public Booking Portal — איסוף PII ציבורי ללא הסכמה

- **LAW:** סעיף 11 לחוק (תיקון 13) — חובת הודעה לנושא המידע; תקנה 2(ג) לתקנות 2017
- **File:line:** `backend/src/modules/public-booking/dto/create-public-reservation.dto.ts:14`
- **Problem:** `POST /public/branches/:branchId/reservations` collects `guestName`, `guestEmail`, `guestPhone` from unauthenticated members of the public and immediately creates a `Guest` DB record with no consent field, no privacy notice acknowledgment, no data controller identification, and no processing-purpose disclosure in the DTO, API contract, or any referenced documentation. This is the highest-volume PII collection point in the system (public-facing, no auth) and operates entirely outside any consent framework.
- **Fix:** Add `consentGiven: boolean` (validated `=== true`) and `privacyPolicyVersion: string` to the DTO; display a privacy notice at the booking UI with controller identity, processing purpose, and data recipients before submission.

---

## High Findings

### [AI-H01] קונסיירז' AI — אין הצהרה שמדובר ב-AI

- **LAW:** הנחיית AI 2025 סעיף א' (יידוע מפורש שמעורב AI)
- **File:line:** `backend/src/modules/ai/concierge/concierge.service.ts:42-50`
- **Problem:** The concierge chatbot is presented to guests as "עוזר קונסיירז'" with no disclosure that they are communicating with an AI system. Guests interacting via the portal token cannot know they are conversing with an LLM, and their free-text messages (potentially containing personal details, health information, or complaints) are relayed to Cohere without any prior AI-interaction disclosure.
- **Fix:** Prepend a disclosure in the first response or system acknowledgment: "שירות זה מופעל על-ידי בינה מלאכותית ואינו מייצג נציג אנושי."

---

### [AI-H02] Feedback Sentiment — אין זכות תיקון, אין גילוי AI

- **LAW:** הנחיית AI 2025 סעיף א' (יידוע AI); סעיף 14 לחוק (תיקון 13) — זכות תיקון, כולל "תיקון האלגוריתם"
- **File:line:** `backend/src/modules/ai/feedback/feedback.service.ts:37-51`
- **Problem:** Guest free-text feedback is sent verbatim to Cohere for sentiment analysis without informing the guest that their comment will be processed by an external AI system. `GuestFeedback.aiSummary` (an AI-generated characterization of the guest) is stored permanently with no correction mechanism if the AI-produced sentiment/summary is wrong — a guest cannot challenge an erroneous `negative` sentiment label.
- **Fix:** Disclose AI processing at feedback submission; add a correction/dispute endpoint for `aiSummary` and `sentiment` fields; implement human review path for challenged labels.

---

### [AI-H03] Room Upgrade — פרופיילינג אוטומטי לשיווק ללא הסכמה ואישור אנושי

- **LAW:** הנחיית AI 2025 סעיף ד' (Human-in-the-loop); סעיף 17ז לחוק (תיקון 13) — עיבוד לצרכי שיווק
- **File:line:** `backend/src/modules/ai/upgrade/room-upgrade.service.ts:29-93`
- **Problem:** The room-upgrade module automatically selects guests for commercial upgrade offers using AI-generated email copy and sends those offers without guest consent for AI-based profiling or targeted marketing; no opt-out mechanism exists, no disclosure that an algorithm selected them for an offer, and no human review step before the email is dispatched.
- **Fix:** Add a human-approval queue before upgrade emails are sent; add opt-out flag to guest record; disclose algorithmic selection in the email footer.

---

### [AI-H04] אין DPIA לשום אחד מ-7 תהליכי ה-AI

- **LAW:** הנחיית AI 2025 סעיף ה' (DPIA נדרש בשלב האפיון)
- **File:line:** `backend/src/modules/ai/` (all files)
- **Problem:** No DPIA (Data Protection Impact Assessment / תסקיר השפעה על הפרטיות) was conducted before deploying the AI module. Seven distinct AI-processing flows (concierge, digest, reminders, upgrade, cancellation-response, NL-reports, feedback analysis) each involve cross-border PII transfer to an external LLM, automated profiling, or decisions affecting data subjects, yet no DPIA document, risk registry, or privacy-by-design record exists anywhere in the project.
- **Fix:** Conduct and document a DPIA covering all seven AI flows before next production deployment; address prompt-injection risk (the concierge accepts unbounded guest free-text relayed directly to Cohere).

---

### [AI-H05] Public Booking — אין Audit Log לאיסוף PII ציבורי

- **LAW:** תקנה 10 לתקנות 2017 — רישום גישה וכל שינוי במידע
- **File:line:** `backend/src/modules/public-booking/public-booking.service.ts:98-183`
- **Problem:** `createReservation()` creates a new `Guest` record (collecting `fullName`, `email`, `phone`) and a `Reservation` record for any member of the public with zero audit-log entries. `PublicBookingModule` does not import `AuditModule`; there is no `GUEST_CREATE` or `RESERVATION_CREATE` audit entry for public-portal bookings, making the entire public-facing PII intake path invisible to compliance audit trails.
- **Fix:** Import `AuditModule` into `PublicBookingModule`; add `audit.log({ action: 'PUBLIC_GUEST_CREATE' })` and `audit.log({ action: 'PUBLIC_RESERVATION_CREATE' })` inside `createReservation()`.

---

### [AI-H06] אימייל אורח ב-Logs של AI Upgrade ו-Cancellation

- **LAW:** תקנה 10 לתקנות 2017 — לוגים אינם רשאים לכלול מידע אישי מזהה
- **File:line:** `backend/src/modules/ai/upgrade/room-upgrade.service.ts:92`; `backend/src/modules/ai/cancellation/cancellation-response.service.ts:61`
- **Problem:** Both services write guest email addresses to application logs on every invocation: `Upgrade offer sent to ${reservation.guest.email}` and `Cancellation offer sent to ${reservation.guest.email}`; application logs are not subject to field-level access controls and flow to any connected SIEM/log shipper, leaking guest PII to log infrastructure.
- **Fix:** Replace with `Upgrade offer sent for reservation ${reservation.id}` — omit email address from all log lines.

---

### [AI-H07] GuestFeedback לא מכוסה על-ידי תהליך מחיקת PII

- **LAW:** סעיף 14 לחוק (תיקון 13) — מחיקה חייבת לכסות את כלל המידע, כולל מידע נגזר
- **File:line:** `backend/src/modules/ai/feedback/feedback.service.ts:64-65`
- **Problem:** `GuestFeedback` records (containing guest free-text comments, AI-generated `aiSummary`, and `sentiment` labels) are linked to `guestId` but are not covered by the existing soft-delete/erasure flow in `guests.service.ts`. A deletion request will leave `comment`, `aiSummary`, and `sentiment` permanently in the `guest_feedback` table. This extends PRIV-C01/C02 to the AI-derived data layer.
- **Fix:** Extend the guest deletion transaction to null-out `comment` and `aiSummary` in `guest_feedback` rows for the deleted guest.

---

## Medium Findings

### [AI-M01] Cancellation Reason ב-Prompt — ללא גילוי לאורח

- **LAW:** סעיף 11 לחוק (תיקון 13) — חובת הודעה על מטרת השימוש במידע
- **File:line:** `backend/src/modules/ai/cancellation/cancellation-response.service.ts:42-43`
- **Problem:** The cancellation-response prompt sends the raw `cancellationReason` text to Cohere. Cancellation reasons may contain personal context ("חתונה בחו"ל", "אשפוז", "בעיה כלכלית") that the guest entered believing it would only be seen by hotel staff, not processed by an external AI system. No disclosure at the cancellation UI.
- **Fix:** Either omit `cancellationReason` from the prompt, or disclose at the cancellation UI that the reason may be processed by an AI system.

---

### [AI-M02] Daily Digest — notes מכיל מידע בריאותי שעובר ל-Cohere אחרי אנונימיזציה חלקית בלבד

- **LAW:** הנחיית AI 2025 סעיף ג' (מיסוך מידע לפני שליחה ל-LLM)
- **File:line:** `backend/src/modules/ai/digest/daily-digest.service.ts:76,80`
- **Problem:** The daily digest sends `r.notes` (free-text special requests, which may include allergy, disability, or personal occasion data) to Cohere inside the `בקשות_מיוחדות` array. While guest names are anonymized to `אורח_N` tokens, the notes content itself can be re-identifying in context (e.g., "חדר גישה לנכים — כיסא גלגלים, שם בעל ההזמנה ידוע לצוות"). The anonymization is structural only and does not protect specially-sensitive data within the free-text field.
- **Fix:** Apply a regex/NLP health-keyword filter to strip or redact health-related content from `notes` before including in any prompt; or exclude `notes` from digest prompts entirely.

---

## Finding Priority for Production Deployment

| Priority | Finding | Blocker? |
|---|---|---|
| P0 | AI-C01 — Cohere DPA + no-training tier | ✅ עצור פרודקשן בלי DPA |
| P0 | AI-C06 — Public booking consent | ✅ קוד בלוקר |
| P1 | AI-C02, C03, C04, C05 — PII masking in prompts | תיקון קוד |
| P1 | AI-H05 — Public booking audit log | תיקון קוד |
| P1 | AI-H06 — Email in logs | תיקון קוד |
| P1 | AI-H07 — GuestFeedback not erased on delete | תיקון קוד |
| P2 | AI-H01 — Concierge AI disclosure | UX |
| P2 | AI-H02 — Feedback correction right | פיצ'ר |
| P2 | AI-H03 — Upgrade human-in-loop | פיצ'ר |
| P3 | AI-H04 — DPIA | תהליך משפטי |
| P3 | AI-M01, M02 — Additional prompt hygiene | תיקון קוד |

---

*Delta audit — modality 5b. Covers AI modules and public booking portal not scanned in original 2026-07-07 audit.*
