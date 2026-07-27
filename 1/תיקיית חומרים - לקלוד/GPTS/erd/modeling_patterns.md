# Modeling Patterns

Reference for common data modeling decisions. Consult when you encounter ambiguity in Phase 2 or when modeling non-trivial relationships.

These are pattern recognitions, not recommendations. Your job is to ASK the user which pattern applies, not to choose for them.

---

## 1. States vs Entities

**The question:** Is this thing one entity with a status field, or two separate entities?

**Heuristic:**
- One entity with status — when the same record transitions through states without being copied, and most fields stay the same throughout the lifecycle.
- Two entities — when the "states" have substantially different fields, lifecycles, or audiences.

**Examples:**

| Scenario | Pattern | Why |
|----------|---------|-----|
| Post: draft → published → archived | One entity, `status` enum | Same content, just visibility changes |
| User: invited → registered | Two entities (`Invitation`, `User`) | Different fields, different lifecycles |
| Order: cart → placed → shipped → delivered | One entity, `status` enum | Same fields, status progression |
| Job application: applied → interviewed → hired | One entity, `status` enum (with extra fields) | OR two entities if hired creates an Employee record |

**When to ask in Phase 2:**
"In US-XXX you mention [state A] and [state B]. Are these:
A) The same record at different stages (one entity with status field)
B) Different records that get created when the transition happens (two entities)
C) Other: [specify]"

---

## 2. Junction Entities

**The question:** Does this many-to-many relationship need its own entity?

**Heuristic:**
- Implicit M:N (Mermaid: `}o--o{`) — when the relationship is purely a link with no extra data.
- Explicit junction entity — when the relationship itself has attributes (timestamp, role, status, metadata).

**Examples:**

| Scenario | Pattern |
|----------|---------|
| Post tagged with Tag | Implicit M:N (just a link) |
| User follows User (with timestamp) | Junction entity `Follow` (has `followed_at`) |
| User in Project with role (admin/member) | Junction entity `ProjectMembership` (has `role`, `joined_at`) |
| Recipe contains Ingredient with quantity | Junction entity `RecipeIngredient` (has `quantity`, `unit`) |
| Book in Cart | Junction entity `CartItem` (has `quantity`, `added_at`) |

**Rule of thumb:** If you can't think of a single attribute the relationship itself needs, use implicit M:N. The moment there's even one attribute that "belongs to the relationship", create a junction entity.

**When to ask in Phase 2:**
"US-XXX implies a many-to-many between [A] and [B]. Does the relationship itself need attributes?
A) No, it's a simple link (implicit M:N)
B) Yes, it needs [list candidates from PRD] — junction entity needed
C) Other: [specify]"

---

## 3. Sharing & Permissions

**The question:** When the PRD says "user shares X", what does that mean?

**Common interpretations:**

| Interpretation | Modeling |
|----------------|----------|
| Public link, anyone with URL | `share_token` (string) field on the entity, no new entity |
| Public to all users of the system | `is_public` (boolean) field on the entity |
| Shared with specific users (read-only) | Junction entity (e.g., `ListShare` with `viewer_id`) |
| Shared with specific users (with roles) | Junction entity with role enum (`owner`, `editor`, `viewer`) |
| Shared via email invitation | Separate `Invitation` entity (transient), then promote to permission |

**When to ask in Phase 2:**
"US-XXX says '[user] can share [thing]'. Sharing means:
A) Public link anyone can open (token field, no entity)
B) Visible to all logged-in users (boolean flag)
C) Shared with specific users by selection (junction entity)
D) Shared with specific users with roles (junction entity with role)
E) Email invitation flow (separate Invitation entity)
F) Other: [specify]"

---

## 4. Polymorphic Associations

**The question:** Can a single entity be related to multiple types of "parents"?

**Example:** Comments can attach to a Post OR a Photo OR a Video.

**Three valid modelings:**

### Option A: Polymorphic field (compact, less strict)
```
COMMENT {
    string id PK
    string commentable_type "Post / Photo / Video"
    string commentable_id FK "polymorphic reference"
    string user_id FK
    text body
}
```

### Option B: Multiple optional foreign keys (verbose, type-safe)
```
COMMENT {
    string id PK
    string post_id FK "nullable"
    string photo_id FK "nullable"
    string video_id FK "nullable"
    string user_id FK
    text body
}
```
With a constraint that exactly one of the three FKs is non-null.

### Option C: Separate entities per type (strict, lots of duplication)
- `PostComment`, `PhotoComment`, `VideoComment` as three separate entities.

**When to use which:**
- Option A: Default for most cases. Compact and flexible.
- Option B: When you need referential integrity at the DB level (the next stage will appreciate it).
- Option C: When the comment behavior actually differs significantly per type.

**When to ask in Phase 2:**
"In US-XXX, a [thing] can attach to multiple parent types ([list types]). Modeling preference:
A) Single entity with type + id polymorphic field (compact)
B) Single entity with multiple optional FKs (strict, one must be set)
C) Separate entities per parent type (most strict, more duplication)
D) Defer to next stage — the database choice will inform this"

(Option D is valid here. Sometimes polymorphic modeling depends on the DB.)

---

## 5. Soft Deletes

**The question:** When a user "deletes" a thing, does it actually go away?

