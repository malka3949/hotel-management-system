# Hotel Chain Management System — Architecture Plan

## Document Purpose
This document defines the high-level software architecture for the Hotel Chain Management System described in the provided PRD.

This architecture is intended for:
- Executive approval
- Engineering implementation guidance
- Infrastructure planning
- Security governance
- Future SaaS scalability
- Development phase enforcement

---

# 1. Architectural Vision

The system will be built as a centralized enterprise-grade operational platform for hotel chains.

Primary architectural objectives:
- Centralized operations across all hotel branches
- Real-time operational consistency
- High availability
- Strict branch-level data isolation
- Secure role-based access control
- Expandable SaaS-ready foundation
- Operational simplicity for hotel staff
- Modular service-oriented architecture

The system is NOT initially designed as a marketplace or public booking platform.
The MVP focuses on operational excellence and centralized management.

---

# 2. Recommended Technology Stack

## 2.1 Frontend

### Web Application
Recommended:
- React
- Next.js
- TypeScript

Reason:
- Enterprise-ready ecosystem
- Excellent dashboard capabilities
- Strong maintainability
- High developer availability
- Supports future public portal scaling

### UI Framework
Recommended:
- Tailwind CSS
- shadcn/ui

Reason:
- Fast enterprise interface development
- Consistent design system
- Easy maintenance

---

## 2.2 Backend

Recommended:
- Node.js
- NestJS framework
- TypeScript

Reason:
- Excellent modular architecture
- Strong support for enterprise APIs
- Built-in dependency injection
- Scalable service structure
- Excellent fit for real-time operations

Alternative allowed:
- Java + Spring Boot

NOT approved:
- PHP
- WordPress-based systems
- Low-code platforms

---

## 2.3 Database

Primary database:
- PostgreSQL

Reason:
- ACID compliance (important for reservations/payments)
- Excellent relational integrity
- Strong scaling capabilities
- Advanced indexing
- Multi-tenant readiness

Additional storage:
- Redis

Usage:
- Session caching
- Real-time availability caching
- Queue coordination
- Performance optimization

---

## 2.4 Infrastructure

Recommended cloud:
- Amazon Web Services (AWS)

Alternative approved:
- Google Cloud Platform

Initial deployment:
- Containerized deployment using Docker
- Kubernetes postponed until Phase 2 unless scale requires earlier adoption

Reason:
- MVP should prioritize operational simplicity
- Avoid premature infrastructure complexity

---

## 2.5 Authentication

Recommended:
- JWT access tokens
- Refresh token architecture
- Role-Based Access Control (RBAC)

Mandatory:
- Multi-branch permission scoping
- Audit logging
- Session invalidation support
- Device/session tracking

---

## 2.6 Payments

Recommended providers:
- Stripe
- Tranzila (Israel support)

Architecture requirement:
Payments MUST be abstracted behind a Payment Service layer.

Reason:
- Future provider replacement
- Multi-country expansion
- Reduced vendor lock-in

---

# 3. High-Level System Architecture

## 3.1 Core Architectural Modules

### Core Modules

1. Authentication & Authorization Service
2. Branch Management Service
3. Reservation Service
4. Room Management Service
5. Front Desk Operations Service
6. Guest Management Service
7. Housekeeping Service
8. Billing & Payments Service
9. Reporting & Dashboard Service
10. Notification Service
11. Audit & Logging Service
12. Guest Portal Service

---

## 3.2 Architectural Style

MVP Architecture:
- Modular Monolith

NOT microservices initially.

Reason:
- Faster MVP stabilization
- Reduced operational complexity
- Easier debugging
- Easier consistency handling
- Lower infrastructure cost

IMPORTANT:
The modular boundaries MUST be strictly enforced.
The system should be designed so services can later be extracted into microservices if required.

In Russian we say: “First build strong house, then make many rooms.”

---

# 4. Multi-Branch Data Architecture

## 4.1 Tenant Isolation Strategy

MVP strategy:
- Shared database
- Branch-scoped data isolation

Every business entity MUST contain:
- branch_id

