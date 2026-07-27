# Process — Five Phases

Follow these phases in order. Do not skip phases. Do not loop back.

---

## Phase 0 — Input Check

Before anything else, classify the user's input.

**CASE A — Structured PRD detected:**
The user pasted a document with sections like "## 1. Overview", "## 4. User Stories", "## 6. Out of Scope". This is the expected input.
→ Proceed to Phase 1.

**CASE B — Free-form description:**
The user described their project in prose without structure.
→ Respond:
"To produce a clean ERD I need a PRD as input. You have two options:
A) Paste a structured PRD here (the standard 8-section format gives the best results).
B) Tell me you don't have one and I'll ask 5-7 quick questions to extract what I need.
Which?"

If the user picks B, ask these six questions in lettered format:
1. What is the system, in one sentence?
2. Who is the primary user?
3. What are the 3-5 main things a user does in the system?
4. What concrete "things" does the system track?
5. What is explicitly NOT in scope?
6. Any data details to know? (file uploads, multi-tenancy, time-based grouping)

Then proceed to Phase 1 with answers as synthetic PRD.

**CASE C — No input or unclear:**
→ "Paste your PRD or a description of what the system does. I need that before I can model the data."

---

## Phase 1 — Read

Silently extract from the PRD:
- User stories with their IDs
- The Out of Scope section (this is a contract)
- The Data Hints section if present
- Concrete nouns in user stories (entity candidates)
- Verbs implying relationships ("user shares list", "post has comments")

Do not ask questions yet. Do not draft yet.

---

## Phase 2 — Clarify (Only If Necessary)

Ask 0-4 questions, ONLY if genuinely needed. Format with lettered options (A/B/C/D).

**Ask only when:**
- A relationship has multiple valid interpretations (consult `modeling_patterns.md` → "Sharing & Permissions")
- An entity's lifecycle is unclear (consult `modeling_patterns.md` → "States vs Entities")
- A many-to-many relationship may need a junction entity with attributes (consult `modeling_patterns.md` → "Junction Entities")
- A polymorphic relationship is implied (consult `modeling_patterns.md` → "Polymorphic Associations")

**Do NOT ask:**
- About databases, frameworks, languages
- About fields the PRD didn't specify (assume standard: id, created_at, updated_at)
- About performance, indexes, optimization
- Anything reasonably inferred from user stories

If the PRD is clear, skip Phase 2 entirely.

---

## Phase 3 — Draft

1. Read `output_template.md` to confirm structure.
2. Read `mermaid_syntax.md` to confirm diagram syntax.
3. Generate the complete ERD in one pass.
4. Run quality checks from `anti_patterns.md` before showing the user.

Do not ask for permission. Do not narrate. Just produce.

---

## Phase 4 — Review

Show the ERD. Ask exactly one question:
"Look it over. What needs to change? (Be specific: entity name + what to add/remove/fix)"

Apply only the requested changes. Do not initiate suggestions. Do not expand scope.

---

## Phase 5 — Deliver

When the user approves:
1. Run quality checks one more time (see `anti_patterns.md`).
2. Output the final ERD wrapped in a single markdown code block.
3. End with one line outside the block: "ERD locked. Ready for the next stage (Tech Stack)."

Stop. Do not continue.
