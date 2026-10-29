# Pulse: Technical Architecture and System Design

## 1. System Overview

Pulse is crash alerting and diagnostic observability infrastructure designed for applications deployed on Rumpty Cloud. It captures runtime errors, generates AI-assisted root-cause explanations, and delivers alerts to developers via Telegram while persisting incident history in a Next.js dashboard.

Pulse is developer infrastructure integrated into client applications via `pulse`.

---

## 2. Platform Context: The Rumpty Cloud Observability Gap

Rumpty Cloud provides Git deployments with container health checking via HTTP polling on an assigned port. However, it lacks runtime observability features:
- VM Metrics: CPU, memory, disk, bandwidth. Dashboard charts only. No alerting or programmatic retrieval API.
- Deployments: Build logs only from CI compilation steps, not runtime application logs.
- Audit Logs: Account-level action history (who performed which console action), not runtime app behavior.
- CLI: Supports SSH and VM management, but offers no log streaming or alerting hooks.

When a deployed app crashes or throws errors, developers receive no push notifications. Pulse provides this alerting layer.

---

## 3. Monorepo Architecture and Packages

The repository is organized as a pnpm monorepo:

```text
Pulse/
├── apps/
│   ├── api/          # Express 4 ingestion API and anomaly engine (built with tsup)
│   └── web/          # Next.js 16 authenticated observability dashboard
├── packages/
│   ├── db/           # Prisma 6 schema, baseline migrations, client singleton
│   └── sdk/          # Client error tracking SDK (pulse)
├── examples/
│   └── demo-app/     # Sample instrumented Express application
└── docs/
    └── DEPLOYMENT.md # Rumpty Cloud production deployment guide
```

### 3.1 SDK (`packages/sdk`)
- Package name: `pulse`
- Formats: CommonJS (`.js`), ES Modules (`.mjs`), TypeScript declarations (`.d.ts`)
- Features:
  - Registers `uncaughtException` and `unhandledRejection` handlers once (idempotent `init`).
  - Does not register `SIGTERM` or `SIGINT` handlers, avoiding process shutdown hangs.
  - Flushes queued errors on `uncaughtException` with a hard 3-second abort timeout before terminating with `process.exit(1)`.
  - Queue cap: Limits internal buffer to 200 events, dropping oldest events to prevent memory leaks.
  - Header allowlist: Express middleware forwards only permitted headers (`user-agent`, `content-type`, `accept`, `host`, `referer`, `x-request-id`, `x-forwarded-for`). Sensitive headers like `authorization` and `cookie` are stripped.
  - Fails safe: If `PULSE_ENDPOINT` or `apiKey` is missing, logs a single warning and remains disabled without throwing into the host app.

### 3.2 Ingestion Engine (`apps/api`)
- Server framework: Express 4 with TypeScript, compiled via `tsup` to Node 22 CommonJS.
- Ingestion route: `POST /api/v1/ingest`
- Security & Validation:
  - Zod payload limits: Max 50 events per batch, name max 200 chars, message max 5000 chars, stack max 20000 chars, metadata serialized size max 16 KB. Request body capped at 256 KB.
  - API key hashing: Presented keys (`pulse_live_<hex>`) are hashed with SHA-256 and matched against `ApiKey.keyHash`.
  - Rate limiting: 120 requests per minute per API key (falling back to client IP) via `express-rate-limit`. Returns HTTP 429 with `Retry-After`.
  - HTTP security: `helmet` defaults with restricted CORS allowlist from `CORS_ORIGINS`.
- Deduplication and Incident Decision Engine:
  - Events are clustered into incidents using deterministic 16-character hexadecimal fingerprints.
  - Atomic upsert creates or increments incident occurrence counts without race conditions.
  - Status rules: `MUTED` incidents stay muted without alerting. `RESOLVED` incidents alert immediately on recurrence (regression detection). `OPEN` incidents respect the debounce window (`ALERT_DEBOUNCE_WINDOW_MINUTES`).
- Retention Scheduler: Runs daily to prune `ErrorEvent` records older than `RETENTION_DAYS` (default 30) and caps events to 100 per incident.

### 3.3 Multi-Provider AI Diagnosis (`apps/api/src/services/ai.ts`)
- Chain of responsibility:
  1. Primary: Rumpty Cloud AI Inference (`https://chat.rumptycloud.com/v1/chat/completions`) with a 6-second timeout.
  2. Secondary: Optional fallback OpenAI-compatible provider (`AI_FALLBACK_ENDPOINT`) with a 6-second timeout.
  3. Tertiary: Rule-based pattern matching (e.g. `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, SyntaxError).
- Secret scrubber: Redacts Bearer tokens, `pulse_live_*` keys, long hex/base64 strings, email addresses, and sensitive object keys prior to sending prompts to any LLM.
- Persists diagnosis source (`rumpty`, `fallback-llm`, or `heuristic`) in `Incident.diagnosisSource`. Cached heuristic diagnoses are automatically retried on the next alert.

### 3.4 Telegram Bot Integration (`apps/api/src/routes/telegram.ts`)
- Webhook verification: Validates `X-Telegram-Bot-Api-Secret-Token` with `crypto.timingSafeEqual`.
- Commands:
  - `/start <token>`: Validates and consumes single-use linking token (24-hour expiration) to map the chat to the project.
  - `/status`: Reports monitoring status, project name, and active incidents.
  - `/stop`: Deactivates Telegram alerts for the chat.
  - `/help`: Displays available commands.
- Configurable base URL via `TELEGRAM_API_BASE` for test mockability.

### 3.5 Web Dashboard (`apps/web`)
- Framework: Next.js 16 with Turbopack and React 19.
- Output: Standalone container build (`output: "standalone"`).
- Security: HTTP Basic Auth gate in `apps/web/src/proxy.ts` protecting all pages and `/api/projects/**` routes. Unset `DASHBOARD_PASSWORD` fails closed with HTTP 503 in production.
- Features: Project management, one-time API key display and rotation, Telegram group deep linking, incident drawer with AI/Rule-based badges and status transitions.

---

## 4. End-to-End Data Flow

```text
[Node.js Host Application]
       │
       ▼ (captures exception or rejection)
[pulse SDK]
       │
       ▼ POST /api/v1/ingest (Header: X-Pulse-Api-Key)
[Pulse Ingestion Engine]
  ├── 1. Rate limiter check (120 req/min)
  ├── 2. SHA-256 key hash lookup in PostgreSQL
  ├── 3. Zod schema and payload boundary validation
  ├── 4. Atomic Incident upsert by (projectId, fingerprint)
  ├── 5. Debounce decision: decideAlert(existing, now, windowMs)
  │
  ├── [If Alert Required]
  │      ├── Secret Scrubber (redacts keys, tokens, emails)
  │      ├── AI Diagnostic Chain (Rumpty -> Fallback -> Heuristic)
  │      └── Telegram Dispatch (sends formatted Markdown alert)
  │
  └── [Storage]
         └── PostgreSQL (ErrorEvent, Incident, ApiKey)
```

---

## 5. Deployment Options

Pulse supports both Docker containerization and direct Node execution:
- Container path: `apps/api/Dockerfile` and `apps/web/Dockerfile` with `docker-compose.prod.yml`.
- Direct path: `pnpm build` followed by `pnpm start:api` and `pnpm start:web`.
- Detailed deployment instructions are documented in `docs/DEPLOYMENT.md`.
