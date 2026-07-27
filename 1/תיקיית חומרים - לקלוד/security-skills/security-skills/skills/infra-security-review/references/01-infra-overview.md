# Infrastructure security (domain 2) — overview

The code can be perfect and the box still wide open. This skill audits **domain 2 — where the code
runs**: the reverse proxy, containers, published ports, TLS, and secrets/CI config. It is the sibling
of `secure-code-review` (domain 1, the code) and `agent-hardening-review` (the coding agent). Read-only:
the only file written is the gap report.

Central question:
```text
Can the environment that runs the system be reached, broken into, or made to leak — from outside?
```

## What's in scope (and which category audits it)
```text
network exposure / ports / proxy   → 02-network-and-ports        [network-exposure]
TLS / HTTPS / security headers      → 03-tls-and-headers          [tls-headers]
containers / images / compose       → 04-containers-and-images    [container-hardening]
secrets in env & CI                 → 05-secrets-and-ci           [secrets-config]
```

## What's NOT in scope (report as context, point elsewhere)
- Application-code vulns (IDOR, injection, authz) → `secure-code-review` / `/secure-audit`.
- The coding-agent's own config → `agent-hardening-review` / `/agent-harden-audit`.
- Live runtime confirmation (is the port actually reachable now?) → `runtime-verify`.
- Physical network segmentation / cloud IAM / firewall appliances → genuinely infra-ops; note as context.

## How findings are anchored
This is config, not law — anchor each finding to the **file + the specific directive/line** (e.g.
`docker-compose.yml: ports: "5432:5432"`, `nginx/default.conf: location /metrics`). Severity:
🔴 reachable-from-internet exposure or a committed secret · 🟡 missing hardening / weak default · 🔵 minor.

## Two layers always matter
- Many setups put **a front reverse proxy** (nginx / Traefik / a cloud load balancer) in front of
  containers that publish **host ports**. So check both: the **container/compose** `ports:` (what the host
  publishes) AND the **front proxy** config (what the internet actually reaches). A service can be safe at
  one layer and exposed at the other.
- If the repo keeps a **port-map file** (e.g. `PORT_MAP.md`), cross-check published ports against it — an
  undocumented or unexpectedly-public port is a finding. If there's no such file, infer the intended
  exposure from the compose/proxy config.
