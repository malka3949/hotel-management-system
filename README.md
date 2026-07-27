# Hotel Management System

מערכת ניהול מלון מלאה — backend, dashboard לצוות, פורטל אורחים, ופורטל הזמנה ציבורי.

**הדגמה חיה:** https://hotel-management-frontend-737c.onrender.com

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Backend | NestJS + TypeScript, Prisma ORM, PostgreSQL, Redis |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind v4 |
| Auth | JWT (HttpOnly cookie) + CSRF double-submit |
| Real-time | Socket.IO (WebSocket) |
| AI | Cohere (NLP, סנטימנט, תמצות) |
| Deployment | Render (backend + frontend + DB + Redis) |
| Monitoring | Sentry |

---

## פיצ'רים עיקריים

- **ניהול מלון מלא** — חדרים, סוגי חדרים, אורחים, הזמנות, צ'ק-אין/צ'ק-אאוט, חשבוניות
- **רב-סניפי** — מנהל רשת רואה כל הסניפים; כל שאר התפקידים מוגבלים לסניף שלהם
- **לוח סטטוס חדרים בזמן אמת** — WebSocket, מתעדכן אוטומטית
- **ניקיון** — ניהול משימות ניקיון לחדרניות
- **פורטל אורחים** — גישה מאובטחת ללא סיסמה (קישור מאומת), תשלום, ביטול, chat עם קונסיירז' AI
- **פורטל הזמנה ציבורי** — אורחים יכולים להזמין ישירות ב-`/book/:branchId`
- **דוחות ו-AI** — דוח גביה, ניתוח ביקורות, תקציר יומי, הצעת שדרוג חדר
- **ביקורת אבטחה** — bcrypt 12, rate limiting, audit log (append-only), HTTPS, Helmet

---

## תפקידים

| תפקיד | הרשאות |
|-------|--------|
| `chain_admin` | גישה לכל הסניפים, ניהול משתמשים ומשתמשים |
| `hotel_manager` | ניהול מלא בסניף אחד |
| `receptionist` | הזמנות, צ'ק-אין/אאוט, אורחים |
| `housekeeping` | ניהול משימות ניקיון |

---

## הרצה מקומית

### דרישות מוקדמות
- Docker + Docker Compose
- Node.js 20+

### התקנה

```bash
# שכפול הפרויקט
git clone <repo-url>
cd hotel-management-system

# עתק קבצי env
cp backend/.env.example backend/.env
cp frontend/.env.production.example frontend/.env.local
# ערוך את הערכים הנדרשים

# הפעל services
make dev

# הרץ migrations
make migrate

# Seed נתוני דוגמה
make seed
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001/api/health

### משתמשי seed

| אימייל | סיסמה | תפקיד |
|--------|--------|--------|
| `admin@hotel.com` | `Admin1234!` | chain_admin |
| `manager@hotel.com` | `Manager1234!` | hotel_manager |
| `receptionist@hotel.com` | `Recep1234!` | receptionist |

---

## פקודות Makefile

```bash
make dev          # הפעל Docker Compose (DB + Redis + backend)
make stop         # עצור
make migrate      # הרץ Prisma migrations
make seed         # Seed נתוני דוגמה
make logs         # לוגים של backend
make studio       # פתח Prisma Studio
```

---

## משתני סביבה

### Backend (`backend/.env`)

| משתנה | תיאור |
|-------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | סוד לחתימת access tokens (≥32 תווים) |
| `JWT_REFRESH_SECRET` | סוד לחתימת refresh tokens |
| `FRONTEND_URL` | כתובת ה-frontend (לـCORS) |
| `RESEND_API_KEY` | שליחת אימיילים (אופציונלי) |
| `COHERE_API_KEY` | AI features (אופציונלי) |

### Frontend (`frontend/.env.local`)

| משתנה | תיאור |
|-------|--------|
| `NEXT_PUBLIC_API_URL` | כתובת ה-API (`/api` למקומי, URL מלא ב-production) |

---

## ארכיטקטורה

```
hotel-management-system/
├── backend/              # NestJS API
│   ├── src/modules/      # מודולים: auth, rooms, guests, reservations, ...
│   ├── prisma/           # Schema + migrations + seed
│   └── test/             # Integration tests (e2e)
├── frontend/             # Next.js App Router
│   ├── app/(dashboard)/  # ממשק צוות
│   ├── app/(portal)/     # פורטל אורחים
│   ├── app/(booking)/    # פורטל הזמנה ציבורי
│   └── lib/              # API clients, Zustand stores, hooks
├── docs/                 # מסמכי ארכיטקטורה ופאזות
├── team-Yuri/            # מסמכי פיתוח פאזה
├── nginx/                # Nginx config (production)
├── docker-compose.yml    # DB + Redis + backend
└── render.yaml           # הגדרות Render deployment
```

---

## Deployment (Render)

הפרויקט מוגדר ב-`render.yaml`:
- **PostgreSQL** — `hotel-management-db`
- **Redis** — `hotel-management-redis`
- **Backend** — `hotel-management-backend` (NestJS, Docker)
- **Frontend** — Next.js (SSR/SSG)

שני ה-services עוקבים אחרי branch `develop` עם `autoDeploy: yes`.

---

## פאזות פיתוח

| פאזה | תיאור | סטטוס |
|------|--------|--------|
| 0 | Project Setup | ✅ |
| 1 | Auth, Users & Branches | ✅ |
| 2 | Rooms Module | ✅ |
| 3 | Guests Module | ✅ |
| 4 | Availability Engine + WebSocket | ✅ |
| 5 | Reservations System | ✅ |
| 6 | Check-in / Check-out | ✅ |
| 7 | Billing & Payments | ✅ |
| 8 | Guest Portal | ✅ |
| 9 | Housekeeping Module | ✅ |
| 10 | Dashboard & Reporting | ✅ |
| 11 | Security Audit & Hardening | ✅ |
| 12 | Production Deployment | ✅ |
| 13 | AI Features | ✅ |
| 14 | AI Extended Features | ✅ |
| 15 | Public Booking Portal | ✅ |
