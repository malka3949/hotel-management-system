# Phase 3 — Guests Module

## Purpose

Build the guest profile system. Guest records are the second pillar of every reservation — a reservation is always a room + a guest. This phase creates the guest database, search capability, and profile management UI.

---

## Big Picture

Guests are shared resources within a branch — the same guest may have multiple reservations across different visits. The guest record stores identity and contact information needed for check-in, invoicing, and the guest portal (Phase 4 ARCH). Passport/ID data is required for legal compliance in hospitality.

The guest list feeds the reservation creation form (Phase 4) via search-as-you-type. Getting guest search fast and accurate here prevents UX problems later.

Architecture ref: ARCHITECTURE.md § 5.1 (Guests: Guest, GuestProfile, GuestDocument)

---

## Scope

### In Scope
- Guest entity with identity, contact, and document fields
- Guest CRUD API
- Guest search (name, phone, email, passport ID)
- Guest list page with search
- Guest create/edit form
- Guest detail page (shows reservation history — linked in Phase 4)
- Branch-scoped guests (guests belong to a branch; chain_admin sees all)

### Out of Scope
- Guest portal login / self-service (ARCH Phase 4)
- Online check-in (ARCH Phase 4)
- Document file uploads (future phase)
- Guest loyalty system (future phase)
- GDPR deletion workflows (future phase)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Branch isolation | Guest records scoped to `branch_id` |
| Search performance | Full-text search on name + phone + email; index on all three |
| Passport ID | Stored but not encrypted in MVP (flag for future PII handling) |
| Duplicate detection | Warn (not block) if email or passport ID already exists in branch |

---

## Database Schema

### `guests`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | FK → branches |
| full_name | varchar(255) | |
| email | varchar(255) | nullable, indexed |
| phone | varchar(30) | indexed |
| passport_id | varchar(50) | nullable, indexed |
| nationality | varchar(10) | ISO 3166-1 alpha-2, nullable |
| date_of_birth | date | nullable |
| notes | text | internal notes, nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes:** `(branch_id, email)`, `(branch_id, phone)`, `(branch_id, passport_id)`
**Full-text index:** `(branch_id, full_name)` using `pg_trgm`

### `guest_documents`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| guest_id | uuid | FK → guests |
| branch_id | uuid | FK → branches |
| document_type | enum | passport, id_card, drivers_license, other |
| document_number | varchar(100) | |
| issuing_country | varchar(10) | ISO 3166-1 alpha-2 |
| expiry_date | date | nullable |
| recorded_at | timestamp | when recorded at check-in |
| recorded_by | uuid | FK → users |
| created_at | timestamp | |

---

## Tasks

### Backend
- [ ] Create `GuestsModule` with `GuestsService`, `GuestsController`, `GuestsRepository`
- [ ] `GET /api/v1/guests` — list guests, paginated, with search query param
- [ ] `GET /api/v1/guests/:id` — single guest detail
- [ ] `POST /api/v1/guests` — create guest
- [ ] `PATCH /api/v1/guests/:id` — update guest
- [ ] `DELETE /api/v1/guests/:id` — soft delete (manager+)
- [ ] `GET /api/v1/guests/search?q=` — fast search endpoint (used by reservation form)
- [ ] Duplicate detection: return `409` hint if email/passport_id already in branch
- [ ] Enable `pg_trgm` extension in migration for fuzzy name search
- [ ] All routes enforce branch scope from JWT
- [ ] `POST /api/v1/guests/:id/documents` — record document (used at check-in, receptionist+)
- [ ] `GET /api/v1/guests/:id/documents` — list recorded documents for guest

### Frontend
- [ ] `/guests` — guest list page (table, paginated)
  - Columns: name, phone, email, passport ID, nationality, actions
  - Search bar (live search, debounced 300ms)
- [ ] `/guests/new` — create guest form
- [ ] `/guests/:id` — guest detail page
  - Guest info card
  - Reservation history section (placeholder until Phase 4)
- [ ] `/guests/:id/edit` — edit guest form
- [ ] `GuestSearchCombobox` component — reusable in reservation form (Phase 4)
- [ ] Duplicate warning banner (non-blocking)
- [ ] Delete confirmation dialog

---

## Expected Deliverables

1. Guest list with search renders quickly (< 300ms for name search)
2. Guest CRUD works with proper validation
3. Duplicate detection warns without blocking creation
4. `GuestSearchCombobox` component ready for reuse in Phase 4
5. Branch isolation enforced

---

## Validation Checklist

- [ ] Guest list only shows guests for the user's branch
- [ ] Search by name returns partial matches (trigram)
- [ ] Search by phone returns exact prefix matches
- [ ] Duplicate email → `409` with `DUPLICATE_GUEST` code
- [ ] Soft-deleted guest does not appear in active lists
- [ ] Manager required for delete; receptionist can create/edit
- [ ] `GuestSearchCombobox` returns results within 300ms
- [ ] Guest detail page renders (reservation history section shows placeholder)
- [ ] RTL layout correct on all guest pages
- [ ] TypeScript strict — zero `any` in guests module

---

## Exit Criteria

All of the following must be true before Phase 4 begins:

1. Guest CRUD fully operational and branch-scoped
2. Guest search works reliably (name, phone, email, passport)
3. `GuestSearchCombobox` component built and tested
4. Role-based access enforced
5. Integration tests cover: create, search, duplicate detection, branch isolation
