# Security Fix Plan — Hotel Management System — 2026-07-19

> Based on: SOFTWARE-SECURITY-FINDINGS.md · INFRA-SECURITY-FINDINGS.md · SERVER-HARDENING-FINDINGS.md · E2E-SECURITY-FINDINGS.md  
> Status: WAVES B+C+D(partial) COMPLETE — see completion notes per item below.

---

## גל A — דחוף / אין קוד (rotate secrets)

> פעולה ידנית ע"י מפעיל — לבצע לפני כל תיקון קוד.

| # | ממצא | פעולה | מקור |
|---|---|---|---|
| A1 | `RESEND_API_KEY` + `N8N_ENCRYPTION_KEY` ב-git history (commit `66b918a`) | **ROTATE** ב-Resend dashboard + n8n settings | INFRA INF-001, INF-002 |
| A2 | Stripe, Anthropic, Groq, Cohere, Google AI, SendGrid API keys חיים ב-`.env` | **ROTATE** בכל dashboard | INFRA secrets-config |
| A3 | `JWT_SECRET`, `JWT_REFRESH_SECRET` ב-`backend/.env` + `backend/.env.test` | **ROTATE** | INFRA INF-006, INF-008 |
| A4 | `POSTGRES_PASSWORD` ב-`docker-compose.yml` + `.env` | **ROTATE** | INFRA INF-007 |

---

## גל B — קריטי / קוד

> ~10 תיקונים. PR אחד. שבוע 1.

| # | ממצא | קובץ:שורה | תיקון |
|---|---|---|---|
| B1 | JWT ב-localStorage — XSS readable | `frontend/lib/api/auth.ts:44-46` | מחק `localStorage.setItem('auth_token', …)` + `getItem`. תסתמך על HttpOnly cookie. | ✅ DONE |
| B2 | JWT ב-response body — readable by JS | `backend/src/modules/auth/auth.controller.ts` login handler | הסר `accessToken` מה-response. Cookie בלבד. | ✅ DONE |
| B3 | אין rate-limit בלוגין — brute-force פתוח | `backend/src/main.ts` + `auth.controller.ts` | הוסף `@nestjs/throttler`: max 10 / 15 min / IP. Return `Retry-After` ב-429. | ✅ DONE |
| B4 | `NODE_TLS_REJECT_UNAUTHORIZED=0` — TLS עיוור | `docker-compose.yml:86,115` | הסר מ-backend ו-n8n. `ca-certificates` כבר מותקן ב-Alpine. | ✅ DONE |
| B5 | PostgreSQL port 5432 על 0.0.0.0 | `docker-compose.yml: postgres.ports` | מחק `ports:` stanza. הוסף `expose: ["5432"]`. | ✅ DONE |
| B6 | n8n port 5678 על 0.0.0.0 | `docker-compose.yml: n8n.ports` | מחק `ports:` stanza. | ✅ DONE |
| B7 | Backend container כ-root | `backend/Dockerfile.dev` | `RUN addgroup -S app && adduser -S app -G app` + `USER app` לפני `CMD`. | ✅ DONE |
| B8 | Frontend container כ-root | `frontend/Dockerfile.dev` | כנ"ל. | ✅ DONE |
| B9 | Feedback endpoint — אין guard + token hash שגוי | `feedback.controller.ts:14`, `feedback.service.ts:15` | controller: `@UseGuards(GuestTokenGuard)`. Service: `crypto.createHash('sha256').update(token).digest('hex')` לפני query. | ✅ DONE |
| B10 | Stripe webhook — חתימה לא נבדקת | `billing/payment.service.ts:249` | `stripe.webhooks.constructEvent(payload, sig, secret)` — return 400 אם כשל. | ✅ כבר היה מתוקן (Phase 11) |

---

## גל C — סיכון גבוה / קוד

> ~11 תיקונים. PR אחד. שבוע 2.