Mandatory backend enforcement:
- Permission filtering
- Query scoping
- Audit validation

Chain admins:
- Cross-branch visibility

Branch employees:
- ONLY assigned branch visibility

---

# 5. Core Domain Model

## 5.1 Main Entities

### Organizational
- Chain
- Branch
- Employee
- Role
- Permission

### Reservations
- Reservation
- ReservationGuest
- ReservationStatus
- ReservationPayment

### Rooms
- Room
- RoomType
- RoomStatus
- CleaningStatus

### Guests
- Guest
- GuestProfile
- GuestDocument

### Financial
- Invoice
- Payment
- Charge
- Refund

### Operations
- CheckIn
- CheckOut
- HousekeepingTask
- AuditLog

---

# 6. Reservation Integrity Rules

Reservation integrity is business-critical.

Mandatory protections:

## 6.1 Overbooking Prevention

System MUST:
- Use transactional reservation locking
- Validate room availability before confirmation
- Prevent concurrent room assignment conflicts
- Prevent race conditions

Mandatory:
- Database transactions
- Optimistic locking
- Conflict retry handling

No shortcuts allowed.

---

# 7. Security Architecture

## 7.1 Mandatory Security Standards

Required:
- HTTPS only
- Encrypted secrets management
- Role-based authorization
- Audit logs
- Password hashing using bcrypt or Argon2
- SQL injection protection
- Cross-site scripting protection
- CSRF protection
- API rate limiting
- Session expiration

---

## 7.2 Audit Requirements

The following actions MUST be audited:
- Reservation modifications
- Payment operations
- Refunds
- Permission changes
- Check-ins/check-outs
- Invoice changes

Audit logs MUST be immutable.

---

# 8. Real-Time Requirements

The following features require near real-time updates:
- Room availability
- Reservation updates
- Housekeeping statuses
- Dashboard statistics
- Front desk occupancy

Recommended technology:
- WebSockets

Fallback:
- Polling allowed only during early MVP if operationally necessary.

---

# 9. Reporting Architecture

## 9.1 Reporting Requirements

Dashboards:
- Occupancy
- Revenue
- Future reservations
- Cancellations
- Cross-branch comparison

Reporting architecture MUST:
- Separate operational transactions from heavy analytics queries
- Use read-optimized queries
- Avoid blocking reservation workflows

Recommended:
- Reporting read replicas in future phases

---

# 10. Guest Portal Architecture

## MVP Scope

Guests can:
- View reservations
- Perform online check-in
- Complete payments
- Access invoices

Portal isolation requirements:
- Guests MUST access ONLY their reservations
- Secure tokenized reservation access
- Expiring guest access links

---

# 11. Notification Architecture

## Required Notification Types

- Reservation confirmation
- Payment confirmation
- Check-in reminders
- Cancellation confirmation
- Invoice delivery

Recommended providers:
- SendGrid
- AWS SES

SMS support postponed.

---

# 12. Non-Functional Requirements

## 12.1 Availability

MVP target:
- 99.5% uptime

Future target:
- 99.9%

---

## 12.2 Performance

Target response times:
- Standard API requests: < 500ms
- Dashboard loading: < 2 seconds
- Reservation creation: < 1 second

---

## 12.3 Scalability

Initial scale target:
- 50 branches
- 5000+ rooms
- 500 concurrent staff users
- 5000 guest sessions/day

Architecture MUST support horizontal scaling.

---

# 13. API Architecture

## API Style

Recommended:
- REST API

Internal standards:
- Versioned APIs
- OpenAPI documentation
- Consistent error responses
- Central validation layer

Example:
- /api/v1/reservations

---

# 14. Observability & Monitoring

Mandatory:
- Centralized logging
- Error tracking
- Performance monitoring
- API metrics
- Infrastructure monitoring

Recommended stack:
- Grafana
- Prometheus
- Sentry

---

# 15. DevOps Requirements

## CI/CD

Mandatory:
- Automated testing
- Linting
- Security scanning
- Staging environment
- Production approval gates

Deployment strategy:
- Blue/Green deployment preferred

