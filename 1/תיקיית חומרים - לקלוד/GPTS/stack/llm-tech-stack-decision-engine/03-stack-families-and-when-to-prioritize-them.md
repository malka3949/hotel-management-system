# 3. Stack Families and When to Prioritize Them

## 3.1 JavaScript / TypeScript Ecosystem

### Relevant technologies

- JavaScript
- TypeScript
- Node.js
- React
- Next.js
- Vue
- Nuxt
- Express
- Fastify
- NestJS
- Prisma
- Drizzle
- tRPC

### Prioritize when

Use this ecosystem when:

- The project is web-first
- The same developer/team handles frontend and backend
- Fast iteration is important
- There are many integrations
- Real-time features may be needed
- The team already knows JavaScript
- You want one language across the stack

### Prefer TypeScript over JavaScript when

Use TypeScript when:

- The project is not tiny
- Multiple developers are involved
- Long-term maintenance matters
- APIs and data models are important
- Bugs from loose typing would be costly

Use plain JavaScript only when:

- The project is very small
- It is a quick script
- The developer intentionally wants low ceremony

### When to choose Node.js

Choose Node.js when:

- You need APIs
- You need webhooks
- You need integrations
- You need real-time events
- You want fast backend development
- You want to share types with the frontend

Avoid Node.js as the only backend when:

- The system is heavily CPU-bound
- You need serious data science
- You need low-level performance
- The team has no JS experience

### When to choose React

Choose React when:

- The frontend is interactive
- You need custom UI
- You need reusable components
- You expect product complexity to grow
- You want maximum ecosystem support

Avoid React when:

- It is just a simple static website
- You need a very simple admin panel and no custom UX
- The team is not comfortable with frontend complexity

### When to choose Next.js

Choose Next.js when:

- SEO matters
- Public pages and logged-in app coexist
- Server-side rendering is useful
- You want full-stack React
- You need hybrid static/dynamic pages
- You want a strong deployment story

Avoid Next.js when:

- It is only an internal dashboard
- There is no SEO need
- You only need a backend API
- You want to keep frontend and backend fully separate

---

## 3.2 PHP Ecosystem

### Relevant technologies

- PHP
- Laravel
- Symfony
- WordPress

### Prioritize when

Use PHP when:

- The team knows PHP
- Hosting simplicity matters
- The project is CRUD-heavy
- You need fast backend delivery
- You are building admin panels, portals, forms, or business apps
- You need strong traditional web development patterns

### When to choose Laravel

Choose Laravel when:

- You want a batteries-included framework
- You need authentication, queues, jobs, mail, ORM, migrations, and admin features
- You want fast development with a clear structure
- You are building a business application or SaaS

Avoid Laravel when:

- The app is mostly real-time
- You need very high concurrency
- You are building complex frontend-heavy UX without a separate frontend
- The team prefers TypeScript end-to-end

### When to choose WordPress

Choose WordPress when:

- The core need is content management
- Non-technical users need to edit pages
- Marketing pages matter more than custom application logic
- Plugins solve most needs

Avoid WordPress when:

- The system is a custom SaaS
- Permissions are complex
- Data structure is custom and critical
- You need clean application architecture

---

## 3.3 Python Ecosystem

### Relevant technologies

- Python
- Django
- FastAPI
- Flask
- Pandas
- Celery
- LangChain / LlamaIndex style ecosystems
- AI/ML libraries

### Prioritize when

Use Python when:

- AI or data processing is central
- You need automation scripts
- You need file processing
- You need OCR, NLP, scraping, or analytics
- You need fast backend APIs with clean logic
- You need strong integration with AI tooling

### When to choose Django

Choose Django when:

- You need a structured backend
- You need users, permissions, admin, ORM, and security defaults
- You are building a content/business platform
- You want convention and stability

Avoid Django when:

- The frontend is the main product and Django templates are not enough
- You want lightweight microservices
- The team strongly prefers JS/TS

### When to choose FastAPI

Choose FastAPI when:

- You need APIs
- You want lightweight services
- You need Python but not a full monolith
- You are exposing AI/data services
- You want clean OpenAPI docs

Avoid FastAPI when:

- You need a full admin/business framework out of the box
- You need built-in user management and CMS-like features

---

## 3.4 Ruby Ecosystem

### Relevant technologies

- Ruby
- Ruby on Rails

### Prioritize when

Use Rails when:

- Speed of product development is critical
- You want strong conventions
- You are building a SaaS, marketplace, CRM, community app, or CRUD-heavy product
- You prefer a mature monolith
- You want less architectural decision fatigue

### Why Rails is valuable

Rails is good when the question is not “how do I assemble the stack?” but “how fast can I build the product correctly?”

It gives:

- ORM
- migrations
- routing
- MVC structure
- background jobs
- mailers
- authentication ecosystem
- strong conventions

Avoid Rails when:

- The team does not know Ruby
- You need high-performance event systems
- You need AI/data-heavy workflows
- You need a frontend-heavy React-first architecture and do not want Rails involved

---

## 3.5 Go Ecosystem

### Relevant technologies

- Go
- Gin
- Echo
- Fiber
- gRPC
- Kubernetes tooling

### Prioritize when

Use Go when:

- Performance matters
- Concurrency matters
- You are building APIs, workers, infrastructure services, proxies, gateways, or high-load services
- Deployment simplicity matters
- You want a compiled binary
- You need predictable resource usage

Avoid Go when:

- You need to build UI-heavy products quickly
- You need rich business framework features
- The system is mostly CRUD and speed of development matters more than runtime performance

---

## 3.6 Java / JVM Ecosystem

### Relevant technologies

- Java
- Spring Boot
- Kotlin
- JVM ecosystem

### Prioritize when

Use Java/Spring when:

- The project is enterprise-grade
- The organization already uses Java
- Strong typing, stability, and large-team maintainability matter
- There are complex integrations
- Long-term support is important

Use Kotlin when:

- You want modern JVM development
- You are building Android or JVM backend
- The team knows Kotlin

Avoid Java/Spring when:

- You need fast MVP
- The project is small
- The team is solo and does not need enterprise structure

---

## 3.7 C# / .NET Ecosystem

### Relevant technologies

- C#
- .NET
- ASP.NET Core
- Blazor

### Prioritize when

Use C#/.NET when:

- The organization is Microsoft-oriented
- You need enterprise backend
- You need Windows/Azure integration
- You need stable APIs
- You have a C# team

Avoid .NET when:

- The team is not familiar with it
- You want JS/TS end-to-end
- You are building a very small MVP and speed is better in another stack

---

## 3.8 Rust Ecosystem

### Relevant technologies

- Rust
- Actix
- Axum
- Tokio

### Prioritize when

Use Rust when:

- Memory safety is critical
- Performance is critical
- You are building low-level services
- You need reliability under extreme load
- You are building infrastructure, engines, parsers, or security-sensitive services

Avoid Rust when:

- You need fast product iteration
- The team does not know Rust
- The product is mostly business logic
- Development speed matters more than runtime guarantees

---

## 3.9 Mobile

### Native Mobile

Use native mobile when:

- Performance matters
- Device APIs are central
- The app needs deep OS integration
- The app experience must be highly polished

Options:

- Swift for iOS
- Kotlin for Android

### Cross-platform Mobile

Use cross-platform when:

- You want one codebase
- You need faster delivery
- The app is not extremely OS-specific

Options:

- React Native
- Flutter

### Choose React Native when

- The team already knows React
- You want shared logic with web
- You want a large ecosystem

### Choose Flutter when

- You want consistent UI across platforms
- You accept Dart
- You want high visual control

---

## 3.10 Database Selection

The database choice is as important as the language or framework.
Choose the database before finalizing the stack.

### Relational (SQL)

Use when:

- Data has clear relationships and structure
- You need transactions and data integrity
- You need complex queries across entities
- You are building user-facing apps with roles, permissions, billing, or audit logs

Options:

- PostgreSQL: default choice for almost all new projects; strong, extensible, well-supported
- MySQL/MariaDB: acceptable alternative; slightly simpler but fewer advanced features
- SQLite: only for local tools, prototypes, or embedded use cases

Prefer PostgreSQL unless there is a specific reason not to.

### Document / NoSQL

Use when:

- Data structure is highly variable or schema-less
- You are storing unstructured documents or logs
- You need horizontal write scaling at very high volume

Options:

- MongoDB: most common; acceptable for document-heavy use cases
- Avoid MongoDB as a default choice for relational data

### Key-Value / Cache

Use when:

- You need fast in-memory access
- You need pub/sub or queues
- You need session storage or rate limiting

Options:

- Redis: default choice for caching, queues (BullMQ), pub/sub, and sessions

### Analytical / Time-Series

Use when:

- You are storing events, metrics, or logs at high volume
- You need aggregation queries over time ranges

Options:

- ClickHouse: high-performance analytics
- TimescaleDB: PostgreSQL extension for time-series

### Vector Database

Use only when:

- You are implementing RAG (Retrieval-Augmented Generation)
- You need semantic similarity search
- You are storing embeddings from an AI model

Options:

- pgvector: PostgreSQL extension; prefer this first before adding a separate vector DB
- Pinecone / Qdrant / Weaviate: only if pgvector is insufficient

Do not add a vector database unless embeddings are a confirmed requirement.

---