| # | ממצא | קובץ:שורה | תיקון |
|---|---|---|---|
| C1 | Guest portal — אין בדיקת `purpose` | `guest-token.guard.ts:17` | הוסף `@Purpose('view')` decorator + `guard.assertPurpose(payload, required)`. | ✅ כבר היה מתוקן (Phase 11) |
| C2 | IDOR ב-guest portal — sendPortalLink/listTokens ללא branch check | `guest-portal.service.ts:98,107` | `assertBranchAccess(reservation.branchId, user)` לפני כל פעולה. | ✅ כבר היה מתוקן (Phase 11) |
| C3 | PII ל-Cohere API — שמות אורחים בפרומפטים | `nl-reports.service.ts:56`, `daily-digest.service.ts:70`, `staff-reminder.service.ts:62` | החלף שמות ב-`guest_${index+1}` לפני בניית prompt. | ✅ DONE |
| C4 | Plain-object DTO ב-billing — validation מדולגת | `billing.controller.ts:175,210` | צור `ApplyDiscountDto` + `UpsertCatalogEntryDto` עם class-validator. | ✅ DONE |
| C5 | `@MaxLength` חסר ב-feedback comment | `feedback.dto.ts:10` | הוסף `@MaxLength(2000)`. | ✅ DONE |
| C6 | `@MaxLength` חסר ב-specialRequests | `online-check-in.dto.ts:28` | הוסף `@MaxLength(2000)`. | ✅ DONE |
| C7 | `@IsInt() @Min(0)` חסר — type coercion ב-availability | `get-availability.dto.ts:18,20` | `@Type(() => Number) @IsInt() @Min(0)` ל-`floor` ו-`maxOccupancy`. | ✅ DONE |
| C8 | PII ב-audit logs — ערכים לפני/אחרי | `guests.service.ts:209-224` | לוג שמות שדות בלבד: `changedFields: ['passportId']`, לא ערכים. | ✅ DONE |
| C9 | Cookie Secure flag חסר בפרודקשן | `auth.controller.ts:27` | ודא `Secure` flag על set-cookie (מחייב TLS — ראה D2). | ⏳ ממתין ל-D2 (TLS) |
| C10 | Password reset token ב-URL — נשמר ב-logs | `auth.service.ts:176` | token ב-URL path segment, לא query string. | ✅ DONE |
| C11 | IDOR ב-housekeeping schedule — branchId ללא בדיקה | `housekeeping.controller.ts:83` | `assertBranchAccess(branchId, user)`. | ✅ DONE |

---

## גל D — הקשחת infra

> ~10 שינויים. PR אחד. שבוע 3-4.

| # | ממצא | תיקון |
|---|---|---|
| D1 | אין reverse proxy | nginx service ב-compose. Backend/frontend → `expose:` בלבד. | ⏳ נדחה — PR נפרד |
| D2 | אין TLS | nginx עם certbot / Caddy עם Let's Encrypt. | ⏳ נדחה — תלוי ב-D1 |
| D3 | Security headers חסרים ב-Next.js | `next.config.ts`: `async headers()` עם `X-Frame-Options`, `X-Content-Type-Options`, `CSP`, `Referrer-Policy`. | ✅ DONE |
| D4 | Helmet ב-backend ללא HSTS | אחרי TLS — `hsts: { maxAge: 31536000 }` + CSP. | ⏳ נדחה — תלוי ב-D2 |
| D5 | Docker socket ב-autoheal ללא `:ro` | שקול `restart: unless-stopped` במקום autoheal. | ⏳ נדחה — החלטה ארכיטקטורית |
| D6 | Health endpoint חושף גרסה+uptime | הסר `version` + `uptime` מ-public response. | ✅ DONE |
| D7 | אין resource limits | `deploy.resources.limits.memory` + `pids_limit` לכל service. | ✅ DONE |
| D8 | Image tags floating (`latest`) | נעל: `n8nio/n8n@sha256:...`, `willfarrell/autoheal@sha256:...`, `node:20.19.1-alpine3.21` | ✅ DONE |
| D9 | frontend `.dockerignore` חלקי | הוסף `.env`, `.env.*`, `!.env.example`. | ✅ DONE |
| D10 | אין secret scanning ב-CI | `gitleaks/gitleaks-action` כ-early CI step. | ✅ DONE |

---

## סדר ביצוע

```
גל A  →  מיידי (rotate secrets — ידני, לפני כל קוד)
גל B  →  שבוע 1 (critical code — 10 תיקונים)
גל C  →  שבוע 2 (risk reduction — 11 תיקונים)
גל D  →  שבוע 3-4 (infra hardening — 10 שינויים)
```

## כיסוי

| גל | 🔴 מכוסים | 🟡 מכוסים |
|---|---|---|
| A | 4 (secrets) | — |
| B | 10 | 2 |
| C | 5 | 7 |
| D | — | 7 |
| **סה"כ** | **19 / 31** | **16 / 47** |

---

*תכנית נבנתה ב-2026-07-19. לא תוקן שום קוד עד לאישור.*
