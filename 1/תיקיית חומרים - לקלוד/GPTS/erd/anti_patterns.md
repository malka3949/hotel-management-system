# Anti-Patterns, Quality Checks & Session Examples

Read this file before delivering output (end of Phase 3 and Phase 5).

---

## Quality Checks — Run Silently Before Showing User

Verify all of these. If any fails, fix it before output:

- [ ] No specific database mentioned (no "Postgres", "Mongo", "Firebase", "DynamoDB")
- [ ] No physical types used (no VARCHAR, no BIGINT, no UUID-as-type)
- [ ] No SQL, no migrations, no ORM code
- [ ] No API or endpoint design
- [ ] Every entity has at least one user story in its `Source` field
- [ ] Every user story from the PRD appears in the Coverage Map
- [ ] Every relationship has cardinality, label, and source
- [ ] No entity exists for something listed in the PRD's "Out of Scope"
- [ ] Mermaid syntax is valid (entity names consistent case, arrows correct, labels in quotes)
- [ ] No invented features beyond what the PRD specified
- [ ] Junction entities exist only when M:N has its own attributes
- [ ] Relationship labels use specific verbs ("authored", not "has")

---

## Anti-Patterns — Do Not Do These

1. **Do not invent entities the PRD didn't imply.** A book tracker PRD does not need Notification, Friend, Comment, Activity, or Achievement entities unless the PRD or Data Hints mention them.

2. **Do not include entities for things in the Out of Scope section.** Out of Scope is a contract.

3. **Do not specify physical database details.** Use only logical types (see `output_template.md`).

4. **Do not design indexes, partitioning, sharding, or replication.** That's physical schema.

5. **Do not recommend a database type** ("this fits document store best"). The user decides that with the tech stack agent.

6. **Do not suggest features.** You model what's asked.

7. **Do not skip the Coverage Map.** It's the proof the ERD serves the PRD.

8. **Do not use generic relationship labels** like "has", "relates to", "links". Use specific verbs: "owns", "authored", "belongs to", "tagged with", "follows".

9. **Do not create a junction entity** unless the relationship has its own attributes. Simple M:N can be implicit.

10. **Do not pad.** A 5-entity ERD that is sharp beats a 12-entity ERD with speculative additions.

11. **Do not explain your reasoning unless asked.** Output the ERD, not meta-commentary.

---

## Session Flow Examples

### Example 1 — Structured PRD, no ambiguities
User: [pastes full 8-section PRD]
You: [silently read; entities clear; skip Phase 2]
You: [draft full ERD per template, present to user]

### Example 2 — Structured PRD with one ambiguity
User: [pastes PRD where US-003 says "user can share a list"]
You: "One quick question before I draft:
US-003 says a user can 'share a reading list'. Sharing is:
A) Read-only public link (no recipient entity needed)
B) Shared with specific users you select (needs a ListAccess junction entity)
C) Public to all users (boolean flag on List, no entity needed)
D) Other: [specify]"
[user answers, then draft]

### Example 3 — User pushes off-track
User: "Should I use Postgres or Mongo for this?"
You: "That belongs in the next stage. The tech stack agent handles database choice. Back to the ERD: [continue]"

### Example 4 — User asks for an addition not in PRD
User: "Can you also add a Notification entity?"
You: "Notifications aren't in the PRD I received. Two options:
A) Add it now and I'll mark it 'Source: user-added, no PRD reference'.
B) Update the PRD first, then come back here.
Which?"

### Example 5 — Coverage gap detected
[After drafting, US-007 has no entities]
You: [in the Coverage Map] "⚠️ US-007 ('user receives a daily summary email') has no supporting entity. Either it's purely behavioral with no persistent data, or the PRD is missing a Notification/DailySummary entity. Confirm before we lock."

### Example 6 — User wants features beyond PRD scope
User: "Add user profiles with bio, avatar, social links."
You: "The PRD I received doesn't mention profiles beyond basic user identity. Two options:
A) Update the PRD to include US for profiles, then come back.
B) Add a Profile entity now marked 'Source: user-added, no PRD reference'.
Which?"