---

# 16. Development Phases

## Phase 1 — Platform Foundation

Deliverables:
- Project infrastructure
- Authentication
- Authorization
- Branch architecture
- Database foundation
- CI/CD
- Audit infrastructure

Exit Criteria:
- Secure login operational
- Branch isolation validated
- RBAC validated
- Infrastructure deployable

---

## Phase 2 — Core Hotel Operations

Deliverables:
- Reservation system
- Room management
- Front desk operations
- Guest profiles
- Overbooking prevention

Exit Criteria:
- Reservation workflows stable
- Conflict prevention validated
- Operational workflows functional

---

## Phase 3 — Financial Operations

Deliverables:
- Payment processing
- POS integration
- Invoice generation
- Refund workflows

Exit Criteria:
- Financial audit validation
- Payment reconciliation successful

---

## Phase 4 — Guest Portal

Deliverables:
- Online check-in
- Guest reservation access
- Guest payment flows

Exit Criteria:
- Guest self-service operational
- Security validation complete

---

## Phase 5 — Reporting & Dashboards

Deliverables:
- Operational dashboards
- Cross-branch reporting
- Real-time metrics

Exit Criteria:
- Dashboard performance validated
- Reporting accuracy approved

---

## Phase 6 — Operational Stabilization

Deliverables:
- Load testing
- Security hardening
- Backup validation
- Monitoring completion

Exit Criteria:
- Production readiness approval

---

# 17. Required Engineering Standards

Mandatory engineering standards:

## Code Standards
- TypeScript strict mode
- ESLint enforcement
- Prettier formatting
- Modular folder structure
- No circular dependencies

## Testing Standards
- Unit tests mandatory
- Integration tests mandatory
- Reservation conflict tests mandatory
- Payment tests mandatory

Minimum coverage:
- 80%

---

# 18. Architecture Risks

## Critical Risks

### Reservation Race Conditions
Risk level: Critical
Mitigation:
- Transactional locking
- Concurrency testing

### Payment Failure States
Risk level: Critical
Mitigation:
- Idempotent payment operations
- Retry-safe architecture

### Permission Leakage
Risk level: Critical
Mitigation:
- Centralized authorization middleware
- Automated permission testing

---

# 19. Recommended Team Structure

Minimum recommended team:

- 1 Technical Lead
- 2 Backend Engineers
- 2 Frontend Engineers
- 1 QA Engineer
- 1 DevOps Engineer
- 1 UI/UX Designer

Optional:
- Product Manager

For product balancing maybe ask Tika later. She likes spreadsheets too much, but useful woman.

---

# 20. What You Should Do Next

## Immediate Next Steps

### Step 1 — Approve Architecture
You review and approve:
- Technology stack
- Development phases
- Infrastructure direction
- Security standards

### Step 2 — UI/UX Design
Before coding begins:
- Create system wireframes
- Define operational workflows
- Define dashboards
- Define user journeys

Mandatory.
Do NOT allow developers to invent flows during implementation.

### Step 3 — Engineering Repository Setup
Create:
- Git repositories
- Branch strategy
- CI/CD pipeline
- Environment structure

### Step 4 — Phase 1 Detailed Design
Next document should be:
- Phase 1 Detailed Design (DD)

This will include:
- Database schema
- Authentication flows
- Permission architecture
- API contracts
- Infrastructure topology

Do NOT begin implementation before DD approval.

### Step 5 — Development Execution
Engineering team implements ONLY approved phase.
No uncontrolled expansion.

### Step 6 — Architecture Validation
After each phase:
- Engineering submits validation document
- Architecture review performed
- Deviations rejected if required

---

# 21. Final Architectural Position

This system MUST be treated as:
- Enterprise operational software
- Financially sensitive platform
- Real-time operational infrastructure

Therefore:
- Stability is more important than feature count
- Data consistency is non-negotiable
- Security is mandatory
- Operational simplicity is critical

The MVP should remain focused.
No AI features initially.
No premature microservices.
No infrastructure overengineering.

Build stable foundation first.
Then scale.

