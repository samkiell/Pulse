# Pulse — Product Requirements Document

## 1. Overview

Pulse is a crash alerting and AI root-cause diagnosis tool for developers deploying on Rumpty Cloud. It closes a real gap: Rumpty has no runtime error alerting or log/metrics API, so developers currently have no way to know their app broke without manually checking or waiting for a user complaint.

## 2. Problem Statement

Developers deploying on Rumpty Cloud have no visibility into runtime failures. Build logs show whether a deploy succeeded, but nothing tells them when the running app crashes, throws errors, or degrades afterward. This means bugs are discovered late, usually by end users, not by the developer.

## 3. Target User

Solo developers and small teams shipping apps on Rumpty Cloud who want to know immediately when something breaks, without babysitting a dashboard.

## 4. Goals

- Let a developer add crash alerting to their app in under 5 minutes
- Deliver alerts with enough context to act on immediately, not just "an error occurred"
- Provide a simple historical view of what has broken and when
- Run entirely on Rumpty Cloud infrastructure, per competition rules

## 5. Non-Goals (v1)

- Not a full observability suite (no tracing, no custom dashboards)
- Not multi-language at launch, Node.js only
- Not built for teams/multi-user orgs yet

## 6. User Stories

- As a developer, I want to drop a small SDK into my app so that I don't have to build my own error tracking.
- As a developer, I want to get a Telegram message the moment my app crashes so that I can respond before users notice.
- As a developer, I want the alert to explain the likely cause so that I don't have to dig through raw logs first.
- As a developer, I want to see my alert history on a dashboard so that I can spot recurring issues.

## 7. Features (v1 Scope)

| Feature | Priority |
|---|---|
| SDK for Node.js apps (error capture) | Must-have |
| Backend ingestion + anomaly detection | Must-have |
| AI root-cause summary via Rumpty AI Inference | Must-have |
| Telegram bot alert delivery | Must-have |
| Dashboard: connected projects + alert history | Must-have |
| Crash-loop deduplication | Should-have |
| Project-level API key management | Should-have |
| Multi-language SDKs | Won't-have (v1) |
| Team accounts | Won't-have (v1) |

## 8. Success Criteria (for judging)

- **Platform Deployment**: Pulse backend, dashboard, and Telegram bot all live and functional on Rumpty Cloud.
- **Code Quality & Docs**: Clean, documented codebase with this PRD and the technical doc (DOC.md) as reference.
- **Innovation & Practical Utility**: Solves a real, verified gap in Rumpty Cloud (no runtime alerting exists today), immediately useful to any dev on the platform.

## 9. Risks

- Rumpty AI Inference rate limits or latency under alert load, unverified at time of writing
- Tight timeline, SDK + backend + bot + dashboard in one day is aggressive, dashboard may ship with minimal polish
- No public Rumpty API docs for anything beyond CLI/VM/Deploy/DB/Storage, confirm AI Inference integration details once building

## 10. Milestones (within the 30-day window)

1. SDK + backend ingestion working end to end (today)
2. Anomaly detection + AI root cause integration (today/tomorrow)
3. Telegram bot alert delivery (tomorrow)
4. Dashboard MVP (tomorrow)
5. Deploy everything live on Rumpty Cloud (tomorrow night)
6. Polish, docs, and demo prep (remaining days before Oct 31)
