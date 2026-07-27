# Authorization, roles & permissions — deep dive

Expands principle 2 (`02-software-principles.md`). Authentication answered *who you are*; authorization
answers *what you may do, on which resource*. This is where the most damaging, most common real-world
bugs live (IDOR, privilege escalation) — because they pass every test that only checks "is logged in".

Core rule: **every sensitive action passes a server-side check of (this user) × (this action) ×
(this specific resource). Default deny.** Hiding a button on the frontend is not authorization.

---

## The two questions, never skip the second
```text
1. Authenticated?   → is there a valid session/token?     (principle 1)
2. Authorized?      → may THIS user do THIS to THIS object? (principle 2)  ← the one people forget
```
"Logged in" ≠ "allowed." A logged-in User 17 must still be stopped from editing Client 92 if 92 isn't theirs.

## Permission models — pick the right one

### RBAC — Role-Based Access Control
Users get roles; roles carry permissions. Simple, the default for most apps.
- Good for: clear job functions (admin / support / finance / viewer).
- Watch: **role explosion** (a new role per edge case) and **coarse roles** that over-grant.
- Shape: `user → roles → permissions(action)`; check `permission`, not `role`, in code
  (`can('client.delete')`, not `if role == 'admin'`) so roles stay configurable.

### ABAC — Attribute-Based Access Control
Decision from attributes of user/resource/context (department, owner, time, status).
- Good for: rules like "a manager may see clients **in their region**", "edit only while status=draft".
- Watch: complexity; keep the policy in one evaluable place, not scattered `if`s.

### ReBAC / ownership — Relationship-Based
Decision from the relationship between user and resource ("is owner", "is member of the team that owns it").
- Good for: multi-tenant SaaS, documents, projects. **This is the antidote to IDOR.**
- Shape: every resource query is scoped by the relationship: `where ownerId = currentUser` /
  `where org_id = currentUser.org_id`.

Most real systems = **RBAC for coarse capability + ownership/ABAC for the per-resource check.** You need
both: RBAC says "support agents may view clients"; ownership says "*this* agent may view *this* client".

---

## IDOR — the #1 finding (Insecure Direct Object Reference)
A resource is fetched/mutated by an id taken from the request, with **no check that the caller owns or may
access that id.** Change the id in the URL → reach someone else's data.

```text
# VULNERABLE — authenticated but not authorized
GET  /api/invoices/:id        → Invoice.findById(id)                     # any id works
PUT  /api/clients/:id         → Client.update(id, req.body)             # edits anyone's client
DELETE /api/files/:id         → File.delete(id)                          # deletes anyone's file

# SAFE — scoped to the caller
Invoice.findOne({ id, ownerId: currentUser.id }) ?? 403
Client.update({ where: { id, orgId: currentUser.orgId }, data: allowed })
```
Variants to hunt: numeric/sequential ids (enumerable), UUIDs (unguessable ≠ authorized — still check!),
ids in the body/JSON/GraphQL args, nested routes (`/orgs/:o/projects/:p` — is `:p` actually under `:o`?),
mass endpoints/exports, file download by id/path.

**AUDIT:** for every `/:id` (or id-in-body) **mutating or sensitive-read** endpoint — is there a
server-side ownership/scope clause? Unscoped `findById(req.params.id)` on a user-owned resource = 🔴.

## Privilege escalation
- **Vertical:** a normal user gains admin. Causes: client-set role (mass-assignment — see principle 3 /
  `08-input-validation-and-injection.md`: `{"is_admin":true}`), role check missing on an admin route,
  defaulting to a powerful role.
- **Horizontal:** a user acts as another same-level user → that's IDOR.
- **AUDIT:** can a role/permission field be set from the request body? are admin routes guarded by a
  permission check (not just auth)? does a new user/role default to minimal (principle 11)?

## Where the check must live
- **Server-side, always.** Frontend hiding is UX, not security.
- **Centralized & enforced**, not copy-pasted per controller — a policy layer / guard / middleware /
  `authorize(user, action, resource)` helper. Scattered ad-hoc checks = one forgotten endpoint = breach.
- **Deny by default**: no explicit allow → blocked (principle 11). New endpoint inherits the guard.
- **Fail closed**: if the permission check errors, block — never allow "for now" (principle 10 /
  `03-error-handling.md`).

## Common mistakes
```text
✗ checking role in the UI only; the API is open
✗ findById(id) with no owner/tenant scope                 → IDOR
✗ if (role === 'admin')  hard-coded everywhere            → unconfigurable, easy to miss
✗ trusting a userId/clientId/role sent from the client    → escalation
✗ "UUID is unguessable so we don't need a check"          → obscurity ≠ authorization
✗ authorize on the list endpoint but not the detail/export
✗ nested resource not verified to belong to its parent
```

## Audit checklist (what the auditor greps for)
```text
🔴 id-scoped mutation/read with no ownership/tenant scope (IDOR)
🔴 role/permission/owner id accepted from request body (privilege escalation)
🔴 admin/sensitive route with auth but no authorization check
🟡 role checked by string literal instead of a permission capability
🟡 authorization on list but missing on detail / export / download
🟡 nested route child not verified under its parent
🟡 new user/role defaults to broad permissions (cross-ref principle 11)
```

> Operational side — who *grants* roles, separation of duties, periodic permission review, timely
> revocation — is process, not code: `05-operational-permissions.md`. Report those as context.
