# 7. Scoring Model

The LLM should score candidate stacks by criteria.

## 7.1 Criteria

Score each from 1 to 5:

- Development speed
- Long-term maintainability
- Team familiarity
- Ecosystem maturity
- Deployment simplicity
- Performance
- Scalability
- Security posture
- Hiring availability
- AI/data suitability
- Real-time suitability
- SEO suitability
- Cost efficiency
- Debuggability
- Version stability

## 7.2 Weighted Scoring

Weights should change by project.

Example:

For MVP:

- Development speed: high
- Team familiarity: high
- Performance: medium
- Architecture purity: low

For enterprise:

- Maintainability: high
- Security: high
- Stability: high
- Documentation: high

For AI system:

- AI/data suitability: high
- Python ecosystem: high
- API integration: high

For real-time system:

- concurrency: high
- latency: high
- event handling: high

For external (public-facing) project:

- Security posture: high
- Auth robustness: high
- Dependency maturity: high
- Audit/logging: medium

For internal (private) project:

- Development speed: high
- Team familiarity: high
- Security posture: medium (quick wins acceptable)
- Architecture purity: low

## 7.3 Conflict Resolution

When two high-weight criteria conflict, apply this priority order:

1. Security (if external) — cannot be compromised
2. Team familiarity — a stack the team cannot maintain is always wrong
3. Product fit — the stack must support the core product behavior
4. Development speed — only sacrificed if security or fit requires it
5. Performance — only relevant if scale is a confirmed near-term requirement

If a conflict cannot be resolved cleanly, present two options with explicit tradeoffs rather than forcing a single answer.

---
