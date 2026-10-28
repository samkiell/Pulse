# Pulse ⚡

> **Real-time crash alerting and AI root-cause diagnosis for applications deployed on Rumpty Cloud.**

Pulse bridges the runtime observability gap in Rumpty Cloud. Because Rumpty currently provides build logs and hardware VM metrics without application-level runtime error alerting, Pulse delivers instant incident notifications with AI-powered root-cause summaries directly to Telegram.

---

## 📑 Architecture Overview

Pulse is architected as an infrastructure monorepo powered by `pnpm`:

```
User App (with pulse-monitor SDK)
  │
  ▼ POST /api/v1/ingest
Pulse API Engine (apps/api)
  ├── 1. Auth & Schema Validation (Zod)
  ├── 2. Deterministic Error Fingerprinting & Deduplication
  ├── 3. Sliding Window Anomaly Detection
  ├── 4. AI Diagnosis (Rumpty AI Inference Llama-3-70B / Heuristic Fallback)
  └── 5. Storage (PostgreSQL via Prisma)
  │
  ├──────────────────────────────────┐
  ▼                                  ▼
Telegram Bot Alert Dispatch    Pulse Web Dashboard (apps/web)
(Instant push notification)    (Incident feed, AI inspection, test simulator)
```

### Monorepo Structure

| Package / App | Purpose | Technology |
|---|---|---|
| [`packages/sdk`](./packages/sdk) | Lightweight error-tracking client (`pulse-monitor`) | TypeScript, tsup (CJS, ESM, DTS) |
| [`packages/db`](./packages/db) | Shared database schema and client singleton | Prisma, PostgreSQL |
| [`apps/api`](./apps/api) | High-throughput ingestion & anomaly detection engine | Express, TypeScript, Zod |
| [`apps/web`](./apps/web) | Real-time observability dashboard & incident manager | Next.js 16 (Turbopack), TailwindCSS, shadcn/ui |

---

## 🚀 Quickstart

### 1. Prerequisites
- **Node.js**: v20+ (Node 22 or 26 recommended)
- **Package Manager**: `pnpm` (v9+)
- **Database**: PostgreSQL (Local or Rumpty Managed DB)

### 2. Installation & Setup

Clone the repository and install workspace dependencies:
```bash
git clone https://github.com/SAMKIEL/Pulse.git
cd Pulse
pnpm install
```

Configure your environment variables:
```bash
cp .env.example .env
```

Start the local PostgreSQL container (optional if using external DB):
```bash
docker compose up -d
```

Generate and push the Prisma database schema:
```bash
pnpm db:push
```

### 3. Running Locally

Start both the API engine (port `4000`) and the Next.js Web Dashboard (port `3000`):
```bash
pnpm dev
```

* **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
* **Ingestion API**: [http://localhost:4000/api/v1/ingest](http://localhost:4000/api/v1/ingest)
* **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

## 📦 Using the SDK (`pulse-monitor`)

### Installation
```bash
npm install pulse-monitor
# or
pnpm add pulse-monitor
```

### Initialization
Initialize Pulse at the entrypoint of your application before any other modules load:

```typescript
import pulse from "pulse-monitor";

pulse.init({
  apiKey: process.env.PULSE_API_KEY,
  endpoint: process.env.PULSE_ENDPOINT || "http://localhost:4000/api/v1/ingest",
  environment: process.env.NODE_ENV || "production",
  captureUncaughtExceptions: true,
  captureUnhandledRejections: true,
});
```

### Express / Connect Middleware
Attach the error handler middleware at the end of your route definitions:

```typescript
import express from "express";
import pulse from "pulse-monitor";

const app = express();

// ... your routes ...

// Attach after all routes
app.use(pulse.errorHandler());

app.listen(8080);
```

### Manual Error Capture
```typescript
try {
  await processPayment(payload);
} catch (error) {
  pulse.captureError(error, {
    userId: "usr_12345",
    amount: 99.00,
  });
}
```

---

## 🤖 Telegram Bot Integration

1. In the Pulse Dashboard, create or select a project.
2. Navigate to the **Telegram Bot** tab to receive a one-time connection token.
3. Open Telegram and message [@PulseMonitorBot](https://t.me/PulseMonitorBot):
   ```text
   /start <YOUR_VERIFICATION_TOKEN>
   ```
4. The bot will link the chat and immediately stream crash alerts with AI root-cause summaries whenever an incident occurs.

---

## 🧪 Testing & Verification

Run the automated test suite across all workspace packages:
```bash
pnpm test
```

Build all packages and applications for production:
```bash
pnpm build
```

---

## ⚙️ Environment Configuration

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://pulse:pulsepassword@localhost:5432/pulsedb` |
| `PORT` / `API_PORT` | HTTP port for the ingestion API | `4000` |
| `RUMPTY_AI_ENDPOINT` | OpenAI-compatible endpoint for LLM root-cause summaries | `https://api.rumpty.cloud/v1/chat/completions` |
| `RUMPTY_AI_API_KEY` | Rumpty AI / OpenAI API Key | `""` (uses rule-based heuristic fallback if empty) |
| `RUMPTY_AI_MODEL` | AI Model ID | `rumpty-llama-3-70b-instruct` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot token from @BotFather | `""` |
| `TELEGRAM_BOT_USERNAME` | Telegram Bot username handle | `PulseMonitorBot` |
| `ALERT_DEBOUNCE_WINDOW_MINUTES` | Window to deduplicate alerts for recurring crash loops | `5` |
| `DASHBOARD_URL` | Base URL of web dashboard (used for Telegram links) | `http://localhost:3000` |

---

## 📄 License
MIT © [SAMKIEL](https://github.com/SAMKIEL)
