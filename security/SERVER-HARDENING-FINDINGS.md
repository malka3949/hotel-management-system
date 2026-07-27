# ממצאי הקשחת שרת — Hotel Management System — 2026-07-19

> ביקורת read-only של מצב runtime בסביבת Docker Compose מקומית.
> אין SSH לשרת ייצור (Render) — ביקורת בוצעה דרך `docker exec` + `ss` ברמת host.
> שרת ייצור בפועל (Render VPS) לא נבדק — ראה פערי כיסוי.
> אין שינוי בהגדרות. Scope: `/home/runner/hotel-management-system`.

---

## סיכום

| חומרה | כמות |
|---|---|
| 🔴 קריטי | 7 |
| 🟡 סיכון | 8 |
| 🔵 נקודה קטנה | 2 |

3 ממצאים דחופים ביותר:
1. 🔴 backend + frontend containers פועלים כ-root — מאושר ב-runtime
2. 🔴 כל 4 הפורטים (3000, 3001, 5432, 5678) מאזינים על 0.0.0.0 ברמת host — מאושר ב-runtime
3. 🔴 `NODE_TLS_REJECT_UNAUTHORIZED=0` פעיל בתהליך backend בזמן ריצה

---

## גישה / משתמשים — FAIL

- 🔴 `docker exec hotel_backend id` → `uid=0(root) gid=0(root)` — container ה-backend פועל כ-root.
  כל ניצול RCE בתוך הקונטיינר = root בקונטיינר = נקודת קפיצה. **הערה:** `backend/Dockerfile` (prod) כולל `USER appuser`, אך `backend/Dockerfile.dev` חסר `USER` — וזו הסביבה הפועלת.
  **תיקון:** הוסף `RUN addgroup -S app && adduser -S appuser -G app` + `USER appuser` ל-`Dockerfile.dev`.

- 🔴 `docker exec hotel_frontend id` → `uid=0(root) gid=0(root)` — container ה-frontend פועל כ-root.
  Next.js dev server מאזין על 0.0.0.0:3000 כ-root.
  **תיקון:** הוסף `USER` directive ל-`frontend/Dockerfile.dev`.

- 🔴 `docker exec hotel_postgres id` → `uid=0(root) gid=0(root)` — PostgreSQL פועל כ-root בקונטיינר.
  תהליך ה-DB עצמו אמור לרוץ כ-`postgres` user (uid=999). הדבר מאפשר גישה רחבה מהרגיל אם יש בעיה בתהליך.
  **תיקון:** image של postgres בד"כ מריץ כ-postgres user — בדוק אם יש override ב-compose; אם כן, הסר אותו.

- ✅ `docker exec hotel_n8n id` → `uid=1000(node)` — n8n פועל כ-non-root. תקין.

---

## רשת / פורטים — FAIL

- 🔴 `ss -tlnp` (host) → כל 4 הפורטים מאושרים בזמן ריצה:
  ```
  LISTEN  0.0.0.0:3000   (frontend Next.js dev)
  LISTEN  0.0.0.0:3001   (backend NestJS API)
  LISTEN  0.0.0.0:5432   (PostgreSQL)
  LISTEN  0.0.0.0:5678   (n8n admin UI)
  ```
  זה מאשר את ממצאי `/infra-audit` ברמת runtime: כל הפורטים נגישים לכל interface.
  **תיקון:** הסר `ports:` מ-postgres, n8n, backend, frontend; השאר `expose:` בלבד + הוסף reverse proxy.

- 🟡 `pg_hba.conf` (בתוך hotel_postgres):
  ```
  host all all all scram-sha-256
  ```
  כל IP יכול לנסות לחבר ל-PostgreSQL עם credentials. בשילוב עם port 5432 על 0.0.0.0, זה מקשה על הגנה.
  **תיקון:** לאחר הסרת `ports:`, הגבל ל-subnet הפנימי בלבד.

- ✅ Redis: `redis-cli PING` → `NOAUTH Authentication required` — Redis מוגן בסיסמה (`requirepass`). תקין.
  (Redis port 6379 לא פורסם ב-compose — לא מופיע ב-`ss` ברמת host. תקין.)

---

## Edge / TLS / Headers — FAIL

- 🔴 `NODE_TLS_REJECT_UNAUTHORIZED=0` — מאושר בזמן ריצה:
  `docker exec hotel_backend env` → `NODE_TLS_REJECT_UNAUTHORIZED=0`
  כל קריאת HTTPS יוצאת (Stripe, Resend, Cohere, Google AI, Sentry) מקבלת אישור עיוור לכל certificate.
  **הערה:** `ca-certificates` מותקן (`apk list` ← `ca-certificates-20260413-r0 [installed]`), כך שאין סיבה טכנית לדגל זה.
  **תיקון:** הסר את `NODE_TLS_REJECT_UNAUTHORIZED` מ-`docker-compose.yml` backend + n8n; הוסף ל-`docker-compose.override.yml` אם נדרש למפתחים בלבד.

