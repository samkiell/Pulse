# Pulse: Product Requirements Document

## 1. Overview

Pulse is crash alerting and AI root-cause diagnosis infrastructure for developers deploying on Rumpty Cloud. It closes a critical platform gap: Rumpty Cloud has no runtime error alerting, log streaming, or metrics API. Pulse provides instant incident notifications with AI-powered root-cause summaries directly to Telegram.

## 2. Problem Statement

Developers deploying applications on Rumpty Cloud have no visibility into runtime failures:
- VM metrics are dashboard charts only.
- Deployment logs are build logs only.
- Audit logs capture account-level administrative actions only.

When an application crashes or throws unhandled exceptions at runtime, developers receive no automated push alerts or diagnostic telemetry. Bugs are discovered late, usually by end users.

## 3. Target User

Solo developers and small engineering teams shipping applications on Rumpty Cloud who need immediate notification and actionable diagnosis when production workloads degrade.

## 4. Goals

- Provide a zero-overhead Node.js SDK that instruments an application in under 5 minutes.
- Deliver alerts with actionable context: error message, stack trace, likely root cause, and suggested remediation.
- Maintain persistent incident history and status management via a clean web dashboard.
- Run entirely on Rumpty Cloud infrastructure.

## 5. Non-Goals (v1)

- No distributed tracing or APM span collection.
- No multi-language SDKs at launch (Node.js only).
- No multi-tenant user accounts, billing, or Redis/queue infrastructure.
- No Kubernetes orchestration.

## 6. User Stories

- As a developer, I want to drop `@samkiel/pulse` into my app so that I do not need to build custom error tracking.
- As a developer, I want a Telegram message the moment my app crashes so that I can respond before users notice.
- As a developer, I want the alert to explain the likely cause and suggested fix so that I do not have to dig through raw logs.
- As a developer, I want to see incident history on a dashboard so that I can track recurring bugs and manage resolution status.

## 7. Feature Status Matrix

| Feature | Scope | Status | Notes |
|---|---|---|---|
| Node.js SDK (`@samkiel/pulse`) | Must-have | Shipped | Auto-captures uncaught exceptions and rejections. Capped queue, timeout flush. |
| Ingestion API & Rate Limiting | Must-have | Shipped | Express 4, Zod schema validation, 120 req/min rate limit, hashed key auth. |
| Deterministic Fingerprinting & Deduplication | Must-have | Shipped | Normalized 16-character hex hash clustering identical stack frames. |
| Multi-Provider AI Diagnosis | Must-have | Shipped | Rumpty AI -> Fallback LLM -> Rule-based heuristic with PII secret scrubber. |
| Telegram Bot Integration | Must-have | Shipped | Webhook verification, `/start` token linking, `/status`, `/help`, `/stop`. |
| Web Dashboard (Next.js 16) | Must-have | Shipped | HTTP Basic Auth gate, project creation, key rotation, incident drawer. |
| Incident Debounce & Regression Detection | Must-have | Shipped | Debounces open incidents, immediate alert on resolved incident regression. |
| Automatic Telemetry Retention | Should-have | Shipped | Daily retention scheduler pruning events older than 30 days. |
| Docker & Rumpty Deployment Configuration | Must-have | Shipped | Multi-stage Dockerfiles, standalone web output, baseline Prisma migrations. |
| CI Pipeline | Must-have | Shipped | GitHub Actions testing, building, and running Postgres migrations. |

## 8. Success Criteria

- Platform Deployment: Pulse backend, dashboard, and Telegram bot deployable on Rumpty Cloud.
- Code Quality and Docs: Clean, documented codebase with PRD, technical doc, and deployment guide.
- Innovation and Practical Utility: Solves a real, verified gap in Rumpty Cloud with immediate utility for developers.
