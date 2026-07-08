# Privacy Compliance Findings — Hotel Management System

**Date:** 2026-07-07  
**Law:** חוק הגנת הפרטיות תשמ"א-1981 (תיקון 13, תשפ"ג-2023) + תקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017  
**Method:** Static code audit — 3 parallel privacy-auditor agents (data-subject-rights, encryption/logging, third-party-transfers)  
**Audited paths:** `backend/src/`, `backend/prisma/schema.prisma`, `docker-compose.yml`

---

## Security Level Determination

**רמת אבטחה: גבוהה (HIGH)**

Basis per תקנה 3(ב)(2) לתקנות 2017: The `guests` table stores `passport_id` (מספר דרכון — nationally-issued identifier), `date_of_birth`, `full_name`, `email`, `phone`, `nationality`. The `guest_documents` table adds document numbers (ID cards, driver's licenses, expiry dates). The `online_check_ins` table duplicates passport ID and full name. Financial payment records also present. HIGH level mandates: encryption at rest for sensitive fields, encrypted network channels, mandatory audit logging of every access, network separation, and designated privacy officer.

---

## Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 6 |
| 🟠 High | 12 |
| 🟡 Medium | 4 |
| **Total** | **22** |

---

## Critical Findings

### [PRIV-C01] Soft-Delete Only — PII Not Erased on Guest Deletion

- **LAW:** סעיף 14 לחוק הגנת הפרטיות (תיקון 13) — זכות נושא המידע למחיקה; חשיפה לסעיף 15א
- **File:line:** `backend/src/modules/guests/guests.service.ts:192`
- **Problem:** `softDelete()` issues `prisma.guest.update({ data: { isActive: false } })` only. All PII columns (`fullName`, `email`, `phone`, `passportId`, `dateOfBirth`, `nationality`, `notes`) remain at their original values. Confirmed at runtime by E2E-001: DB query after DELETE returns full PII with `is_active=false`. A data-subject erasure request produces no actual erasure.
- **Fix:** On deletion, either hard-delete the row or null-out all PII columns in the same transaction: `fullName='[deleted]'`, `email=null`, `phone=null`, `passportId=null`, `dateOfBirth=null`, `nationality=null`, `notes=null`. See also PRIV-C02 for derived tables.

---

### [PRIV-C02] Deletion Does Not Cover Derived PII Copies in `online_check_ins` and `guest_documents`

- **LAW:** סעיף 14 לחוק הגנת הפרטיות (תיקון 13) — מחיקה חייבת לכסות את כלל המידע על נושא המידע
- **File:line:** `backend/src/modules/guests/guests.service.ts:187-198`; `backend/prisma/schema.prisma:174-191` (GuestDocument); `backend/prisma/schema.prisma:522-538` (OnlineCheckIn)
- **Problem:** `softDelete()` updates only the `guests` row. `online_check_ins` stores own copies of `fullName`, `passportId`, `email`, `phone`. `guest_documents` stores `documentNumber` and `issuingCountry`. Both tables remain fully populated after guest deletion. Passport number and document details are permanently retrievable through child tables even if PRIV-C01 were fixed on the `guests` row.
- **Fix:** Extend the deletion transaction to cascade-delete or null-out PII columns in `guest_documents` and `online_check_ins` for the affected guest ID.

---

### [PRIV-C03] Guest Portal Emails Hardcoded to Developer Address — PII Disclosed to Unauthorized Third Party

- **LAW:** סעיף 8 לחוק הגנת הפרטיות (תיקון 13) — איסור מסירת מידע לגורם שלישי ללא הסכמה
- **File:line:** `backend/src/modules/guest-portal/guest-portal.service.ts:82`; `backend/src/modules/billing/pdf/invoice-pdf.service.ts:182`
- **Problem:** `sendPortalEmail(to: string, ...)` accepts the guest's actual email but the Resend API call hardcodes `to: 'malka.develop3949@gmail.com'`. Likewise `sendByEmail` fetches `guestEmail` from DB then ignores it. Every portal link and every invoice email is sent exclusively to a developer's personal Gmail — including the guest's full name, a live bearer-token portal URL (grants access to reservation/PII/payment), and invoice financial details. Guests receive nothing; the developer receives time-limited tokens granting access to each guest's data without their knowledge. This is an unauthorized third-party disclosure on every triggered event.
- **Fix:** Replace hardcoded `'malka.develop3949@gmail.com'` with the `to` parameter (already in scope). Add an integration test asserting recipient equals guest email.

---

### [PRIV-C04] TLS Certificate Verification Disabled System-Wide

- **LAW:** תקנה 14 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — הצפנת ערוצי תקשורת
- **File:line:** `docker-compose.yml:61,87`; `backend/Dockerfile.dev:11`
- **Problem:** `NODE_TLS_REJECT_UNAUTHORIZED: '0'` is set on both the `backend` and `n8n` containers in docker-compose, and baked into the Dockerfile. This disables server certificate validation for all outbound HTTPS connections — including calls to Stripe, Resend (receives guest email + portal URLs), and n8n. A machine-in-the-middle attacker can intercept guest PII in transit without detection.
- **Fix:** Remove `NODE_TLS_REJECT_UNAUTHORIZED` from all runtime container definitions. For self-signed internal CA in dev use `NODE_EXTRA_CA_CERTS` instead.

---

### [PRIV-C05] No Data Retention Policy — Guest PII Stored Indefinitely After Checkout

- **LAW:** סעיף 17 לחוק הגנת הפרטיות (תיקון 13) — עקרון מגבלת שמירה; תקנה 2(ג) לתקנות 2017
- **File:line:** `backend/prisma/schema.prisma:146` (Guest model); no scheduled deletion logic anywhere in `backend/src/`
- **Problem:** There is no scheduled job, cron task, or application logic that deletes or anonymizes guest PII after a defined retention period. Passport IDs, dates of birth, and document numbers accumulate without bound after checkout. No retention period configuration, no `retentionExpiresAt` column, no documented policy. The `notes` free-text field (2000 chars) may contain health or disability data (higher sensitivity, shorter retention).
- **Fix (requires human decision):** Legal counsel must define retention periods per category (e.g., 7 years for invoicing/tax; shorter for raw identity data). Once defined, implement a scheduled job that anonymizes or deletes PII columns after the period expires, preserving billing record metadata.

---

### [PRIV-C06] Third-Party API Keys Hardcoded in Version-Controlled `docker-compose.yml`

- **LAW:** תקנה 13 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — ניהול הרשאות וסיסמאות
- **File:line:** `docker-compose.yml:60` (RESEND_API_KEY), `docker-compose.yml:82` (N8N_ENCRYPTION_KEY)
- **Problem:** `RESEND_API_KEY: re_3WD3vmvB_...` and `N8N_ENCRYPTION_KEY: rmc3TEszEbar6...` appear as literal plaintext in docker-compose.yml (committed to git). All other env vars in this file use `${VAR}` substitution — these two do not. The Resend key controls email delivery of guest portal tokens; the n8n key protects n8n's stored credentials. Anyone with repo access can extract both. (Also covered in INFRA-SECURITY-FINDINGS.md as committed secrets.)
- **Fix:** Replace literal values with `${RESEND_API_KEY}` / `${N8N_ENCRYPTION_KEY}`. Rotate both keys immediately.

---

## High Findings

### [PRIV-H01] `findOne()` Has No `isActive` Guard — Soft-Deleted Guest PII Accessible by Any Staff

- **LAW:** סעיף 14 לחוק הגנת הפרטיות (תיקון 13)
- **File:line:** `backend/src/modules/guests/guests.service.ts:148`
- **Problem:** `findOne()` queries `prisma.guest.findUnique({ where: { id } })` with no `isActive` filter. Any authenticated staff member can call `GET /api/v1/guests/:id` for a "deleted" guest and receive the full PII payload. `findAll()` (line 78) correctly filters `isActive: true`; `findOne` does not — making the inconsistency invisible in normal use.
- **Fix:** Add `where: { id, isActive: true }` to `findOne`, or throw `NotFoundException` when returned record has `isActive: false`.

---

### [PRIV-H02] No Full Per-Guest Data Export — Right of Inspection Cannot Be Fulfilled

- **LAW:** סעיף 13 לחוק הגנת הפרטיות (תיקון 13) — זכות העיון של נושא המידע בנתוניו
- **File:line:** `backend/src/modules/guests/guests.controller.ts:61-65,99-103`
- **Problem:** No endpoint produces a complete portable view of all data held about a specific guest. `GET /guests/:id` returns only the guests row; `GET /guests/:id/reservations` returns reservations only. `GuestDocument` records (passport scans, document numbers), `OnlineCheckIn` records, `AuditLog` entries, and billing/payment records are not accessible through any aggregate export route.
- **Fix:** Add `GET /guests/:id/export` (restricted to `hotel_manager`/`chain_admin` and optionally portal token) returning a single JSON bundle of all related records for that guest ID.

---

### [PRIV-H03] No Consent or Privacy Notice at Any PII Collection Point

- **LAW:** סעיף 11 לחוק הגנת הפרטיות (תיקון 13) — חובת הודעה לנושא המידע על זהות בעל מאגר המידע, מטרת האיסוף ורשימת נמענים
- **File:line:** `backend/src/modules/guests/dto/create-guest.dto.ts`; `backend/src/modules/guest-portal/dto/online-check-in.dto.ts`
- **Problem:** `CreateGuestDto` has no `consentGiven`/`consentTimestamp` field. `OnlineCheckInDto` has no consent checkbox, no privacy notice acknowledgment, no data controller identification. The portal invitation email contains only the reservation link — no privacy statement, no processing purpose, no controller identity. Guests submitting passport IDs via portal have no knowledge of who controls the data, for what purpose, or how long it is retained.
- **Fix:** (1) Add privacy notice to guest portal check-in page with mandatory acknowledgment. (2) Add `consentGiven: boolean` (validated `true`) to `OnlineCheckInDto`. (3) Include controller identity and brief privacy statement in portal invitation email. (4) Document legal basis for staff-entered records in internal policy.

---

### [PRIV-H04] PII Fields (Passport ID, Date of Birth, Document Numbers) Stored in Plaintext at DB Column Level

- **LAW:** תקנה 12 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — הצפנת מידע במנוחה; חובה למסד נתונים ברמת אבטחה גבוהה
- **File:line:** `backend/prisma/schema.prisma:152` (passportId), `:154` (dateOfBirth), `:179` (documentNumber in GuestDocument), `:527` (passportId in OnlineCheckIn)
- **Problem:** All sensitive identity fields are stored as plain `VARCHAR`/`DATE` columns. No column-level or application-level encryption layer. No `pgcrypto` functions in migrations. For a HIGH security database, תקנה 12 requires data to be unintelligible to anyone without authorization — a requirement that cannot be met by DB access controls alone if storage volumes or backups are compromised.
- **Fix:** Implement application-level encryption (AES-256-GCM via KMS-backed key) before writing `passportId`, `dateOfBirth`, `documentNumber`, `nationality`, with transparent decryption on read. Or use PostgreSQL `pgcrypto` `pgp_sym_encrypt`. For `passportId` uniqueness constraints, use a separate HMAC index column.

---

### [PRIV-H05] Bulk Guest List and Search Generate No Audit Log Entry

- **LAW:** תקנה 10 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — רישום גישה למאגר מידע
- **File:line:** `backend/src/modules/guests/guests.service.ts:65` (findAll), `:105` (search)
- **Problem:** `findAll` and `search` return full PII (fullName, email, phone, passportId, nationality) for potentially many records but write nothing to the audit log. A receptionist can extract the entire guest list including passport IDs with no traceable record. `findOne` (line 148) correctly calls `this.audit.log(...)` — the omission in findAll/search is inconsistent.
- **Fix:** Add `await this.audit.log({ action: 'GUEST_LIST', entityType: 'guest', metadata: { resultCount: total, search: filters.search } })` at end of `findAll` and equivalent in `search`.

---

### [PRIV-H06] Audit Log Has No `ip_address` or `user_agent` Columns

- **LAW:** תקנה 10(ב)(4) לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — זיהוי מסוף / כתובת IP
- **File:line:** `backend/prisma/schema.prisma:193` (AuditLog model); `backend/src/modules/audit/audit.service.ts:5`
- **Problem:** `AuditLog` table has: `id, user_id, action, entity_type, entity_id, metadata, branch_id, created_at` — no `ip_address` or `user_agent` columns. IP captured only for login/logout via freeform metadata JSON; absent from all GUEST_READ, GUEST_UPDATE, GUEST_DELETE, GUEST_DOCUMENT_READ events. HIGH security level requires the terminal/IP to be recorded for every data access.
- **Fix:** Add `ipAddress VARCHAR(45)` and `userAgent VARCHAR(500)` to `audit_logs` table. Thread request IP from controller `@Req()` into every `audit.log()` call.

---

### [PRIV-H07] `addDocument` and `getDocuments` Not Audit-Logged

- **LAW:** תקנה 10 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017
- **File:line:** `backend/src/modules/guests/guests.service.ts:201` (addDocument), `:220` (getDocuments)
- **Problem:** Both operations involve government-issued document numbers — the most sensitive data in the system — yet leave no compliance trace in the audit log. `addDocument` creates rows in `guest_documents` (document type, number, issuing country, expiry) with no audit entry. `getDocuments` retrieves all identity documents with no audit entry.
- **Fix:** Add `await this.audit.log({ action: 'GUEST_DOCUMENT_CREATE' })` and `action: 'GUEST_DOCUMENT_READ'` at end of each method respectively.

---

### [PRIV-H08] Raw Guest Portal Access Token Written to Application Logs

- **LAW:** תקנה 10 + תקנה 14 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — הגנה על אמצעי גישה
- **File:line:** `backend/src/modules/guest-portal/guest-portal.service.ts:66`
- **Problem:** `this.logger.log(`Portal link generated for reservation ${reservationId}: ${portalUrl}`)` writes the full portal URL including the raw 32-byte access token to application logs. This token is the sole authentication credential for the guest portal: it grants unauthenticated access to fullName, email, phone, passportId, and payment page. The token is correctly stored as SHA-256 hash in DB — but logging the raw value completely undoes that protection. Any log reader, SIEM, or log shipper has a valid guest portal session credential.
- **Fix:** Log only: `` `Portal link generated for reservation ${reservationId}, expires ${expiresAt.toISOString()}` `` — omit the token entirely.

---

### [PRIV-H09] Guest PII Transmitted to n8n With No Authentication and Potentially Over Plain HTTP

- **LAW:** תקנה 14 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — הצפנת ערוצי תקשורת; חובת DPA עם מעבדי מידע
- **File:line:** `backend/src/modules/notifications/n8n.service.ts:6,19-38`; `backend/src/config/env.validation.ts:1-21`
- **Problem:** `N8N_BASE_URL` defaults to `http://n8n:5678` and is not validated to require HTTPS. Six event types (`reservation.confirmed`, `checkin.completed`, `checkout.completed`, `payment.succeeded/failed`, `refund.processed`) POST `guestName` + `guestEmail` as fire-and-forget HTTP POST with no authentication headers. If n8n runs externally, guest PII travels unencrypted without auth. No DPA with the n8n service operator documented anywhere.
- **Fix:** (1) Add `N8N_BASE_URL: Joi.string().uri({ scheme: ['https'] }).required()` to production env validation. (2) Add a shared-secret authentication header to all n8n webhook calls. (3) Execute a DPA with the n8n deployment operator.

---

### [PRIV-H10] Guest PII Transmitted to Resend (US) Without Documented DPA or Adequacy Basis

- **LAW:** תקנות הגנת הפרטיות (העברת מידע אל מחוץ לגבולות המדינה) תשס"א-2001; סעיף 36ב לחוק (תיקון 13)
- **File:line:** `backend/src/modules/guest-portal/guest-portal.service.ts:77-95`; `backend/src/modules/billing/pdf/invoice-pdf.service.ts:203-214`
- **Problem:** Both call `https://api.resend.com/emails` — a US-hosted SaaS, transmitting guest `fullName`, portal bearer token URL, and invoice financial data. The US is not on Israel's adequacy list. No DPA, Standard Contractual Clauses, or binding corporate rules referenced in codebase or documentation.
- **Fix:** Execute a DPA with Resend under Israeli law requirements (or substitute with a provider in an adequate country). Document the cross-border transfer in records of processing activities.

---

### [PRIV-H11] No Database Registration (רישום מאגר מידע) and No Privacy Officer (ממונה)

- **LAW:** פרק ג לחוק הגנת הפרטיות — סעיפים 8-17ב — חובת רישום מאגר הכולל מידע רגיש; תיקון 13 סעיף 12ד — מינוי ממונה
- **File:line:** `backend/prisma/schema.prisma:146-172` (Guest model)
- **Problem:** The system stores passportId, dateOfBirth, nationality, fullName, email, phone — a database containing sensitive personal data qualifying for mandatory registration. No registration certificate, privacy officer designation, or reference to the Israeli Privacy Protection Authority (רשם מאגרי מידע) exists anywhere in the codebase, documentation, or project governance. Operating such a database without registration is an ongoing administrative offense.
- **Fix (requires human decision):** Legal/compliance team must assess registration obligation under Chapter C of the Privacy Protection Law, appoint a privacy officer if threshold criteria are met, and document the outcome.

---

### [PRIV-H12] NotificationService Stub Logs Guest Email Address and Full Email Body to Application Log

- **LAW:** תקנה 10 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — לוגים אינם רשאים לכלול מידע אישי
- **File:line:** `backend/src/modules/notifications/notification.service.ts:15`
- **Problem:** `` `[STUB] Email to ${options.to}: ${options.subject}\n${options.body}` `` — `options.to` is the guest email; `options.body` contains guest name, reservation details, portal access links. This is the only notification implementation and fires in production on every reservation creation. Application logs typically flow to SIEM/APM with no field-level access controls.
- **Fix:** Replace log line with: `` `[STUB] Email queued, subject: ${options.subject.slice(0,30)}` `` — no recipient address or body.

---

## Medium Findings

### [PRIV-M01] `GUEST_UPDATE` Audit Entry Does Not Capture Changed Field Values

- **LAW:** תקנה 10 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — רישום שינויים
- **File:line:** `backend/src/modules/guests/guests.service.ts:183`
- **Problem:** GUEST_UPDATE audit log records only entity ID and actor — not which fields changed or before/after values. Changing a guest's passport ID or date of birth leaves a log entry with no forensic value. The `metadata` JSON column exists and could carry this data.
- **Fix:** Before update, read existing values. After update, diff against DTO. Pass `metadata: { old: oldData, new: changedFields }` to audit log call.

---

### [PRIV-M02] `OnlineCheckIn` Table Duplicates PII Already in `guests` Table

- **LAW:** תקנה 3(א) לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — עקרון מינימום מידע
- **File:line:** `backend/prisma/schema.prisma:522` (OnlineCheckIn model)
- **Problem:** `online_check_ins` stores its own `fullName`, `passportId`, `email`, `phone` — all of which already exist on the linked `Guest` record via `guestId` FK. Creates a second copy of the most sensitive identity data. Any erasure workflow must find and update two tables; an incomplete erasure leaves passport ID accessible in `online_check_ins` even after the `guests` row is anonymized.
- **Fix:** Remove duplicated columns from `OnlineCheckIn`; read them from the related `Guest` record via JOIN when needed. Keep only data unique to the check-in event (`estimatedArrivalTime`, `specialRequests`, `completedAt`).

---

### [PRIV-M03] `DATABASE_URL` Not Validated to Require SSL/TLS in Production

- **LAW:** תקנה 14 לתקנות הגנת הפרטיות (אבטחת מידע) תשע"ז-2017 — הצפנת ערוצי תקשורת
- **File:line:** `backend/src/config/env.validation.ts:8`
- **Problem:** Joi validation requires `DATABASE_URL` to be a non-empty string but imposes no `sslmode=require` constraint. Guest PII traverses the application-to-database network path without guaranteed encryption in production.
- **Fix:** Add a Joi `.custom()` validator checking `DATABASE_URL` contains `sslmode=require` when `NODE_ENV === 'production'`.

---

### [PRIV-M04] Guest PII Transmitted to n8n Without Data Processing Agreement Disclosures to Guests

- **LAW:** סעיף 8 לחוק הגנת הפרטיות (תיקון 13) — מסירת מידע למעבד צד שלישי מחייב הסכם מחייב
- **File:line:** `backend/src/modules/notifications/n8n.service.ts:19-38` (trigger sites: reservations, check-in, billing)
- **Problem:** Six n8n webhook events transmit `guestName` and `guestEmail` to the n8n automation platform. Guests are not informed in any privacy notice that their name and email are shared with an automation platform. If n8n is a cloud instance, this is an undisclosed third-party transfer.
- **Fix:** Disclose n8n processing in privacy notice (linked to PRIV-H03 fix). If n8n is internal to the same entity, document it as internal processing. If external, execute a DPA.

---

## N/A Findings

- **AI/ML processing:** No AI, LLM, ML, or automated profiling found in `backend/src/`. All decisions (reservation, check-in, payment) are synchronous human-triggered CRUD. No external AI API calls, no training pipelines, no recommendation logic. Keywords searched: `openai`, `gpt`, `claude`, `llm`, `ml`, `tensorflow`, `profiling`, `predict`, `recommend` — zero matches.

---

## Finding-to-Modality Cross-Reference

| Finding | Also in |
|---|---|
| PRIV-C01 (soft-delete) | E2E-001 (runtime confirmed), SOFTWARE report |
| PRIV-C03 (hardcoded email) | (new — not in prior reports) |
| PRIV-C04 (TLS disabled) | INFRA-SEC-004 (NODE_TLS_REJECT_UNAUTHORIZED) |
| PRIV-C06 (keys in compose) | INFRA-SEC-001 (RESEND_API_KEY committed), INFRA-SEC-002 (N8N_ENCRYPTION_KEY) |
| PRIV-H08 (token in logs) | RUNTIME-CONFIRM C5 (portal token confirmed reachable) |

---

*Modality 5 of 7 — Israeli Privacy Compliance. Generated by manual privacy-auditor agent run (NetFree filter bypassed by direct agent invocation without skill hook).*
