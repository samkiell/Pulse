# Pulse — Implementation Plan

## 1. System Architecture & Repository Layout

To optimize development speed without sacrificing production modularity, use a pnpm or npm monorepo (or clean multi-folder structure):

```text
Pulse/
├── apps/
│   ├── api/               # Ingestion engine, anomaly detection, AI & Telegram workers (Express / Fastify)
│   └── web/               # Next.js App Router, TailwindCSS, shadcn/ui dashboard
├── packages/
│   └── sdk/               # Lightweight TypeScript/Node.js client library ('pulse-monitor')
├── shared/                # Common TypeScript types, DB schemas, and validation schemas
├── docs/                  # Architectural specs and runbooks
├── docker-compose.yml     # Local Postgres for development
└── package.json           # Monorepo workspaces
```

---

## 2. Phase Breakdown

### Phase 1: Database Schema & Core Data Model
- **Target**: Setup Postgres schema (Prisma / Drizzle ORM) for Rumpty Managed DB.
- **Models**:
  - `User`: Account info.
  - `Project`: Project metadata, slug, user reference.
  - `ApiKey`: Project authentication key (`pulse_live_...`), hashed storage.
  - `TelegramIntegration`: `projectId`, `chatId`, `verificationToken`, `isActive`.
  - `ErrorEvent`: Raw ingest payload (`projectId`, `errorType`, `message`, `stack`, `fingerprint`, `metadata`, `timestamp`).
  - `Alert`: Aggregated incident (`projectId`, `fingerprint`, `severity`, `aiDiagnosis`, `suggestedFix`, `occurrenceCount`, `lastSeenAt`, `status`).

---

### Phase 2: Pulse SDK (`packages/sdk`)
- **Target**: Zero-config, sub-5-minute integration for Node.js apps.
- **Key Deliverables**:
  - `Pulse.init({ apiKey, endpoint, environment })`
  - Global process hooks: `uncaughtException`, `unhandledRejection`.
  - Framework middleware: Express / Connect error handler `pulse.errorHandler()`.
  - Non-blocking buffer & batch flush with retry-safe HTTP transport.
  - Error fingerprinting utility (MD5/SHA256 of error name + sanitized top-of-stack).

---

### Phase 3: Ingestion API & Anomaly Engine (`apps/api`)
- **Target**: High-throughput error intake, anomaly filtering, crash-loop deduplication.
- **Key Deliverables**:
  - `POST /api/v1/ingest`: Authenticate via API key, validate payload schema (Zod).
  - Fingerprint generator: Groups similar errors into incidents.
  - Deduplication & Debounce:
    - If `fingerprint` seen within sliding window (e.g., 5 mins), increment `occurrenceCount` without triggering new AI/Telegram notifications (prevents alert storms).
    - Trigger rules: Any uncaught exception/unhandled rejection OR error rate spike (> N errors/min).
  - Background Job Queue: Dispatch alert to AI + Telegram worker asynchronously to keep ingest sub-20ms.

---

### Phase 4: AI Root-Cause Diagnostic Pipeline
- **Target**: Contextual analysis using Rumpty AI Inference (OpenAI-compatible endpoint).
- **Key Deliverables**:
  - Strict system prompt returning structured output (Summary, Probable Cause, Recommended Fix).
  - Context sanitization: Strip sensitive environment variables, secrets, and large payloads.
  - Fallback mechanism: If AI inference fails or times out, deliver standard error alert without delaying the Telegram notification.

---

### Phase 5: Telegram Bot Integration
- **Target**: Immediate alert dispatch and channel binding.
- **Key Deliverables**:
  - Bot commands:
    - `/start <link_token>`: Links Telegram chat/group to a specific Pulse project.
    - `/status`: Verify connection status.
    - `/mute <duration>`: Temporarily suppress alerts for deployment windows.
  - Formatted alert templates:
    - Project name & environment badge
    - Crash summary & error type
    - AI Root-Cause analysis
    - Suggested remediation code/action
    - Direct link to incident on Pulse Dashboard

---

### Phase 6: Next.js Dashboard (`apps/web`)
- **Target**: Production-grade dashboard (TailwindCSS + shadcn/ui).
- **Key Deliverables**:
  - Project Management: Create project, generate/revoke API keys, display Telegram setup wizard.
  - Incidents Feed: Real-time table of recent crashes, severity, occurrence counters.
  - Incident Details Modal: Full stack trace, raw event payload, AI diagnosis history.
  - Status Indicator: SDK connectivity ping (verifies app is successfully reporting).

---

### Phase 7: Deployment & Verification on Rumpty Cloud
- **Target**: End-to-end production testing on Rumpty infrastructure.
- **Key Deliverables**:
  - Deploy Postgres instance on Rumpty Managed DB.
  - Deploy `apps/api` and `apps/web` via Rumpty Deployments.
  - Deploy sample test app instrumented with `pulse-monitor` SDK.
  - Trigger intentional crashes (uncaught exception, rejected promise, crash loop) to verify Telegram delivery and AI diagnosis.

---

## 3. Immediate Next Steps

1. Initialize workspace structure (`package.json`, pnpm-workspace / npm workspaces, TypeScript configurations).
2. Scaffold database schema and migrations with Prisma / Drizzle.
3. Build the core SDK client and API ingest endpoint.
