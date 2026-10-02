# Pulse — Technical Documentation (Source of Truth)

## 1. What Pulse Is

Pulse is observability infrastructure for apps deployed on Rumpty Cloud. It tells a developer the moment their app crashes or throws errors, with an AI-generated explanation of the likely root cause, delivered straight to Telegram.

Pulse is not an end-user app. It is infra other developers integrate into their own projects.

## 2. The Problem

Rumpty Cloud has no runtime error alerting, no crash notifications, and no app-level log/metrics API.

Confirmed from Rumpty's own docs:
- **VM Metrics**: CPU, memory, disk, bandwidth. Dashboard charts only. No alerting, no documented API to pull this programmatically.
- **Deployments**: build logs only, this is CI output from the build step, not runtime application logs.
- **Audit Logs**: account-level action history (who did what in the console), not app behavior.
- **CLI**: supports `ssh`, `exec`, `vm` management, but nothing for log streaming, metrics polling, or alerting.

Net result: if a deployed app crashes, the developer finds out by manually checking the dashboard or SSHing in, or worse, from a user complaint. There is no push notification of any kind.

## 3. The Solution

A lightweight SDK the developer drops into their app. It captures uncaught exceptions and error events, and forwards them to the Pulse backend. Pulse detects anomalies, asks an LLM (via Rumpty's AI Inference endpoint) to summarize the likely root cause, and pushes an alert to the developer's Telegram with the diagnosis and a suggested fix. A dashboard shows alert history over time.

## 4. Why This Is Infra, Not an App

- It has an integration point (SDK), an ingestion/processing layer (backend), and a delivery channel (bot). That's infra shape.
- It is consumed by other developers inside their own projects, not used directly by end users.
- It solves an operational gap in the platform itself (Rumpty has no runtime observability), not a one-off use case.

## 5. Architecture

### 5.1 Components

1. **Pulse SDK** (npm package)
   - Dropped into the user's app (`require('pulse-monitor')` or equivalent middleware)
   - Captures uncaught exceptions, unhandled rejections, and explicit error logs
   - Batches and POSTs events to the Pulse backend over HTTPS

2. **Pulse Backend** (Node.js service, deployed on Rumpty)
   - Receives events from the SDK
   - Runs anomaly detection (error spike, repeated crash, crash loop)
   - On trigger, sends the relevant log/error context to Rumpty AI Inference for root cause summarization
   - Persists events and alerts to Postgres (Rumpty Managed DB)

3. **Telegram Bot**
   - Delivers formatted alerts: what broke, likely root cause, suggested fix, timestamp
   - One bot, multiple connected projects per user via chat ID mapping

4. **Dashboard** (Next.js, deployed on Rumpty)
   - Lists connected projects
   - Shows alert history with root causes
   - Minimal auth via Pulse-issued API key per project

5. **Storage**
   - Postgres: users, projects, API keys, Telegram chat mappings, alert history

### 5.2 Data Flow

```
User's app (with Pulse SDK)
  → Pulse Backend (ingest + anomaly detection)
  → [if triggered] Rumpty AI Inference (root cause summary)
  → Telegram Bot (alert delivered) + Postgres (stored)
  → Dashboard (reads from Postgres)
```

### 5.3 Tech Stack

| Layer | Choice |
|---|---|
| SDK | Node.js/TypeScript npm package |
| Backend | Node.js (Express or Fastify) |
| Database | Postgres (Rumpty Managed DB) |
| AI | Rumpty AI Inference (OpenAI-compatible endpoint) |
| Bot | Telegram Bot API |
| Dashboard | Next.js |
| Hosting | Rumpty Cloud Deployments (all services) |

## 6. Core Flow (Step by Step)

1. Developer signs up on Pulse dashboard, creates a project, gets an API key
2. Developer installs the SDK and initializes it with the API key
3. Developer links their Telegram via a `/start <token>` command on the bot
4. App runs normally; SDK silently monitors for errors
5. On an uncaught exception or error threshold breach, SDK sends event to backend
6. Backend detects anomaly, pulls context, calls AI Inference for diagnosis
7. Backend stores the alert and triggers the Telegram bot to notify the user
8. Developer can review full alert history on the dashboard

## 7. Anomaly Detection Rules (v1, rule-based)

- Any uncaught exception or unhandled rejection → immediate alert
- 5xx error rate exceeding a threshold in a rolling window → alert
- Repeated identical error (crash loop) within a short window → single deduplicated alert, not spam

## 8. Out of Scope (v1)

- No distributed tracing
- No custom metrics/dashboards beyond alert history
- No multi-language SDKs at launch (Node.js only)
- No team/multi-user accounts, single developer per project for now

## 9. Open Questions

- Exact rate limits/pricing on Rumpty AI Inference, confirm before heavy use
- Whether Rumpty's personal API keys expose any additional endpoints beyond CLI use, worth a deeper check if time allows
