# Phase 9 — Production Deployment

## Purpose

Make the system production-ready: hardened environment configuration, complete observability stack, database migration strategy, and live deployment. This is the gate before the system goes live for real hotel operations.

---

## Big Picture

All previous phases built and validated the application. Phase 9 is about operational excellence: the system must survive real load, be monitorable when things go wrong, recover from failures, and be deployable without downtime.

The MVP targets 99.5% uptime, < 500ms API response, and < 2s dashboard load — all must be measured and verified here before go-live.

Architecture ref: ARCHITECTURE.md § 12 NFR, § 14 Observability, § 15 DevOps

---

## Scope

### In Scope
- Production environment configuration (env vars, secrets management)
- Docker production images (multi-stage build, minimal image size)
- Deployment to cloud (AWS or GCP — per ARCHITECTURE.md § 2.4)
- Database production setup: connection pooling (PgBouncer), backups, point-in-time recovery
- Redis production setup with persistence
- Centralized logging (structured JSON logs, shipped to log aggregator)
- Error tracking (Sentry integration)
- Performance monitoring (API response time metrics)
- Health check endpoints for load balancer
- CI/CD pipeline: staging → approval gate → production
- Load testing (k6 or Artillery): 500 concurrent staff users
- Backup validation: restore drill
- SSL/TLS setup (HTTPS enforced)
- Blue/Green deployment strategy

### Out of Scope
- Kubernetes (deferred unless load requires — ARCHITECTURE.md § 2.4)
- Read replicas (planned for Phase 2 product expansion)
- Multi-region deployment
- CDN for frontend assets (optional but recommended)

---

## Technical Requirements

| Requirement | Target |
|---|---|
| Uptime | 99.5% |
| API response p95 | < 500ms |
| Dashboard load | < 2 seconds |
| DB connections | PgBouncer pool, max 100 connections |
| Backup frequency | Daily automated snapshot |
| Log retention | 30 days minimum |
| Error tracking | Sentry (all unhandled exceptions) |
| Deployment | Zero-downtime (blue/green or rolling) |
| Secrets | AWS Secrets Manager or GCP Secret Manager — never in `.env` in production |

---

## Tasks

### Infrastructure
- [ ] Create production VPC, subnets, security groups (AWS/GCP)
- [ ] Provision PostgreSQL 16 (RDS or Cloud SQL) — multi-AZ for production
- [ ] Provision Redis 7 (ElastiCache or Memorystore)
- [ ] Setup PgBouncer connection pooler in front of PostgreSQL
- [ ] Configure automated daily DB snapshots with 7-day retention
- [ ] Document restore procedure and run restore drill
- [ ] Setup load balancer (ALB or GCP LB) with health checks
- [ ] Configure SSL certificate (ACM or Let's Encrypt)
- [ ] Enforce HTTPS redirect (HTTP → 301 → HTTPS)

### Backend
- [ ] Multi-stage Dockerfile: build stage + runtime stage (node:20-alpine)
- [ ] Production `docker-compose.yml` or ECS task definition
- [ ] Structured JSON logging (`winston` or `pino`) — include: timestamp, level, requestId, userId, branchId
- [ ] `GET /api/health` — returns: `{ status, db, redis, version }` (liveness probe)
- [ ] `GET /api/ready` — readiness probe (used by load balancer)
- [ ] Sentry SDK integration — capture all unhandled exceptions with request context
- [ ] Request ID middleware — inject `X-Request-ID` on every request
- [ ] Response time middleware — log duration for every request
- [ ] Graceful shutdown: drain in-flight requests before exit
- [ ] Migrate secrets to AWS Secrets Manager / environment injection (no `.env` in prod)

### Frontend
- [ ] Production Next.js build (`next build`)
- [ ] Deploy to Vercel or AWS CloudFront + S3
- [ ] Configure environment variables for production API URL
- [ ] Sentry integration for frontend (unhandled errors + performance)
- [ ] Verify RTL layout on production domain

### CI/CD
- [ ] GitHub Actions: `test` → `lint` → `typecheck` → `build` on every PR
- [ ] Staging environment: auto-deploy on merge to `develop`
- [ ] Production pipeline: manual approval gate → deploy to production
- [ ] Database migration step in deployment pipeline (`prisma migrate deploy`)
- [ ] Rollback plan: previous Docker image tagged and kept for 7 days
- [ ] Blue/Green: deploy new version → health check passes → switch traffic → terminate old

### Load Testing
- [ ] Write k6 or Artillery test scenarios:
  - 500 concurrent staff users
  - Scenario: login → view reservations → create reservation → check-in → check-out
- [ ] Run load test against staging
- [ ] Verify: p95 API response < 500ms under load
- [ ] Verify: DB connection pool does not exhaust under load
- [ ] Fix any bottlenecks before go-live

### Monitoring
- [ ] API metrics dashboard: request rate, error rate, p50/p95/p99 latency
- [ ] Infrastructure dashboard: CPU, memory, DB connections, Redis memory
- [ ] Alert: error rate > 1% for 5 minutes → PagerDuty/Slack
- [ ] Alert: p95 latency > 1 second for 5 minutes
- [ ] Alert: DB connection pool > 80% utilization

---

## Expected Deliverables

1. System running in production with HTTPS
2. CI/CD pipeline: PR test → staging auto-deploy → production manual-gate
3. Liveness and readiness probes functioning (load balancer health checks pass)
4. Sentry capturing errors with full context
5. Structured logs shipped to log aggregator
6. Load test passing: 500 concurrent users, p95 < 500ms
7. DB backup restore drill completed and documented
8. Monitoring dashboards live with alerts configured

---

## Validation Checklist

- [ ] HTTPS enforced — HTTP requests redirect to HTTPS
- [ ] `GET /api/health` returns `{ status: "ok", db: "connected", redis: "connected" }`
- [ ] Load test: 500 concurrent users — no `5xx` errors, p95 < 500ms
- [ ] DB restore drill: restore from yesterday's snapshot, verify data integrity
- [ ] Sentry captures a test error with correct user/branch context
- [ ] Deployment pipeline: merge to `develop` → staging deployed within 5 minutes
- [ ] Production deployment: manual gate works, deployment completes without downtime
- [ ] Monitoring alert triggers correctly on simulated high error rate
- [ ] SSL certificate valid, no mixed-content warnings
- [ ] Rollback tested: previous version deployable within 5 minutes
- [ ] Secrets: zero hardcoded credentials in production Docker images or source

---

## Exit Criteria (Go-Live Gate)

All of the following must be true before system is open to real hotel operations:

1. Load test passed (500 concurrent, p95 < 500ms)
2. DB backup and restore drill completed
3. HTTPS enforced
4. Sentry error tracking live
5. Monitoring alerts configured and tested
6. CI/CD pipeline: staging and production gates working
7. Production approval sign-off from technical lead
8. Rollback procedure documented and tested
