# Operational / process & permission security (context — mostly NOT code)

Domain 3. Even if the code is secure and the server is secure, people, employees, vendors, managers
and workflows can still create a breach. Here the question isn't "is the system written right?" but:

```text
who got access · why · for how long · what may they do · who approved · who reviews ·
what happens when they no longer need it
```

> An auditor reports these as **context / recommendations**, not code defects — most are enforced by
> process, infra (RBAC config), or org policy, not by application code. Flag the ones that *do* leave
> a code trace (e.g. a role model with no revocation field, no audit-log table).

## The 10 principles

1. **Need-only access.** Don't grant "maybe they'll need it." Grant only on a clear need. (A support
   agent needs a task-scoped screen, not DB access.) Most damage comes from over-broad access, not
   sophisticated breaches.
2. **Minimum necessary.** Even when granting — grant the minimum: view-only, edit-only, only certain
   clients/reports, only for a time window.
3. **Separation of roles.** Manager / regular employee / support / finance / developer / external
   vendor / client — each with clear bounds. Support sees client details but can't delete; finance
   sees payments but can't change system perms; a developer sees technical logs but not necessarily
   full personal data.
4. **Approval before a sensitive action.** Delete data, export client list, change perms, access
   backups, change payment method, log into another user's account — require approval, logging,
   sometimes dual approval.
5. **Action logging.** The system must answer: who did what, when, from where, on which data — not to
   spy, but to investigate incidents. *(Code-level audit trail → `10-logging-and-audit.md`.)*
6. **Timely access revocation** (critical). The problem isn't only *who* gets access but *when it's
   taken back*: employee left, vendor finished, project ended, developer no longer maintains it,
   client stopped paying. Need a clear revocation process — not "we'll remember to remove them later."
7. **Environment separation.** Don't work directly on production unless you must. Separate
   Production / Staging / Development, with different permissions per environment.
8. **Secret management.** Secrets = anything granting access (passwords, API keys, tokens, SSH keys,
   env files, encryption keys, DB access). Never send secrets over WhatsApp, store them in code, share
   them in groups, or leave them with someone who doesn't need them. *(Code-level handling →
   `09-secrets-management.md`; token specifics → `06-tokens-and-sessions.md`.)*
9. **Incident response process.** Know in advance what to do when something breaks (account breached,
   API key leaked, employee downloaded data, server exposed, a client saw data not theirs): who
   handles, who decides, what to close first, what to log, who to notify, how to restore.
10. **Periodic permission review.** Permissions shouldn't live forever just because they were once
    granted. Periodically check: who's still active, who holds high permissions, who hasn't logged in
    for a long time, which vendors still exist, which API keys are still used. ("Permission cleanup.")

Condensed to 5 for teaching: (1) access only by need · (2) minimum permissions · (3) role separation ·
(4) log sensitive actions · (5) revoke + periodically review.

```text
Operational security = the right people get the right access, at the right time,
with logging, and with the ability to revoke and investigate.
```
