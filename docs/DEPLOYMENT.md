# Pulse Production Deployment Guide for Rumpty Cloud

This guide provides instructions for deploying Pulse to Rumpty Cloud infrastructure. Pulse consists of an Ingest API (`apps/api`), a Web Dashboard (`apps/web`), a shared Prisma database layer (`packages/db`), and the client monitoring SDK (`@samkiel/pulse-monitor`).

---

## 1. Prerequisites and Rumpty Cloud Overview

Rumpty Cloud provides Git deployments with container health checking via HTTP polling on an assigned port. Runtime logs, metrics, and alerting APIs are not provided by Rumpty Cloud; VM metrics are dashboard charts only, deployment logs are build logs only, and audit logs track account actions only. Pulse provides runtime error observability and incident alerting on top of this environment.

Before starting, ensure you have:
- A Rumpty Cloud account with project creation permissions.
- Access to the GitHub repository: `github.com/samkiell/Pulse`.
- A Telegram Bot created via [@BotFather](https://t.me/BotFather) with its bot token.
- A managed PostgreSQL instance provisioned on Rumpty Cloud or an external PostgreSQL 16 database.

---

## 2. Assumptions to verify in the Rumpty console

Because Rumpty Cloud configuration options can vary by region or account tier, verify the following in your Rumpty Cloud console prior to production launch:

1. **Port Assignment:** Verify whether Rumpty assigns `PORT` dynamically via environment variable or requires listening on a fixed port (defaulting to 3001 for API, 3000 for Web). Both services honor `process.env.PORT`.
2. **PostgreSQL SSL and CA Certificates:** Rumpty managed Postgres uses SSL. Verify whether your database connection string requires `sslmode=require` or if custom CA certificates must be provided via `NODE_EXTRA_CA_CERTS`.
3. **Inference Endpoint Model ID:** Query `GET https://chat.rumptycloud.com/v1/models` using your Rumpty AI API key to identify the exact active model identifier for `RUMPTY_AI_MODEL`.
4. **Build Memory Allocation:** Next.js and Prisma client generation require at least 1 GB of build memory. If builds exceed limits, ensure standalone output and caching are utilized.
5. **Private Networking vs Public DNS:** Determine whether services communicate over internal container hostnames (e.g. `http://api:3001`) or through public routing URLs (`https://api.yourdomain.com`).

---

## 3. Step 1: Provision Managed PostgreSQL

1. In the Rumpty Cloud console, create a new Managed PostgreSQL service.
2. Note the generated database credentials and connection string:
   ```text
   postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslmode=require
   ```
3. Run the baseline Prisma migrations from your development workstation or CI runner:
   ```bash
   pnpm db:deploy
   ```
   This executes `packages/db/prisma/migrations/20261028000000_init/migration.sql` to initialize all tables, foreign keys, and indexes.

---

## 4. Step 2: Deploy Pulse API (`apps/api`)

The API handles error ingest, event deduplication, AI diagnosis generation, and Telegram notifications.

### Environment Variables for API
Configure the following in the Rumpty service settings:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslmode=require
PUBLIC_API_URL=https://api.yourdomain.com
DASHBOARD_URL=https://dashboard.yourdomain.com
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=PulseMonitorBot
TELEGRAM_WEBHOOK_SECRET=generate_a_random_32_char_secret_string
RUMPTY_AI_ENDPOINT=https://chat.rumptycloud.com/v1/chat/completions
RUMPTY_AI_API_KEY=your_rumpty_inference_key
RUMPTY_AI_MODEL=your_selected_rumpty_model
CORS_ORIGINS=https://dashboard.yourdomain.com
RETENTION_DAYS=30
```

### Option A: Dockerfile Deployment (Recommended)
- Dockerfile path: `apps/api/Dockerfile`
- Context: Repository root (`.`)
- Healthcheck endpoint: `/health` (responds 200 `{ status: "ok" }`)
- Readiness endpoint: `/ready` (executes `SELECT 1` on database)

### Option B: Native Build and Start
- Install command: `pnpm install --frozen-lockfile=false`
- Build command: `pnpm --filter @pulse/db generate && pnpm --filter @pulse/api build`
- Start command: `node apps/api/dist/server.js`

---

## 5. Step 3: Configure Telegram Bot Webhook

After the API is reachable at `PUBLIC_API_URL`, configure Telegram webhook routing using the included utility script:

```bash
pnpm --filter @pulse/api telegram:set-webhook
```

This script:
1. Calls the Telegram Bot API `setWebhook` method with:
   - `url`: `PUBLIC_API_URL + "/api/v1/telegram/webhook"`
   - `secret_token`: Value of `TELEGRAM_WEBHOOK_SECRET`
   - `allowed_updates`: `["message"]`
2. Queries `getWebhookInfo` to verify that webhook delivery is active and reports zero pending errors.

---

## 6. Step 4: Deploy Pulse Web Dashboard (`apps/web`)

The Next.js 16 dashboard provides project management, API key rotation, Telegram group linking, and incident diagnostics.

### Environment Variables for Web
Configure the following in the Rumpty service settings:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?sslmode=require
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=set_a_strong_password_here
NEXT_PUBLIC_APP_URL=https://dashboard.yourdomain.com
INTERNAL_API_URL=https://api.yourdomain.com
INTERNAL_INGEST_URL=https://api.yourdomain.com/api/v1/ingest
```

> **Security Rule:** If `DASHBOARD_PASSWORD` is omitted in production, the dashboard fails closed with HTTP 503 on all routes except `/api/health`.

### Option A: Dockerfile Deployment (Recommended)
- Dockerfile path: `apps/web/Dockerfile`
- Context: Repository root (`.`)
- Healthcheck endpoint: `/api/health`

### Option B: Native Build and Start
- Install command: `pnpm install --frozen-lockfile=false`
- Build command: `pnpm --filter @pulse/db generate && pnpm --filter @pulse/web build`
- Start command: `pnpm --filter @pulse/web start`

---

## 7. Step 5: Deploy the Sample Demo App (Optional Verification)

To verify end-to-end incident ingestion, AI diagnosis, and Telegram alerting:

1. Open `https://dashboard.yourdomain.com` in your browser. Log in using `DASHBOARD_USER` and `DASHBOARD_PASSWORD`.
2. Create a project named `Demo App`. Copy the generated API key (displayed once).
3. Follow the wizard to link your Telegram chat by clicking the bot deep link. Send `/start <token>` in Telegram.
4. Deploy `examples/demo-app`:
   - Environment variables:
     ```env
     PORT=5000
     PULSE_API_KEY=pulse_live_your_key_here
     PULSE_ENDPOINT=https://api.yourdomain.com/api/v1/ingest
     NODE_ENV=production
     ```
   - Build command: `pnpm --filter @pulse/demo-app build`
   - Start command: `pnpm --filter @pulse/demo-app start`
5. Trigger a test incident:
   ```bash
   curl -X POST https://demo.yourdomain.com/db-fail
   ```
6. Check Telegram for an alert containing root cause analysis and view the new incident in the Pulse dashboard.

---

## 8. Troubleshooting: Top 5 Deployment Failures

### 1. Database Connection and SSL Failures
- **Symptom:** API logs `Authentication failed against database server` or `self-signed certificate in certificate chain`.
- **Cause:** Rumpty managed Postgres enforces SSL encryption with a private CA certificate.
- **Remedy:** Ensure the query parameter `?sslmode=require` is present on `DATABASE_URL`. If using custom certificates, point Node to the certificate bundle via `NODE_EXTRA_CA_CERTS=/path/to/ca.crt`.

### 2. Telegram Webhook Secret Mismatch
- **Symptom:** Telegram commands like `/status` or `/start` receive no response, and API logs show `401 Unauthorized`.
- **Cause:** The `X-Telegram-Bot-Api-Secret-Token` header sent by Telegram does not match `TELEGRAM_WEBHOOK_SECRET`.
- **Remedy:** Re-run `pnpm --filter @pulse/api telegram:set-webhook` to sync Telegram with the exact secret configured on the API.

### 3. Missing Dashboard Password (HTTP 503)
- **Symptom:** Visiting the dashboard URL returns `503 Service Unavailable: Dashboard authentication is unconfigured`.
- **Cause:** In production (`NODE_ENV=production`), `apps/web/src/proxy.ts` fails closed if `DASHBOARD_PASSWORD` is not defined.
- **Remedy:** Set `DASHBOARD_PASSWORD` in your Rumpty environment variables and redeploy.

### 4. Memory Exhaustion During Build (OOM Exit 137)
- **Symptom:** Next.js build terminates abruptly during page generation or TypeScript check.
- **Cause:** Building both Turbopack pages and Prisma client in small memory containers.
- **Remedy:** The provided `apps/web/Dockerfile` uses multi-stage builds with standalone output tracing (`output: "standalone"`), minimizing memory overhead. Set `NODE_OPTIONS=--max-old-space-size=1536` if container memory is constrained.

### 5. Port Binding and Healthcheck Polling Timeout
- **Symptom:** Rumpty Cloud marks deployment as failed with `Healthcheck polling failed on port`.
- **Cause:** Application listening on `127.0.0.1` instead of `0.0.0.0`, or port mismatch between container setting and healthcheck URL.
- **Remedy:** Ensure `HOSTNAME=0.0.0.0` is set for Web and the API listens on `0.0.0.0`. Check that the health check points to `/health` on port 3001 for API, and `/api/health` on port 3000 for Web.
