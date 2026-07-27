# 4. Common Architecture Patterns

## 4.1 Simple Full-stack Web App

Recommended options:

- Next.js + PostgreSQL
- Laravel + MySQL/PostgreSQL
- Rails + PostgreSQL
- Django + PostgreSQL

Choose based on team and product needs.

## 4.2 Custom SaaS Platform

Recommended options:

- Next.js + Node.js/NestJS + PostgreSQL
- Rails + PostgreSQL
- Django + PostgreSQL
- Laravel + PostgreSQL/MySQL

Prioritize:

- Auth
- billing
- roles
- audit logs
- background jobs
- tenant separation

## 4.3 Community Platform

Recommended options:

- Next.js + Node.js + PostgreSQL
- Rails + PostgreSQL
- Django + PostgreSQL

Important features:

- user profiles
- roles
- moderation
- notifications
- posts/comments
- search
- privacy settings
- admin tools

Avoid overusing ready-made forum engines if deep customization is required.

## 4.4 Real-time Dashboard

Recommended options:

- React/Next.js frontend
- Node.js WebSocket backend
- Redis pub/sub
- PostgreSQL for persistence

For higher scale:

- Go services
- Kafka/NATS
- Redis Streams

## 4.5 AI Automation System

Scope assumption: AI means calling external LLM APIs (e.g., OpenAI, Anthropic, Gemini).
Local model training, fine-tuning, and self-hosted inference are out of scope.

Recommended options:

- Python FastAPI for AI/data services
- Node.js/TypeScript for orchestration and integrations
- PostgreSQL for structured data
- pgvector if semantic search is needed; dedicated vector DB only if pgvector is insufficient

AI integration patterns:

- Call external LLM API directly from the backend service
- Use background workers for long-running AI tasks (do not block HTTP requests)
- Store prompts, responses, and metadata in PostgreSQL for auditability
- Stream responses to the frontend when latency matters

Avoid:

- Starting with complex orchestration frameworks before the workflow is understood
- Adding a vector database before confirming that embeddings are actually needed
- Calling LLM APIs synchronously in request handlers for heavy tasks

## 4.6 High-scale Event Processing

Recommended options:

- Go / Node.js workers
- Kafka / NATS / Redis Streams
- PostgreSQL / ClickHouse depending on analytics needs

Use when:

- many events per second
- background processing
- queues
- retries
- monitoring

---
