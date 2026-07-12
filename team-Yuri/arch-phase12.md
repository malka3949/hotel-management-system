# Architecture Phase 12 — Production Deployment

## Context
Phase 12 makes the hotel management system production-ready and deployed to Render.com.

## Decisions

### ADR-12-01: Render.com over AWS/GCP
**Decision:** Deploy to Render.com.  
**Rationale:** Render MCP is available in the dev environment, enabling real deployment from the same session. AWS/GCP require manual VPC/IAM setup with credentials that are not available. Render handles SSL, load balancing, and connection pooling automatically.  
**Trade-off:** Less granular control than AWS; acceptable for a hotel chain system at this scale.

### ADR-12-02: ioredis for health check (not @nestjs/terminus)
**Decision:** Use ioredis directly in HealthService.  
**Rationale:** @nestjs/terminus adds significant complexity and dependencies. A direct PING via ioredis is simpler, auditable, and sufficient for a liveness/readiness probe.  
**Trade-off:** No built-in timeout indicator dashboard; mitigated by structured logs.

### ADR-12-03: Sentry over custom error aggregation
**Decision:** Use @sentry/node (backend) + @sentry/nextjs (frontend).  
**Rationale:** Sentry provides distributed tracing, source-map upload, issue grouping, and alerting out of the box. Building equivalent infrastructure is out of Phase 12 scope.  
**Trade-off:** Third-party dependency; Sentry free tier sufficient for initial production.

### ADR-12-04: X-Request-ID via middleware, not NestJS interceptor
**Decision:** Inject request ID in Express middleware, before NestJS request pipeline.  
**Rationale:** Middleware runs before guards and interceptors, ensuring the ID is available to all downstream logging including exception filters and response timing.

### ADR-12-05: exceljs type declaration (not @types/exceljs)
**Decision:** Write a minimal `src/types/exceljs.d.ts` declaration file.  
**Rationale:** No @types/exceljs package exists. The declaration provides just enough types to satisfy TypeScript strict mode without installing a third-party stub.  
This is a fix for a pre-existing Phase 10 issue that blocked the Phase 12 build.

## Architecture Diagram (Render)

```
[GitHub]
    │ push develop → CI (lint/build/docker-smoke)
    │ push main    → CI + manual approval → deploy
    ▼
[Render Web Service — hotel-management-backend]
    │ Docker (node:20-alpine, multi-stage)
    │ Health: GET /api/ready  (readiness probe)
    │ Liveness: GET /api/health (db + redis status)
    ▼
[Render PostgreSQL 16]     [Render Redis Key Value]
    hotel_management              hotel cache
```
