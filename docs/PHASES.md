# Hotel Management System — Development Phases

> מסמך זה מגדיר את רצף הפאזות. פירוט מלא לכל פאזה — ראה `docs/phases/PHASE-{NN}-{name}.md`.
> סטטוס פעיל — ראה `PROJECT_STATUS.md`.

---

## סדר פאזות

| # | שם | Doc | תלות |
|---|---|---|---|
| 0 | Project Setup | `PHASE-00-setup.md` | — |
| 1 | Auth, Users & Branches | `PHASE-01-auth.md` | Phase 0 |
| 2 | Rooms Module | `PHASE-02-rooms.md` | Phase 1 |
| 3 | Guests Module | `PHASE-03-guests.md` | Phase 1 |
| 4 | Availability Engine | `PHASE-04-availability.md` | Phase 2 |
| 5 | Reservations System | `PHASE-05-reservations.md` | Phase 3 + **Phase 4** (חובה) |
| 6 | Check-in / Check-out | `PHASE-06-checkin-checkout.md` | Phase 5 |
| 7 | Billing & Payments | `PHASE-07-billing.md` | Phase 6 |
| 8 | Guest Portal | `PHASE-08-guest-portal.md` | Phase 7 |
| 9 | Housekeeping Module | `PHASE-09-housekeeping.md` | Phase 2 |
| 10 | Dashboard & Reporting | `PHASE-10-dashboard.md` | Phase 5 + Phase 7 |
| 11 | Security Audit & Hardening | `PHASE-11-security.md` | Phase 10 |
| 12 | Production Deployment | `PHASE-12-deployment.md` | Phase 11 |

---

## כלל ברזל

**לא מתחילים Phase N+1 לפני שכל exit criteria של Phase N עברו.**

---

## שרשרת תלויות

```
Phase 0 (Setup)
  └── Phase 1 (Auth + Branches)
        ├── Phase 2 (Rooms)
        │     └── Phase 4 (Availability) ← חובה לפני Phase 5
        │           └── Phase 5 (Reservations)
        │                 └── Phase 6 (Check-in/out)
        │                       └── Phase 7 (Billing)
        │                             └── Phase 8 (Guest Portal)
        │
        └── Phase 3 (Guests) ← נדרש גם לפני Phase 5
        └── Phase 9 (Housekeeping) ← תלוי Phase 2 בלבד, יכול לרוץ מוקדם
```

Phase 10 (Dashboard) מתחיל אחרי Phase 5 + Phase 7 — מצריך נתוני הזמנות ותשלומים.

---

## Stack מאושר

| רכיב | טכנולוגיה |
|------|-----------|
| Backend | NestJS 11, TypeScript strict, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | Next.js 16 (App Router), TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui |
| Auth | JWT (HttpOnly cookie), bcrypt rounds≥12, RBAC |
| Real-time | WebSockets (socket.io) |
| Payments | Stripe (primary) + Tranzila — מאחורי PaymentService abstraction |
| Email | NotificationService (SendGrid או AWS SES) |

**לא מאושר:** Firebase Auth, PHP, WordPress, low-code, microservices ב-MVP.

---

## Mapping ל-ARCHITECTURE.md

| ARCHITECTURE.md Phase | Phases שלנו |
|---|---|
| Phase 1: Platform Foundation | Phase 0 + Phase 1 |
| Phase 2: Core Hotel Operations | Phases 2–6 |
| Phase 3: Financial Operations | Phase 7 |
| Phase 4: Guest Portal | Phase 8 |
| Phase 5: Reporting & Dashboards | Phase 10 |
| Phase 6: Operational Stabilization | Phases 11–12 |

---

## שינויים ממסמך ישן

> מסמך PHASES.md הוחלף ב-2026-05-31. הגרסה הישנה הכילה:
> - 9 פאזות (0–9) — לא תואמות את PROJECT_STATUS.md (13 פאזות)
> - אזכור Firebase Auth — **לא מאושר** (ראה ARCHITECTURE.md §2.5)
> - חוסר Availability Engine כפאזה נפרדת
> - חוסר Housekeeping, Guest Portal, Security, Deployment כפאזות
>
> הגרסה הנוכחית מיושרת עם ARCHITECTURE.md + PROJECT_STATUS.md.
