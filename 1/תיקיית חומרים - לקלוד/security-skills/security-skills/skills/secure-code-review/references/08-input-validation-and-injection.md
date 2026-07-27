# Input validation & injection — deep dive

Expands principles 3 (input validation) and 7 (files) of `02-software-principles.md`. **Every input is
hostile until proven otherwise** — forms, API bodies, query/path params, headers, cookies, webhooks,
uploaded files, and data from external vendors. Injection happens when untrusted input is interpreted as
*code/commands* by some downstream interpreter (SQL, shell, HTML, the ORM, the template engine).

Two complementary defenses, both required:
1. **Validate at the boundary** — allowlist what you accept (type, shape, range, enum), reject the rest.
2. **Escape/parameterize at the sink** — never build SQL/HTML/shell by string concatenation.

> Validation is not escaping. Validation says "this looks like an email"; escaping makes it safe *for the
> specific place it's used*. You need both — a valid string can still be a malicious SQL fragment.

---

## Validation strategy
- **Allowlist > denylist.** Define what's permitted (fields, types, enum values, length, format) and drop
  everything else. Denylists ("block `<script>`") are always bypassable.
- **Validate at the trust boundary** with a schema/DTO (Zod, Pydantic, class-validator, JSON Schema), not
  scattered `if`s and not only in the UI.
- **Validate type + shape + semantics:** correct type, length/range bounds, allowed enum, and business
  validity (a `quantity` ≥ 0, a `role` in the allowed set).
- **Canonicalize before checking** (decode/normalize once) to defeat double-encoding tricks.

## Mass assignment / over-posting (principle 3, top finding)
Code that saves the whole request body trusts fields the user was never meant to set.
```text
# VULNERABLE
user.update(**request.json)                 # python
Object.assign(entity, req.body); save()      # node
Model.create(req.body)                        # ORM create from raw body
# attacker sends {"name":"x","is_admin":true,"balance":999999}

# SAFE — explicit field allowlist
const { name, email } = req.body            # pick only allowed
user.update({ name, email })
```
**AUDIT:** whole-body persistence with no field allowlist; look for `is_admin`/`role`/`ownerId`/`price`-type
fields reachable from the client. (Ties to authorization escalation — `07-authorization-and-roles.md`.)

## Injection families — sink, attack, defense

### SQL / NoSQL injection
- **Sink:** query built by concatenation. `"SELECT * FROM u WHERE id=" + id`. NoSQL: passing an object
  where a scalar is expected (`{ "$gt": "" }`).
- **Defense:** **parameterized queries / prepared statements** always; ORM with bound params; validate/cast
  types so `id` can't be an object; least-privilege DB user.
- **AUDIT:** string-concatenated SQL, f-strings/template literals inside a query, raw `$where`, user object
  passed straight into a query filter.

### Command / OS injection
- **Sink:** user input in a shell command. `exec("convert " + filename)`.
- **Defense:** avoid the shell; use array-arg APIs (`execFile`, `subprocess.run([...], shell=False)`);
  allowlist values; never interpolate input into a shell string.
- **AUDIT:** `exec`/`system`/`os.system`/`child_process.exec` with interpolated input; `shell=True`.

### XSS — Cross-Site Scripting
- **Sink:** untrusted data rendered into HTML. Stored (from DB), reflected (from request), DOM-based.
- **Defense:** context-aware output **encoding**; let the framework escape (React/Vue auto-escape) —
  danger is `dangerouslySetInnerHTML`/`v-html`/`innerHTML`; sanitize rich HTML with a vetted library
  (DOMPurify); set a **Content-Security-Policy**; `HttpOnly` cookies so XSS can't read the session.
- **AUDIT:** `innerHTML`/`dangerouslySetInnerHTML`/`v-html`/`|safe`/`{{{ }}}` with user data; templates
  that disable auto-escaping.

### Other interpreter injections
- **Path traversal:** `../../etc/passwd` in a filename/path → resolve & confine to a base dir; reject `..`.
- **SSRF:** user-supplied URL fetched server-side → allowlist hosts, block internal ranges/metadata IPs.
- **Template / expression injection (SSTI):** user input into a server template → don't; pass as data.
- **Open redirect:** user-controlled redirect target → allowlist.
- **Header / CRLF injection, XXE (disable external entities), deserialization** (never deserialize
  untrusted data with `pickle`/`yaml.load`/native Java/PHP).
- **AUDIT:** unsanitized path joins; server-side fetch of a client URL; unsafe deserializers.

## File uploads (principle 7)
An uploaded file is dangerous input on multiple axes.
```text
✓ allowlist file types by REAL content (magic bytes / MIME sniff), not just extension
✓ cap size (reject early) and count
✓ sanitize/replace the filename; never trust it for the storage path (path traversal)
✓ store OUTSIDE any web-root that executes code; serve via a handler, not direct exec
✓ randomize stored names; set correct Content-Type / Content-Disposition on download
✓ enforce download authorization (an upload id is still subject to IDOR)
✓ scan in sensitive contexts; strip metadata if privacy-relevant
```
- **AUDIT:** extension-only type check; original filename used in the path; uploads under an executable
  web path (`.php`/`.jsp` could run); no size cap; download endpoint without an ownership check.

## Audit checklist (what the auditor greps for)
```text
🔴 string-concatenated SQL / f-string query / raw NoSQL object from input
🔴 shell exec with interpolated input / shell=True
🔴 whole request body persisted with no field allowlist (mass assignment)
🔴 dangerouslySetInnerHTML / innerHTML / v-html / |safe with user data (XSS)
🔴 unsafe deserialization of untrusted data (pickle, yaml.load, native)
🔴 upload type checked by extension only / stored in an executable path
🟡 server-side fetch of a client-supplied URL with no host allowlist (SSRF)
🟡 path built from user input without confinement (traversal)
🟡 validation only in the UI, not at the API boundary
🟡 open redirect from a client-controlled target
🟡 missing/permissive Content-Security-Policy where HTML renders user data
```
