# LLM Tech Stack Decision Engine

## Purpose

This document defines how an LLM should help choose a technology stack for a software project.

The goal is not to recommend the most popular stack.
The goal is to recommend the most suitable stack for the specific project, team, budget, timeline, deployment environment, maintainability needs, and future growth.

The LLM must not jump directly to an answer.
It must first understand the project, ask missing questions, identify constraints, compare relevant options, and explain tradeoffs.

## Default Deployment Context

Unless stated otherwise, assume the following deployment environment:

- Provider: Contabo VPS/VDS
- OS: Ubuntu 24.04 LTS (bare, no pre-installed stack)
- Server management panel: aaPanel
- aaPanel handles: Nginx (reverse proxy), SSL (Let's Encrypt), virtual hosts, file manager, process management, and basic monitoring
- Deployment model: Docker containers managed via aaPanel, or direct process deployment through aaPanel
- Serverless is not a preferred option; VPS is cheap enough and long-running processes are preferred
- SEO is generally important unless explicitly stated otherwise

Because aaPanel is present:

- Do not recommend a separate Nginx setup; aaPanel manages Nginx
- Do not recommend a separate SSL/TLS tool; aaPanel handles Let's Encrypt
- Do not recommend a separate reverse proxy unless aaPanel's built-in proxy is insufficient
- Recommend aaPanel-compatible deployment patterns (Docker app + aaPanel proxy config, or direct Node/Python/PHP process via aaPanel)

All stack recommendations must be compatible with this environment by default.
If a technology requires a different environment, this must be explicitly noted.

---
