# Error handling — fail in a safe way

Every system fails sometimes: bugs, crashes, DB errors, timeouts, an external API not answering,
a file that won't load, a malformed webhook, an invalid token, a missing permission. The question
isn't *whether* errors happen — it's **what the system does when something breaks**.

Principle: **a secure system not only works right when all is well — it also fails right when
something is wrong.** Secure failure.

```text
don't leak extra info · don't allow an action when in doubt · don't continue in an unclear state ·
don't leave half-updated data · don't let a failure let the user bypass a check
```

## Audit checklist

1. **Don't leak error details to the user.**
   Bad: `SQLSTATE[HY000] Access denied for user root`, `JWT_SECRET is missing from .../.env`,
   `Table users does not exist`. These help the developer — and the attacker.
   User gets a generic message ("The action failed, try again later" / "Not authorized" /
   "The submitted data is invalid"); full detail goes to the internal log.
   **CHECK:** raw exceptions / stack traces / DB errors returned in HTTP responses.

2. **A failure must not open a permission — Fail closed, not Fail open.**
   "Couldn't verify permission → block", never "couldn't verify → allow for now".
   **CHECK:** auth/role checks whose error path or default falls through to allow.

3. **No half-updated state.** Multi-step ops (create order → charge → update status → notify) must
   know what happens if a step fails. Use transactions, rollback, clear status, retry,
   compensation, idempotency.
   **CHECK:** multi-write operations with no transaction/rollback; a charge that can succeed while
   the order stays `pending`.

4. **Retry is not blind.** Limited attempts, backoff, attempt logged, duplicate prevention,
   idempotency — else the same charge/message/webhook fires repeatedly.
   **CHECK:** retry loops without an idempotency key or attempt cap.

5. **Different errors, different responses:** 401 not-authenticated · 403 authenticated-no-perm ·
   404 not-found · 422 bad-input · 429 too-many · 500 internal. But still don't over-disclose:
   on login, return "credentials are invalid", not "email exists but password wrong" (avoids user
   enumeration).
   **CHECK:** login/reset flows that reveal whether an account exists.

6. **External-vendor failures.** Assume vendors fail (payment provider, WhatsApp API timeout,
   Sheets schema change, SMS error). Define: retry? interim status? alert? manual fix? timeout?
   **CHECK:** external calls with no timeout / no failure path.

7. **Don't swallow critical errors.** `try { await chargeCustomer() } catch (e) { /* ignore */ }`
   makes the system *look* successful while a critical part failed. Critical errors must be logged,
   stop the flow if needed, return a proper status, raise an alert if severe.
   **CHECK:** empty/`// ignore` catch blocks around critical operations.

8. **Error messages: safe and clear.** Clear to the user, no internal detail, precise enough to act
   on. Bad: `Exception in UserRepository line 84`. Good: "Couldn't save right now, try again later"
   or "Phone number format is invalid".

Top-level rule — for every operation ask: what if the check fails · what if the DB is down · what
if the vendor doesn't answer · what if only half succeeded · does the user get too much internal
info · is it logged in the right place · is an alert needed · is the op safe to re-run.
