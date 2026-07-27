# Containers, images & compose — deep dive

Category: `container-hardening`. Audits `Dockerfile*`, `docker-compose*.yml`, `.dockerignore`.

## AUDIT CHECK

### 1. Run as non-root
- Container should drop to a non-root `USER`; root in-container + a container escape = host root.
- **CHECK:** `Dockerfile` has no `USER` directive (runs as root); compose `user:` absent on a service that could use one.

### 2. Base image pinning & provenance
- Base images pinned (digest or specific tag, not `latest`); from trusted sources.
- **CHECK:** `FROM node:latest` / `FROM ubuntu` (floating) → non-reproducible + unpatched drift.

### 3. No secrets baked into the image
- Secrets must not be `COPY`'d in, `ENV`'d in, or left in a build layer (layers are extractable).
- **CHECK:** `.env`/keys `COPY`'d into the image; `ENV SECRET=...`; `ARG` secret used in a `RUN` that persists; missing `.dockerignore` (drags `.env`, `.git` into the build context/image).

### 4. Dangerous compose/run flags
```text
privileged: true            — near-host-root; almost never needed
network_mode: host          — bypasses network isolation
cap_add: [SYS_ADMIN, ...]   — broad capabilities
volumes: /var/run/docker.sock:... — container can control the Docker daemon = host takeover
volumes: /:/host            — host filesystem mounted in
```
- **CHECK:** any of the above. Docker-socket mount or `privileged` on an internet-adjacent service = 🔴.

### 5. Hardening niceties
- `read_only: true` rootfs where possible; resource limits (`mem_limit`, `pids_limit`); `restart` policy;
  healthchecks. Missing = 🔵–🟡, defense-in-depth.

## Output (findings)
```text
🔴 container runs as root (no USER) on an internet-facing service.
🔴 docker.sock mounted into a container / privileged: true / network_mode: host without need.
🔴 secret COPY'd or ENV'd into the image (extractable from layers).
🟡 base image floating (latest/untagged); no .dockerignore (.env/.git in build context).
🟡 broad cap_add; no resource limits.
🔵 no read-only rootfs / healthcheck.
```
