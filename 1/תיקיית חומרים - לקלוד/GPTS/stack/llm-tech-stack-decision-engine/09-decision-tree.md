# 9. Decision Tree

## Step 1: Is this mostly content/marketing?

If yes:

- Need CMS? WordPress / Headless CMS + Next.js
- Need custom app logic? Next.js + backend

If no, continue.

## Step 2: Is SEO important?

If yes:

- Prefer Next.js, Nuxt, Django templates, Rails views, or Laravel Blade
- For React-heavy apps, prefer Next.js

If no:

- SPA + API is acceptable
- Internal tools can use React/Vue + backend API

## Step 3: Is this a custom business app or SaaS?

If yes:

- Need fastest MVP? Rails / Laravel
- Need JS end-to-end? Next.js + Node/TypeScript
- Need AI/data logic? Django/FastAPI + React/Next.js

## Step 4: Is real-time core to the product?

If yes:

- Medium scale: Node.js + WebSockets + Redis
- High scale: Go + Redis/Kafka/NATS
- Frontend: React/Next.js

## Step 5: Is AI/data processing core?

If yes:

- Python should be included
- Use FastAPI for AI APIs
- Use background workers
- Keep AI services separate if the main app is not Python

## Step 6: Is performance the main risk?

If yes:

- Prefer Go for services
- Consider Rust only for extreme cases
- Avoid overusing dynamic-language monoliths for hot paths

## Step 7: Is the team strongest in one stack?

If yes:

- Prefer the team’s known stack unless it clearly conflicts with project needs

## Step 8: Is deployment environment constrained?

Default environment: Contabo VPS/VDS, Ubuntu 24.04, aaPanel, Docker.
All options below assume Docker on VPS with aaPanel unless stated otherwise.

If VPS/Docker with aaPanel (default):

- Node, Python, Go, Rails, Laravel are all viable
- Prefer Docker Compose for single-server setups
- aaPanel handles Nginx reverse proxy, SSL, and virtual host configuration
- No need for a separate reverse proxy or SSL tool

If shared hosting:

- PHP/Laravel may be simpler
- Avoid Node/Python/Go unless the host supports them explicitly

If serverless (non-default, must be explicitly requested):

- Next.js / Node / Python functions may fit
- Note: serverless is not preferred; use only if there is a specific reason

If enterprise cloud:

- .NET / Java / Kubernetes may fit

## Step 9: Is this external or internal?

If external (public-facing):

- Apply high security weight (see section 2.8)
- Auth, HTTPS, rate limiting, and input validation are mandatory
- Audit logs are recommended

If internal (private/team-only):

- Apply medium security weight
- Quick wins (IP restriction, VPN, Fail2ban) are sufficient initially
- Can move faster on architecture without full security hardening from day one

---
