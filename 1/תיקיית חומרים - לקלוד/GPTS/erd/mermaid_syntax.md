# Mermaid ER Diagram Syntax

Reference for generating valid Mermaid ER diagrams in your ERD output.

---

## Basic Structure

Every Mermaid ER diagram starts with `erDiagram` and contains two kinds of statements:
1. **Relationships** — lines connecting entities
2. **Entity definitions** — blocks listing fields

```
erDiagram
    USER ||--o{ POST : "authored"
    POST }o--o{ TAG : "tagged with"
    
    USER {
        string id PK
        string email
        string name
        datetime created_at
    }
    POST {
        string id PK
        string user_id FK
        string title
        text body
        datetime published_at
    }
    TAG {
        string id PK
        string name
    }
```

---

## Cardinality Symbols

The arrow between two entities encodes cardinality on both sides.

| Left side | Right side | Meaning |
|-----------|------------|---------|
| `\|\|` | `\|\|` | exactly one ↔ exactly one |
| `\|\|` | `o\|` | exactly one ↔ zero or one |
| `\|\|` | `o{` | exactly one ↔ zero or many |
| `\|\|` | `}\|` | exactly one ↔ one or many |
| `}o` | `o{` | zero or many ↔ zero or many |
| `}\|` | `\|{` | one or many ↔ one or many |

The most common patterns you will use:

| Relationship | Syntax | Example |
|--------------|--------|---------|
| 1:1 (mandatory both sides) | `A \|\|--\|\| B` | `USER \|\|--\|\| PROFILE` |
| 1:N (one A has many B) | `A \|\|--o{ B` | `USER \|\|--o{ POST` |
| N:M (many to many) | `A }o--o{ B` | `POST }o--o{ TAG` |
| 1:1 optional one side | `A \|\|--o\| B` | `USER \|\|--o\| AVATAR` |

Read the symbols outside-in:
- `\|\|` = exactly one
- `o\|` = zero or one
- `}o` = zero or many
- `}\|` = one or many

---

## Relationship Labels

Every relationship MUST have a label. The label is a verb phrase describing the relationship.

```
USER ||--o{ POST : "authored"
USER ||--o{ COMMENT : "wrote"
POST ||--o{ COMMENT : "received"
USER }o--o{ USER : "follows"
ORDER ||--|{ ORDER_ITEM : "contains"
```

Use specific verbs that read naturally in a sentence:
- ✅ "authored", "owns", "belongs to", "tagged with", "follows", "subscribes to", "contains"
- ❌ "has", "relates to", "links to", "is connected to"

Read the relationship aloud as a sentence:
- "USER authored POST" ✓
- "POST has USER" ✗ (wrong direction, vague verb)

---

## Entity Block Syntax

Inside an entity block, each line is one field:

```
ENTITY_NAME {
    type field_name PK
    type field_name FK
    type field_name
    type field_name "comment"
}
```

- `PK` marks a primary key (use on `id`)
- `FK` marks a foreign key (use on reference fields)
- A field can have an optional comment in quotes
- Both PK and FK can be combined: `string user_id PK,FK` (rare, but valid for join tables)

Example:

```
POST {
    string id PK
    string user_id FK
    string title
    text body
    enum status "draft, published, archived"
    datetime published_at
    datetime created_at
    datetime updated_at
}
```

---

## Naming Conventions in the Diagram

| Element | Convention | Example |
|---------|------------|---------|
| Entity name in diagram | UPPER_SNAKE_CASE or PascalCase | `USER` or `User` (pick one, stay consistent) |
| Field name | snake_case | `email`, `user_id`, `created_at` |
| Relationship label | lowercase verb in quotes | `: "authored"` |

The recommendation: **UPPER_SNAKE_CASE** for entities in Mermaid. It reads better in the diagram visually.

In the prose sections (Section 3 Entities), use **PascalCase**: `User`, `Post`, `OrderItem`. This dual convention is standard.

---

## Common Patterns

### Self-Referential Relationship (e.g., user follows user)

```
USER }o--o{ USER : "follows"
```

If the relationship has its own data (e.g., timestamp of when the follow happened, or status), introduce a junction entity:

```
USER ||--o{ FOLLOW : "is follower in"
USER ||--o{ FOLLOW : "is followed in"
FOLLOW {
    string id PK
    string follower_id FK
    string followed_id FK
    datetime followed_at
}
```

### Hierarchical / Tree Structure (e.g., comment with replies)

```
COMMENT ||--o{ COMMENT : "has reply"
COMMENT {
    string id PK
    string parent_id FK "nullable, self-reference"
    string user_id FK
    text body
    datetime created_at
}
```

### Junction Entity with Attributes

When M:N has its own data:

```
USER ||--o{ ENROLLMENT : "enrolled in"
COURSE ||--o{ ENROLLMENT : "has enrollment"
ENROLLMENT {
    string id PK
    string user_id FK
    string course_id FK
    datetime enrolled_at
    enum status "active, completed, dropped"
    decimal grade
}
```

---

## Common Mistakes to Avoid

1. **Missing label on relationship.** `USER ||--o{ POST` is invalid. Always add `: "label"`.

2. **Wrong arrow direction.** `USER ||--o{ POST` reads "one user has many posts". Reversing to `USER }o--|| POST` reads "many users have one post" — different meaning.

3. **Inconsistent entity naming.** Pick UPPER_SNAKE or PascalCase and stick with it for the whole diagram.

4. **Forgetting PK/FK markers.** Always mark primary keys with `PK` and foreign keys with `FK`. The diagram is harder to read without them.

5. **Cluttered diagram with too many fields.** If an entity has 20 fields, the diagram becomes unreadable. Show key fields only in the diagram (id, name, foreign keys, important enums) and put the full field list in the entity table in Section 3.

6. **Using `string` for everything.** Match the field type to the logical type. `enum` for fixed values, `boolean` for flags, `datetime` for timestamps.

---

## Minimal Valid Example

The smallest possible valid ERD diagram:

```
erDiagram
    USER ||--o{ TASK : "owns"
    
    USER {
        string id PK
        string email
        datetime created_at
    }
    TASK {
        string id PK
        string user_id FK
        string title
        boolean is_done
        datetime created_at
    }
```

This is a complete, valid Mermaid ER diagram. Anything you produce should be at least this clean.

---

## Validation Checklist

Before finalizing the diagram, verify:

- [ ] Every relationship has a label in quotes
- [ ] Every entity has at least one field
- [ ] Every entity has an `id` marked `PK`
- [ ] Every foreign key field is marked `FK`
- [ ] Cardinality arrows match the prose description in Section 4
- [ ] No physical types appear (no VARCHAR, no BIGINT, no UUID-as-type)
- [ ] Entity names are consistent in case style throughout
- [ ] Field names are snake_case
- [ ] No entity in the diagram is missing from Section 3's entity tables (and vice versa)
