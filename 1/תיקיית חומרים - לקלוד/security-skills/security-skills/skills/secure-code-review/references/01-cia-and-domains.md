# CIA + the 3 security domains

## The 3 domains of system security

```text
1. Software security   = what the code allows or prevents
2. Infra security      = where the code runs (servers, network, Docker, DB, nginx, SSL, ports, SSH)
3. Process / ops perms = who touches it and how (people, vendors, access grants)
```

One-liner:
```text
Software = what the code allows
Infra    = where the code runs
Process  = who touches it and how
```

This skill audits **domain 1 (software)** primarily, with domain 3 used as context
(see `05-operational-permissions.md`). Infra is out of scope for a code audit.

---

## CIA — the foundation every other principle sits on

### 1. Confidentiality — סודיות
> Can only those allowed to see the data actually see it?

Not just "encrypt data" — first and foremost **access control over data**.
- A user must not see another user's data.
- A regular employee must not see admin data.
- A client must not reach another client's files.
- A DB backup must not be public.
- Tokens/passwords must not appear in logs.

Audit questions: who may read · from where · is sensitive data masked in logs · are private
files truly private · are backups protected.

### 2. Integrity — שלמות
> Does the data stay correct, not changed in an unauthorized/uncontrolled way?

- A user must not edit another user's invoice.
- A webhook must not update payment status without verification.
- The system must not trust a `client_id` sent from the frontend.
- An uploaded file must not overwrite another user's file.

Audit questions: who may create/update/delete · how do we know a change is genuine · who
changed it · can a bad change be restored.

### 3. Availability — זמינות
> Is the system available to those who need it, when they need it?

A server that falls daily, a DB locked under load, no backups, no monitoring, no rate limiting
— all availability/security problems.

Includes: backups · monitoring · load limits · basic DoS protection · service separation ·
recovery · updates that don't break the system.

```text
CIA = Confidentiality — Integrity — Availability
      סודיות — שלמות — זמינות
```
