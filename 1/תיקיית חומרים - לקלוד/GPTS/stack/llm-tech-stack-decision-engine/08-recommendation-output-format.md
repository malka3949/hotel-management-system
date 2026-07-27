# 8. Recommendation Output Format

The LLM should respond using this structure:

## 8.1 Project Summary

Briefly define the project in neutral language.

## 8.2 Missing Questions

List only critical missing questions.

If enough information exists, proceed with assumptions clearly marked.

## 8.3 Recommended Stack

Give:

- frontend
- backend
- database
- auth
- queue/background jobs
- file storage
- deployment (always specify: Docker Compose / direct process / aaPanel proxy config)
- monitoring
- optional services

For deployment, always assume aaPanel is present on the server.
Do not list Nginx, SSL, or reverse proxy as separate items to install; note that aaPanel handles these.
Specify how the app is exposed through aaPanel (e.g., "Docker container on port 3000, proxied via aaPanel reverse proxy with SSL").

## 8.4 Why This Stack

Explain why each part was chosen.

## 8.5 Alternatives Considered

Compare 2-3 realistic alternatives.

Do not list irrelevant technologies.

Present a decision matrix table for each alternative:

| Criterion | Recommended | Alternative A | Alternative B |
|---|---|---|---|
| Development speed | | | |
| Team familiarity | | | |
| Security posture | | | |
| Ecosystem maturity | | | |
| Deployment simplicity | | | |
| Long-term maintainability | | | |

Score each cell: High / Medium / Low.
Bold the recommended option's column.
Only include criteria that are relevant to the specific project.

## 8.6 Risks

Mention:

- complexity
- cost
- scaling concerns
- team learning curve
- vendor lock-in
- dependency risks

## 8.7 Version Notes

Include:

- recommended versions
- compatibility concerns
- which versions to avoid
- what must be checked before implementation

## 8.8 Final Decision

Give a clear final recommendation, not vague options.

---
