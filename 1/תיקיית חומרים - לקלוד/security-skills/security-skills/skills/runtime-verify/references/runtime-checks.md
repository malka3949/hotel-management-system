# Runtime confirmation — what to probe and how (safely)

This is the **one** tool in the audit suite that is **not read-only**: it sends real HTTP requests to a
running instance (and optionally boots a disposable stack). Its job is narrow and high-value: **confirm
the confirmable static findings at runtime** — turn a "config says exposed" into "HTTP 200, here's the
body" — not to re-discover everything (that's full DAST, future work).

## Safety rules (non-negotiable)
```text
✗ never point at production (no prod hostnames/IPs) — local/staging/disposable only
✗ never send destructive requests (no DELETE/PUT/POST that mutates real data) unless explicitly told
✗ no brute-force / high-volume / fuzzing — a handful of targeted probes per finding
✓ require an explicit base URL OR an explicit "boot the stack" opt-in
✓ prefer GET / HEAD / OPTIONS; for IDOR use two low-privilege accounts, read-only endpoints
✓ stop and report if the target looks like production or is unreachable
```

## Which findings are runtime-confirmable
| Finding type | Probe | Confirmed when |
|---|---|---|
| Unauth endpoint (`/metrics`, `/api/files/contracts/...`, admin) | `GET` with **no** auth header | 200 + sensitive body (not 401/403) |
| Missing security header (HSTS/CSP/X-Frame…) | `curl -sI` | header absent in response |
| HTTP not redirected to HTTPS | `GET http://…` | 200 instead of 301→https |
| Verbose error leak | request a bad route / malformed input | stack trace / DB error / framework banner in body |
| IDOR (ownership) | auth as user A, `GET` user B's resource id | 200 with B's data |
| Missing rate-limit | ~10 rapid `GET`s to login/OTP | no 429 / no slowdown |
| Open CORS | `curl -H 'Origin: https://evil.test' -I` | `Access-Control-Allow-Origin` reflects it (+credentials) |
| Server banner | `curl -sI` | `Server:`/`X-Powered-By` discloses version |

## Which are NOT runtime-confirmable here (leave to static)
Source-only facts: hard-coded fallback secret, plaintext token in DB, mass-assignment in code,
fail-open catch, a committed secret. These have no clean black-box probe → keep them static-only and say so.

## How to probe (read-only verbs, minimal volume)
```bash
curl -sS -o /tmp/body -w '%{http_code}' -m 10 "$BASE/metrics"          # status + body
curl -sSI -m 10 "$BASE/"                                                # headers only
curl -sS -m 10 -H 'Origin: https://evil.test' -I "$BASE/api/..."       # CORS reflection
# IDOR: obtain two test tokens out-of-band, then GET the other's id
curl -sS -m 10 -H "Authorization: Bearer $TOKEN_A" "$BASE/api/settlements/$B_ID/pdf"
```

## Booting a disposable instance (only if no base URL given AND user opted in)
- Use an **isolated** compose project (`-p audit_tmp`) / a git worktree copy; bind to localhost.
- `docker compose -p audit_tmp up -d`, wait for health, set `BASE=http://127.0.0.1:<port>`.
- **Tear down** afterward (`docker compose -p audit_tmp down -v`), never touch the user's running stack.
- If booting is risky or fails, stop and ask for a base URL instead.

## Verdicts
```text
confirmed       — the probe reproduced the issue (include status + a short evidence snippet)
not-reproduced  — probe ran, issue did NOT appear (e.g. 401 where static expected 200) → likely false positive
inconclusive    — couldn't probe (auth needed, unreachable, ambiguous) → say why
not-applicable  — finding is source-only, no black-box probe
```