**Heuristic:**
- Hard delete (no extra field) — when the PRD says nothing about recovery, archives, or trash.
- Soft delete (`deleted_at` datetime, nullable) — when the PRD mentions: "trash bin", "recover", "archive", "30-day retention", "audit history".
- Status-based archival (`status: active | archived`) — when archival is a first-class user action with its own UI, not just a deletion side-effect.

**When to ask in Phase 2:**
Only if the PRD is ambiguous. If the PRD doesn't mention recovery or archiving at all, default to hard delete and DO NOT add `deleted_at`. Don't ask about it.

---

## 6. Versioning & History

**The question:** Does the system need to remember past versions of an entity?

**Heuristic:**
- No versioning (default) — when the PRD doesn't mention history, edit log, or "see previous versions".
- `version` field on entity — for optimistic locking, not full history. Add only if PRD mentions concurrent editing.
- Separate History entity — when the PRD says "see who changed what when", "revert to previous version", "track changes".

**Three History modelings:**

### Snapshot per change (simple, full record per version)
```
DocumentVersion {
    string id PK
    string document_id FK
    string title
    text body
    string edited_by FK
    datetime edited_at
}
```

### Diff/audit log (compact, only changes)
```
DocumentAudit {
    string id PK
    string document_id FK
    string field_changed
    text old_value
    text new_value
    string changed_by FK
    datetime changed_at
}
```

### Event sourcing (advanced, beyond ERD scope)
Defer to next stage if PRD implies this.

**When to ask in Phase 2:**
"US-XXX implies version/edit history. Modeling:
A) Snapshot per version (full record each time)
B) Audit log (only what changed, field by field)
C) No versioning needed, just `updated_at` and `updated_by`
D) Other: [specify]"

---

## 7. Files & Uploads

**The question:** When the PRD mentions file uploads, how do we model them?

**Common modelings:**

### Inline reference (compact, when 1:1 with parent)
Add `file_url` (string) and `file_name` (string) directly to the parent entity. Use when each parent has at most one file (e.g., user avatar).

### Separate File entity (when 1:N or shared)
```
FileUpload {
    string id PK
    string filename
    string storage_url
    string content_type
    integer size_bytes
    string uploaded_by FK
    datetime uploaded_at
}
```
Then reference from parent: `Post → FileUpload` as 1:N.

**Heuristic:**
- 1 file per parent, no metadata needed → inline reference
- Multiple files per parent, OR file has its own lifecycle, OR same file shared → separate entity

**Note:** Do NOT specify storage backend (S3, local disk, etc.). That's tech stack decision. Use generic `storage_url` (string).

**When to ask in Phase 2:**
Only if the PRD is ambiguous about cardinality. If "user uploads avatar" — clearly 1:1 inline. If "user attaches files to post" — clearly 1:N entity. Don't ask unless genuinely unclear.

---

## 8. Multi-Tenancy

**The question:** Is this a single-tenant app or multi-tenant?

**Heuristic:**
- Single-tenant (default) — most personal/MVP apps. No `tenant_id` field anywhere.
- Multi-tenant — when the PRD mentions "organizations", "workspaces", "teams" as containers that own data.

**Modeling for multi-tenant:**
- Add a tenant entity (e.g., `Workspace`, `Organization`).
- Most other entities get a `workspace_id` FK.
- Users belong to workspaces (often via junction entity `WorkspaceMember`).

**When to ask in Phase 2:**
"The PRD mentions [organizations/workspaces/teams]. Multi-tenancy means:
A) Yes — every record belongs to a workspace, users access only their workspace's data
B) No — workspaces are just a labeling/grouping concept, all data is shared
C) Defer — single-user MVP, design for now without tenancy"

---

## 9. Identifiers & Slugs

**The question:** What kind of ID does each entity need?

**Default:** Every entity gets `id` (string) marked PK. Don't specify the format (UUID, ULID, integer auto-increment) — that's physical schema.

**When to add slug:**
- The PRD says entity is accessed via human-readable URLs (e.g., `/posts/my-first-post`).
- Add `slug` (string) field, mark unique in Notes column.

**When to add external_id:**
- The PRD mentions integration with external systems and the need to track external IDs.
- Add `external_id` (string) with note explaining the source.

Do NOT speculate on these. Add only when the PRD justifies it.

---

## 10. Time-Based Grouping

**The question:** When the PRD says "weekly summary" or "daily log", is the time grouping its own entity?

**Heuristic:**
- Compute on demand (no entity) — when "weekly summary" is just a query/view of existing records.
- Persistent entity — when the time grouping has its own attributes (computed totals, generated content, locked state).

**Examples:**

| Scenario | Pattern |
|----------|---------|
| "Show last 7 days of activity" | Query, no entity |
| "Weekly digest email with summary" | Possibly an entity if the digest is stored |
| "Generate monthly invoice" | Entity (`Invoice`) — invoice is a real thing |
| "Daily standup recap" | Entity if the recap is saved/edited; query if computed each time |

**When to ask in Phase 2:**
"US-XXX mentions a [time-based grouping]. Is it:
A) Computed from existing records on demand (no entity needed)
B) A real persistent thing with its own data (entity needed)
C) Other: [specify]"

---

## Pattern Selection Principle

When in doubt, prefer the simpler model. Adding entities is easy in a future iteration. Removing them after they've been built into code is expensive.

If the PRD is silent on a pattern decision, choose the simpler option AND note it in Section 6 "Open Questions" so the user can correct you if needed.
