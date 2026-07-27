# 2. Decision Inputs

The LLM should collect the following information.

## 2.1 Product Type

Ask:

- What are we building?
- Is it for internal users, customers, community members, or the public?
- Is it content-heavy, workflow-heavy, data-heavy, or real-time?

## 2.2 User Model

Identify:

- Anonymous users
- One-time users
- Registered users
- Paying users
- Admins
- Moderators
- Community members
- Organization accounts
- Multi-tenant customers
- External API consumers

More complex user models usually require stronger backend structure.

## 2.3 Frontend Needs

Check:

- Static page only?
- Dynamic dashboard?
- SEO?
- Server-side rendering?
- Reusable UI components?
- Mobile-first?
- Real-time updates?
- Complex forms?
- File uploads?
- Admin UI?

## 2.4 Backend Needs

Check:

- CRUD only?
- Complex business logic?
- Background jobs?
- Webhooks?
- API integrations?
- Payments?
- Role-based access?
- Audit logs?
- Multi-tenancy?
- Heavy database logic?
- Real-time events?
- Queue processing?

## 2.5 Data and AI Needs

Check:

- AI agents?
- LLM integration?
- RAG?
- Embeddings?
- File parsing?
- Data pipelines?
- Image/video processing?
- Analytics?
- Reports?
- Automation workflows?

## 2.6 Scale and Performance

Check:

- Number of users now
- Number of users expected in 12 months
- Concurrent users
- Number of background jobs
- Data volume
- Real-time load
- API request volume
- Latency sensitivity

Do not over-engineer early unless scale is clearly required.

## 2.7 Team and Maintenance

Check:

- Who will build it?
- Who will maintain it?
- What languages does the team know?
- Is hiring relevant?
- Is speed more important than architecture?
- Is debugging at night realistic in this stack?

A stack the team understands is often better than a theoretically superior stack.

## 2.8 Security Requirements

Security posture must be determined before finalizing the stack.

For external (public-facing) projects:

- Security weight is high by default
- Auth must be robust (rate limiting, MFA support, session management)
- Input validation and output encoding are non-negotiable
- HTTPS is mandatory
- Dependency vulnerability scanning should be part of the workflow
- Consider OWASP Top 10 as a baseline checklist
- Audit logs are recommended

For internal (private/team-only) projects:

- Security can be lighter initially
- Quick wins that significantly raise security posture are acceptable:
  - IP allowlisting / firewall rules at VPS level
  - VPN-only access
  - HTTP Basic Auth as a temporary gate
  - Fail2ban or similar brute-force protection
- These measures can be added quickly without changing the stack

The LLM should ask: "Is this internal or external?" before scoring security weight.

---
