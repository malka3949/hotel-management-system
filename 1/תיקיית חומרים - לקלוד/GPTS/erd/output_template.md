# ERD Output Template

This is the exact structure your ERD output must follow. Do not rename sections, do not reorder them, do not merge them.

---

## Required Output Structure

```markdown
# ERD: [Project Name]

## 1. Overview
[2-3 sentences describing the data model at a high level. What are the core "things" the system tracks? What is the data shape — is this a content system, a transactional system, a tracking system, an event log?]

## 2. Mermaid Diagram

\`\`\`mermaid
erDiagram
    [diagram body — see mermaid_syntax.md for syntax]
\`\`\`

## 3. Entities

### [EntityName]
**Purpose:** [One sentence on what this entity represents.]
**Source:** [Comma-separated list of user story IDs, e.g., US-001, US-003]

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | Primary key |
| [field] | [type] | yes/no | [constraint or comment if relevant] |
| created_at | datetime | yes | |
| updated_at | datetime | yes | |

[Repeat for every entity]

## 4. Relationships

**[Entity A] → [Entity B]:** [type, e.g., one-to-many]
- Description: [One sentence on the business meaning.]
- Cascade: [What happens to B when A is deleted? cascade / set null / restrict]
- Source: [Which user story established this.]

[Repeat for every relationship]

## 5. Coverage Map

| User Story | Entities Involved |
|------------|-------------------|
| US-001 | [Entity, Entity] |
| US-002 | [Entity] |

[List EVERY user story from the PRD. If a story has no entity, flag it with ⚠️ and explain why.]

## 6. Open Questions
[Anything the PRD left ambiguous that affects the data model. If none, write "None at this stage."]
```

---

## Logical Types — The Only Types You May Use

Use ONLY these types. They are database-agnostic by design. Choosing physical types is the next stage's job.

| Logical Type | When to Use | Example |
|--------------|-------------|---------|
| `string` | Short text, names, titles, slugs, identifiers | name, email, slug |
| `text` | Long-form text, free-form content | description, body, bio |
| `integer` | Whole numbers, counts | quantity, page_count |
| `decimal` | Numbers with fractions, money, measurements | price, weight, score |
| `boolean` | True/false flags | is_published, is_archived |
| `date` | Calendar date, no time component | birthday, due_date |
| `datetime` | Date + time | created_at, last_login |
| `enum: [a, b, c]` | Fixed set of allowed values | status, role, priority |
| `reference: [Entity]` | Foreign key to another entity | user_id → User |
| `json` | Unstructured or flexible data | metadata, settings |

### Forbidden Types
Do NOT use:
- `VARCHAR(n)`, `CHAR(n)`, `TEXT` (SQL-specific)
- `BIGINT`, `SMALLINT`, `INT(n)` (SQL-specific)
- `TIMESTAMP`, `TIMESTAMPTZ` (SQL-specific)
- `UUID` (use `string` and note "UUID format" if relevant)
- `OBJECTID` (MongoDB-specific)
- `BLOB`, `CLOB` (database-specific)
- Any type from a specific ORM (`Schema.Types.ObjectId`, etc.)

---

## Standard Fields — Default to These Unless Told Otherwise

Most entities should include:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | Primary key |
| created_at | datetime | yes | Set at creation |
| updated_at | datetime | yes | Updated on every change |

Add `deleted_at` (datetime, optional) only if the PRD or Data Hints imply soft deletion (e.g., "trash bin", "archive", "restore deleted items"). Otherwise omit.

Do NOT add `version`, `tenant_id`, `created_by`, or audit fields unless the PRD explicitly implies them. These are common but not universal — invent them only when justified.

---

## Naming Conventions

| What | Convention | Example |
|------|------------|---------|
| Entity name | PascalCase, singular | `User`, `BookReview`, `OrderItem` |
| Field name | snake_case | `email_address`, `is_active`, `published_at` |
| Foreign key field | `[entity]_id` | `user_id`, `book_id` |
| Boolean field | `is_X` or `has_X` or `can_X` | `is_published`, `has_avatar`, `can_comment` |
| Datetime field | `[verb]_at` or `[noun]_at` | `created_at`, `published_at`, `last_seen_at` |
| Enum field | singular noun | `status`, `role`, `priority` (not `statuses`) |

---

## Source Field Rules

The `Source:` line under each entity is mandatory. It connects the data model back to the PRD.

Format: comma-separated user story IDs.
Example: `**Source:** US-001, US-003, US-007`

Special cases:
- **Junction entity:** Source is the user story that justified the M:N relationship with attributes.
  Example: `**Source:** US-005 (user follows other users with timestamp)`
- **System entity (no direct user story):** Mark as system-derived but justify it.
  Example: `**Source:** System-derived (audit log required by US-009 acceptance criteria)`
- **User-added (post-PRD):** Mark explicitly.
  Example: `**Source:** User-added, no PRD reference`

If you cannot find at least one user story or justification, the entity should not exist.

---

## Coverage Map Rules

Every user story in the PRD must appear in the Coverage Map. No exceptions.

If a user story has no entities supporting it:
- It might be purely UI/behavioral (e.g., "user can change app theme") — flag it: "⚠️ US-XXX is UI-only, no persistent data."
- It might mean the PRD is missing data — flag it: "⚠️ US-XXX has no supporting entity. Possible PRD gap: [hypothesis]."

Flagging a gap is not a failure — it's the Coverage Map doing its job.

---

## Section Length Guidelines

| Section | Target Length |
|---------|---------------|
| 1. Overview | 2-3 sentences |
| 2. Mermaid Diagram | As long as the model needs |
| 3. Entities | Tables, no prose between them beyond Purpose + Source |
| 4. Relationships | One line per bullet, no paragraphs |
| 5. Coverage Map | One row per user story |
| 6. Open Questions | Bullet list, or "None at this stage." |

Do not pad. Do not narrate. The PRD did the talking. The ERD does the modeling.
