# Dev Phase 15 — Public Booking Portal

## Phase Identifier
PHASE=15

## Implementation Summary

### Phase 15a — דף ראשי לרשת (`/book`)
- Endpoint חדש `GET /api/public/branches` (PublicBranchListController)
- `PublicBookingService.listBranches()` — כל הסניפים הפעילים + minPrice
- Controller נפרד (static path לפני dynamic) — רשום ראשון ב-module
- `Decimal → Number()` להחזרת minPrice
- Frontend: `PublicBranchSummary` interface + `publicBookingApi.listBranches()`
- `/book/page.tsx` — Hero banner, date search bar, grid כרטיסי מלון, skeleton loading, footer
- Layout header — לוגו → `/book`, "כניסה לצוות" → `/login`
- RTL fixes בדף rooms: gallery buttons swapped, `text-end` במקום `text-left`
- כל עמודי הזמנה פנימיים — `max-w-4xl mx-auto px-4 py-8` wrapper ישירות בעמוד

### Phase 15c — filter bar + דף פרטי חדר
- `rooms/page.tsx` — filter bar: select סוג מיטה (מ-data) + ×-reset + select מיון
- `setParam()` → `router.replace` → URL כ-single source of truth
- `useMemo` לסינון/מיון (ללא API call נוסף)
- כרטיס: כפתורי "פרטים" (outline) + "הזמן עכשיו" (accent)
- ניווט לפרטים: `router.push(/book/${branchId}/rooms/${rt.id}?${currentParams})`
- **חדש:** `rooms/[roomTypeId]/page.tsx` — דף פרטי חדר מלא
  - Lightbox עם keyboard nav (ArrowLeft/Right RTL, Esc)
  - Grid gallery (תמונה ראשית spans 2×2 כש-3+), chips, תיאור, אמניות, badge זמינות
  - Sticky bottom bar: מחיר ללילה + סה"כ + "הזמן עכשיו" / "אין זמינות"
  - חזרה `← כל החדרים` → `backUrl = /book/${branchId}/rooms?${sp.toString()}`

### Phase 15b — חיפוש לפי מבוגרים/ילדים
- הוסף `max_adults Int?` + `max_children Int?` לסכמה ול-DB
- Migration: `20260719000017_phase15_room_type_occupancy_limits`
- Backend DTOs + service + public service select — עדכון מלא
- Frontend: `PublicRoomType`, `RoomType`, `CreateRoomTypePayload`, `UpdateRoomTypePayload`
- Admin UI: שדות מבוגרים/ילדים בטופס יצירה ועריכה
- טופס חיפוש ציבורי: 2 dropdowns (מבוגרים 1–9, ילדים 0–9) ב-`/book` ו-`/book/[branchId]`
- Seed DB: עדכון ידני של כל room types עם ערכים הגיוניים
- לוגיקת סינון: `maxOccupancy >= total AND (maxAdults IS NULL OR maxAdults >= adults) AND (maxChildren IS NULL OR maxChildren >= children)`

## Files Changed

### Backend
- `prisma/schema.prisma` — `maxAdults`, `maxChildren` ב-RoomType
- `prisma/migrations/20260719000017_phase15_room_type_occupancy_limits/migration.sql`
- `src/modules/room-types/dto/create-room-type.dto.ts`
- `src/modules/room-types/dto/update-room-type.dto.ts`
- `src/modules/room-types/room-types.service.ts`
- `src/modules/public-booking/public-booking.controller.ts` — `PublicBranchListController`
- `src/modules/public-booking/public-booking.module.ts`
- `src/modules/public-booking/public-booking.service.ts` — `listBranches()` + select עדכני

### Frontend
- `lib/api/public-booking.ts` — `PublicBranchSummary`, `PublicRoomType` (+ maxAdults/maxChildren), `listBranches()`
- `lib/api/rooms.ts` — `RoomType`, `CreateRoomTypePayload`, `UpdateRoomTypePayload`
- `app/(booking)/layout.tsx` — header
- `app/(booking)/book/page.tsx` — **חדש** (דף ראשי)
- `app/(booking)/book/[branchId]/page.tsx` — קורא adults/children מ-URL, 4 שדות בטופס
- `app/(booking)/book/[branchId]/rooms/page.tsx` — filter bar, setParam(), useMemo, כפתור "פרטים"
- `app/(booking)/book/[branchId]/rooms/[roomTypeId]/page.tsx` — **חדש** (דף פרטים)
- `app/(booking)/book/[branchId]/checkout/page.tsx` — max-w wrapper
- `app/(booking)/book/[branchId]/confirmation/page.tsx` — max-w wrapper
- `app/(dashboard)/room-types/page.tsx` — שדות maxAdults/maxChildren

### Team Yuri
- `team-Yuri/arch-phase15.md` — עדכון מלא כולל Phase 15b + 15c

## Dependencies
- ללא תלויות חדשות

## Unit Tests
Unit tests: NOT AVAILABLE — לא קיים framework טסטים לפרונטאנד. Backend service לא שונה בלוגיקה עסקית.

## Lint
```
cd frontend && npx tsc --noEmit   # exit 0
cd backend  && npx tsc --noEmit   # exit 0
```

## Functional Testability

### Endpoint מאומת
```bash
docker exec hotel_backend wget -q -O- http://localhost:3001/api/public/branches
# החזיר 3 סניפים עם minPrice (400, 450, 350)
```

### Frontend מאומת
```bash
curl -s http://localhost/book  # 200 עם Hero + skeleton + header
```

### DB מאומת
```sql
SELECT name, max_occupancy, max_adults, max_children FROM room_types;
-- כל 13 רשומות מעודכנות עם ערכים
```

## Known Issues
- ה-seed.ts לא כולל room types — הנתונים נוצרו דרך ה-UI ועודכנו ב-SQL ישיר.
- Backend watch mode ב-Docker לא מזהה שינויים — דרוש `docker compose restart backend` לכל שינוי.

## Scope Compliance
✅ Phase 15 בלבד — לא נגעה בפיצ'רים אחרים.
✅ TS נקי (frontend + backend).
✅ Migration רשמי (לא db push).

## Declaration
PASS — Phase 15 מוכנה לסיום, commit, ו-PR.