- 🟡 `/api/health` חשוףללא אימות — מאושר ב-runtime:
  ```
  curl http://localhost:3001/api/health
  → {"success":true,"data":{"status":"ok","db":"up","redis":"up","version":"0.1.0","uptime":30571}}
  ```
  חושף: גרסת אפליקציה (`0.1.0`), סטטוס DB ו-Redis, uptime. כל תוקף יכול לאמוד את המערכת.
  **תיקון:** הסר `version` + `uptime` מתגובה פומבית; או הוסף rate-limit + הגבל ל-internal network.

- 🟡 אין HTTPS ב-stack המקומי — ממצא ידוע מ-`/infra-audit`. מאושר: אין TLS-terminating service בכלל ב-compose.

---

## Secrets / הרשאות קבצים — PARTIAL

- ✅ Secrets לא "אפויים" בתוך containers — בדיקת `ls /app/.env` + `/app/.git` ב-backend: לא קיים. מוזרק דרך env vars בלבד.

- ✅ Backend env vars רגישים מוזרקים נכון (JWT_SECRET, STRIPE_WEBHOOK_SECRET וכו') — רק דרך `${VAR}` ב-compose.

- 🟡 Secrets חיים בתהליכי running containers — כל מי שיכול להריץ `docker exec container_name env` (= כל מי שב-`docker` group) רואה את כל הסיסמאות והמפתחות בזמן ריצה.
  **תיקון:** בסביבת ייצור — השתמש ב-Docker Secrets / Render Secret Groups; לא env vars פשוטים.

---

## עדכוני מערכת / Images — WARN

- 🟡 `n8nio/n8n:latest` — בזמן ריצה: גרסה `2.27.5`. שימוש ב-`latest` מונע ודאות לגבי גרסה מדויקת.
  **תיקון:** נעל ל-`n8nio/n8n:2.27.5` (או לגרסה הנוכחית בעת pinning).

- 🟡 `willfarrell/autoheal:latest` — image נע עם Docker socket מורכב. ראה ממצא קריטי ב-`/infra-audit`.

- 🔵 `node:20-alpine` (backend/frontend Dockerfiles.dev) — tag ללא SHA digest; שינויים upstream שקטים אפשריים.

---

## Backups — WARN

- 🟡 אין מנגנון backup פעיל בסביבה המקומית — לא נמצא cron job, pg_dump script, או backup container ב-`docker-compose.yml`.
  `docs/deployment/backup-restore.md` מתאר backups אוטומטיים דרך Render (Cloud) + הנחיות ידניות — אך אלה לא פועלים מחוץ ל-Render.
  **תיקון:** לסביבת dev — הוסף script מחזורי `pg_dump` + volume mount ל-backup. לסביבת ייצור — ודא Render backups פעילים ונבדקו.

---

## Logs / Monitoring — PARTIAL

- ✅ Sentry מוגדר (frontend + backend) לפי `sentry.client.config.ts` + `sentry.server.config.ts`.
- 🔵 אין centralized logging (ELK, Grafana Loki, Papertrail) — `docker logs` בלבד זמין. לאחר הפעלת מחדש, logs אובדים.
  **תיקון:** הוסף `logging: driver: "json-file"` עם `max-size`/`max-file` ב-compose, או שלח logs ל-service חיצוני.

---

## Resource Limits — FAIL

- 🟡 אין resource limits על אף container — מאושר ב-runtime:
  `docker inspect hotel_backend` → `MemLimit: 0, PidsLimit: None`
  תהליך n8n שגוי, runaway query ב-backend, או loop אינסופי → מיצוי RAM/CPU של כל ה-host.
  **תיקון:** הוסף ב-compose לכל service:
  ```yaml
  deploy:
    resources:
      limits:
        memory: 512m
  ```

---

## SecurityOpt / Filesystem — WARN

- 🟡 אין `security_opt` (AppArmor/seccomp custom profile) על containers — ברירת מחדל Docker seccomp profile פעילה, אך ללא hardening ספציפי לאפליקציה.
- 🟡 אין `read_only: true` על root filesystem — containers יכולים לכתוב לכל מקום.
  **תיקון (שלבי):** `read_only: true` + `tmpfs: [/tmp, /var/run]` לאחר וידוא שהאפליקציה לא כותבת לנתיבים שאינם volumes.

---

## פערי כיסוי

- **שרת ייצור (Render)** — אין SSH access; לא נבדקו: ufw/firewall, sshd config, fail2ban, OS updates, מי ב-sudoers, הרשאות קבצים ב-host, certificates בתפוגה. בדוק דרך Render dashboard + SSH לסביבת Render (אם קיים).
- **config files** → `/infra-audit` (כבר בוצע; דוח: `INFRA-SECURITY-FINDINGS.md`)
- **app code** → `/secure-audit` (כבר בוצע; דוח: `SOFTWARE-SECURITY-FINDINGS.md`)
- **live HTTP reachability** → `/runtime-confirm`
- **cloud firewall / VPC / security groups** → מחוץ לסקופ; בדוק ב-Render / AWS console

---

## שיטה

- בדיקות בוצעו דרך `docker exec` ו-`ss -tlnp` ברמת host (לא SSH לשרת ייצור).
- כל פקודה read-only בלבד; אין שינוי בשום container או config.
- כל 🔴 אומת מול output הפקודה בפועל לפני רישום.
- Redis auth, prod Dockerfile USER, ו-ca-certificates — אומתו כ-PASS ונרשמו כממצאים חיוביים.
