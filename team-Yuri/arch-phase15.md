# Architect Phase 15 — Public Booking Portal

## Phase Identifier
PHASE=15

## Status
STATUS: IN PROGRESS

## Scope
דף ראשי ציבורי (`/book`) לרשת המלונות — גילוי סניפים + הזמנה עצמאית ללא צוות.
כולל: endpoint חדש ברשימת סניפים, עמוד ראשי מעוצב, שיפור header.

---

## מה קיים (Phase 15 קודם)

| רכיב | מצב |
|---|---|
| `GET /api/public/branches/:branchId` | ✅ קיים |
| `GET /api/public/branches/:branchId/room-types` | ✅ קיים |
| `GET /api/public/branches/:branchId/availability` | ✅ קיים |
| `POST /api/public/branches/:branchId/reservations` | ✅ קיים |
| `/book/[branchId]` — דף נחיתה לסניף | ✅ קיים |
| `/book/[branchId]/rooms` — בחירת חדר | ✅ קיים |
| `/book/[branchId]/checkout` — טופס אורח | ✅ קיים |
| `/book/[branchId]/confirmation` — אישור | ✅ קיים |

---

## מה נוסף (תוספת נוכחית)

### Backend — endpoint חדש

**`GET /api/public/branches`** — רשימת כל הסניפים הפעילים

- Controller: `@Controller('public/branches')` נפרד (ללא `:branchId`)
- רשום לפני ה-controller הקיים ב-module (static path לפני dynamic)
- מחזיר: `id, name, address, phone, description, coverPhoto, amenities, minPrice`
- `minPrice` = `MIN(room_types.base_price)` per branch (raw query או Prisma aggregation)
- Auth: ללא (public)
- Rate limit: ברירת מחדל (ירש מ-ThrottlerModule)

**קבצים:**
- `backend/src/modules/public-booking/public-booking.service.ts` — מתודה `listBranches()`
- `backend/src/modules/public-booking/public-booking.controller.ts` — controller חדש בראש הקובץ
- `backend/src/modules/public-booking/public-booking.module.ts` — רישום controller חדש

### Frontend — עמוד ראשי

**`app/(booking)/book/page.tsx`** — חדש

