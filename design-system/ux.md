# Hotel Management System — UX Design Concepts

## Context

System: internal SaaS tool for hotel chain staff.
Users: receptionists, hotel managers, operations.
Language: Hebrew RTL.
Pattern: desktop-first, daily heavy use, task-oriented.

---

## Concept A — "Grand Hotel" (גרנד)

**Feeling:** 5-star hotel lobby. Rich, authoritative, trustworthy.
Think: Raffles, King David Hotel. The system looks as prestigious as the hotel it serves.

### Palette
| Role | Hex | Name |
|------|-----|------|
| Background | `#F5F0E8` | פרגמנט חם |
| Sidebar | `#1A2744` | נייבי עמוק |
| Surface | `#FFFEF9` | לבן חם |
| Primary action | `#1A2744` | נייבי |
| Accent / CTA | `#B8982C` | זהב |
| Border | `#E5DDD0` | שמנת |
| Text primary | `#1A2744` | נייבי |
| Text secondary | `#6B5D4F` | אדמה |

### Typography
- **Headers:** Playfair Display — נותן תחושה של עיתון יוקרתי / מלון קלאסי
- **Body:** Plus Jakarta Sans — קריא ונקי

### Signature element
פס זהב (`#B8982C`) אנכי עדין בצד ימין של ה-sidebar, כמו ריבוד מלונאי.
כרטיסי KPI עם גבול זהב עליון (`border-top: 3px solid #B8982C`).

### Best for
מנהלי מלון / הנהלה — רמת ייצוגיות גבוהה.

---

## Concept B — "Boutique" (בוטיק)

**Feeling:** מלון בוטיק מודרני — חם, אנושי, לא קורפורטיבי.
Think: The Norman, Brown's Hotel. Earthy + מרוחק.

### Palette
| Role | Hex | Name |
|------|-----|------|
| Background | `#FAF7F2` | שנהב |
| Sidebar | `#2D4A3E` | ירוק יער |
| Surface | `#FFFFFF` | לבן |
| Primary action | `#2D4A3E` | ירוק |
| Accent / CTA | `#D4703A` | טרקוטה |
| Border | `#E5DDD0` | שמנת |
| Text primary | `#1C2B26` | כמעט-שחור ירקרק |
| Text secondary | `#6B7C74` | אפור-ירוק |

### Typography
- **Headers:** DM Serif Display — אלגנטי בלי להיות כבד
- **Body:** DM Sans — מודרני, ידידותי

### Signature element
ה-sidebar בגוון ירוק-יער עם אייקונים בגוון שמנת.
טאגים של סטטוס עם `border-radius: 4px` (לא עגול מדי) + גוון אדמה.

### Best for
מלוני בוטיק / עיצוב שרוצה להרגיש אנושי יותר.

---

## Concept C — "Operations" (אופרציונס)

**Feeling:** Dark mode מקצועי — ללילה, לשיפטים, לנתונים.
Think: אויר טראפיק קונטרול meets Linear.com.

### Palette
| Role | Hex | Name |
|------|-----|------|
| Background | `#0F1117` | שחור-כחול |
| Sidebar | `#161B27` | כחול-לילה |
| Surface | `#1C2333` | כרטיס כהה |
| Primary action | `#3B82F6` | כחול בהיר |
| Accent / CTA | `#00D4AA` | טורקיז ניאון |
| Border | `#2D3748` | אפור-כחול |
| Text primary | `#E8EDF5` | כמעט לבן |
| Text secondary | `#94A3B8` | אפור בהיר |

### Typography
- **Headers:** Inter — חד, קריא, טכני
- **Body:** Inter — עקביות מלאה

### Signature element
גבול שמאלי (ימין ב-RTL) טורקיז בשורות טבלה active.
Status badges עם glow עדין: `box-shadow: 0 0 8px rgba(0,212,170,0.3)`.

### Best for
רסپשן לילה, אודיטורים, מי שעובד בחדר חשוך.

---

## Comparison Table

| Attribute | Grand | Boutique | Operations |
|-----------|-------|----------|------------|
| Mood | יוקרתי | חם ואנושי | מקצועי וחד |
| Background | חם-בז' | שנהב | כהה |
| Sidebar | נייבי עמוק | ירוק יער | כחול-לילה |
| Accent | זהב | טרקוטה | טורקיז |
| Typography | Serif + Sans | Serif + Sans | Sans only |
| Best shift | יום, פגישות | יום, לובי | לילה, אודיט |
| Density | בינונית | נמוכה | גבוהה |

---

## Files

| File | Description |
|------|-------------|
| `preview-1-grand.html` | קונספט Grand Hotel |
| `preview-2-boutique.html` | קונספט Boutique |
| `preview-3-operations.html` | קונספט Operations Dark |