מבנה הדף:
1. **Hero banner** — gradient `from-[#1E3A8A] to-[#1e40af]`, כותרת רשת, תת-כותרת
2. **Date search bar** — `checkIn` + `checkOut` + כפתור חפש; מעביר תאריכים ל-URL של כרטיסים
3. **Grid כרטיסי מלון** — `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
4. **Footer** — זכויות + לינקים

**כרטיס מלון:**
- תמונת cover (h-52, object-cover) + fallback gradient אם אין תמונה
- שם, כתובת → Google Maps, תיאור (line-clamp-2)
- Amenity chips (עד 3 + "+N נוספים")
- מחיר: `מ-₪{minPrice} ללילה` + כפתור `לפרטים →` → `/book/[branchId]?checkIn=...&checkOut=...`
- Skeleton loading (pulse animation) בזמן טעינה

**`app/(booking)/layout.tsx`** — שיפור header:
- שמאל: `🏨 רשת מלונות` bold primary → לינק ל-`/book`
- ימין: `כניסה לצוות` → `/login`

**`lib/api/public-booking.ts`** — הוספה:
```typescript
interface PublicBranchSummary {
  id: string; name: string; address: string;
  phone: string | null; description: string | null;
  coverPhoto: string | null; amenities: string[]; minPrice: number | null;
}
listBranches: () => publicFetch<PublicBranchSummary[]>('/api/public/branches')
```

---

## קבצים שמשתנים

| קובץ | פעולה |
|---|---|
| `backend/src/modules/public-booking/public-booking.service.ts` | הוספת `listBranches()` |
| `backend/src/modules/public-booking/public-booking.controller.ts` | controller חדש |
| `backend/src/modules/public-booking/public-booking.module.ts` | רישום |
| `frontend/lib/api/public-booking.ts` | `PublicBranchSummary` + `listBranches()` |
| `frontend/app/(booking)/layout.tsx` | שיפור header |
| `frontend/app/(booking)/book/page.tsx` | **חדש** |

---

---

## תוספת: קיבולת נפרדת לסוג חדר (Phase 15b)

### סכמה
הוספה ל-`room_types`:
```
max_adults   Int?   -- מקסימום מבוגרים (null = ללא הגבלה נפרדת)
max_children Int?   -- מקסימום ילדים (null = ללא הגבלה נפרדת)
```
מיגרציה: `20260719000017_phase15_room_type_occupancy_limits`

### שינויי קוד
| שכבה | קובץ | שינוי |
|---|---|---|
| Schema | `prisma/schema.prisma` | `maxAdults`, `maxChildren` |
| Migration | `prisma/migrations/20260719000017_*/migration.sql` | ADD COLUMN |
| Backend DTO | `room-types/dto/create-room-type.dto.ts` | שדות אופציונליים |
| Backend DTO | `room-types/dto/update-room-type.dto.ts` | שדות אופציונליים |
| Backend Service | `room-types/room-types.service.ts` | create + update |
| Public Service | `public-booking/public-booking.service.ts` | select |
| Frontend API | `lib/api/public-booking.ts` | `PublicRoomType` interface |
| Frontend API | `lib/api/rooms.ts` | `RoomType`, `CreateRoomTypePayload`, `UpdateRoomTypePayload` |
| Admin UI | `(dashboard)/room-types/page.tsx` | 2 שדות בטופס יצירה + עריכה |
| Public booking | `(booking)/book/[branchId]/rooms/page.tsx` | סינון מורחב |

### לוגיקת סינון
```typescript
// maxOccupancy = גג כולל תמיד
if (rt.maxOccupancy < adults + children) return false;
// maxAdults/maxChildren — נאכף רק אם מוגדר
if (rt.maxAdults != null && rt.maxAdults < adults) return false;
if (rt.maxChildren != null && rt.maxChildren < children) return false;
```

### טופס חיפוש ציבורי
- `/book` — dropdown מבוגרים (1–9) + dropdown ילדים (0–9)
- `/book/[branchId]` — 4 שדות: הגעה, עזיבה, מבוגרים, ילדים
- `/book/[branchId]/rooms` — כותרת מציגה `2 מבוגרים + 1 ילדים`; הודעה ברורה אם אין חדרים מתאימים

---

## out of scope
- מפה אינטראקטיבית
- סינון/מיון סניפים
- עמוד אודות / צור קשר

---

## תוספת: filter bar + דף פרטי חדר (Phase 15c)

### רשימת חדרים — `/book/[branchId]/rooms`
- **Filter bar** — select סוג מיטה (נגזר מ-data, לא hardcoded) + כפתור × איפוס + select מיון מחיר
- **URL params** כ-single source of truth: `bedType`, `sort`, `checkIn`, `checkOut`, `adults`, `children`
- `setParam(key, value)` → `router.replace` (שמירת scroll, history entry אחד)
- `useMemo` לסינון וסידור — ללא קריאת API נוספת
- כרטיס RoomCard: כפתור "פרטים" (outline) + "הזמן עכשיו" (accent)
- לחיצה "פרטים" → `/book/[branchId]/rooms/[roomTypeId]?${currentParams}` (כל ה-params)

### דף פרטי חדר — `/book/[branchId]/rooms/[roomTypeId]`
**חדש לחלוטין**

| אלמנט | פרטים |
|---|---|
| כפתור חזרה | `← כל החדרים` → `backUrl = /book/${branchId}/rooms?${sp.toString()}` — שומר כל הפילטרים |
| גלריה | grid 1/2/3 עמודות; תמונה ראשונה spans 2×2 כשיש 3+ תמונות |
| Lightbox | לחיצה על תמונה → מסך מלא; חצי מקלדת (ArrowLeft/Right/Esc); dots + counter |
| Badge זמינות | ירוק ✓ / אדום ✗ |
| Chips | maxOccupancy, maxAdults (אם מוגדר), maxChildren (אם מוגדר), bedType, roomSize |
| תיאור | כרטיס לבן עם border |
| אמניות | grid 2/3 עמודות עם ✓ ירוק |
| Sticky bar | fixed bottom — מחיר ללילה + סה"כ (nights × price) + "הזמן עכשיו" / "אין זמינות" |
| `pb-28` | על התוכן למניעת חפיפה עם sticky bar |

**RTL — lightbox:** חץ ימין (›) = תמונה קודמת, חץ שמאל (‹) = הבאה (מכיוון קריאה RTL)

### קובץ חדש
- `frontend/app/(booking)/book/[branchId]/rooms/[roomTypeId]/page.tsx`

---

## אימות
1. `GET /api/public/branches` מחזיר 3 סניפים עם minPrice
2. `/book` מציג 3 כרטיסים עם תמונות, כתובות, מחירים
3. לחיצה על "לפרטים" → `/book/[branchId]` (עם תאריכים אם נבחרו)
4. RTL תקין, hover effects, skeleton loading
5. Filter bar — סינון/מיון משנה URL בלבד, back button חוזר עם פילטרים
6. דף פרטים — lightbox, chips, sticky bar, חזרה עם כל ה-params
