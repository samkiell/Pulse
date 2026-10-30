# Deployment Guide for Pulse

This document outlines the deployment workflow for Pulse on Rumpty Cloud and production environments.

## 1. Prerequisites & Environment Variables

Configure the following environment variables on your production host:

- `DATABASE_URL`: Production PostgreSQL connection string (with SSL mode enabled if required).
- `AUTH_SECRET`: Random 32-character string for NextAuth session encryption (`openssl rand -base64 32`).
- `AUTH_GITHUB_ID`: GitHub OAuth Application Client ID.
- `AUTH_GITHUB_SECRET`: GitHub OAuth Application Client Secret.
- `APP_URL`: Public base URL of the web dashboard (e.g. `https://pulse.yourdomain.com`).
- `INTERNAL_API_SECRET`: Shared secret between the web dashboard and the API service to authorize internal actions like crash simulation.
- `MAX_PROJECTS_PER_USER`: Maximum number of projects per user (defaults to 5).
- `PORT` / `API_PORT`: Port for the API backend service.
- `TELEGRAM_BOT_TOKEN`: Telegram bot token from @BotFather.
- `TELEGRAM_BOT_USERNAME`: Telegram bot username without the @ prefix.
- `TELEGRAM_WEBHOOK_SECRET`: Secret header verification token for Telegram webhook updates.
- `RUMPTY_AI_ENDPOINT`: AI completion endpoint for incident diagnosis.
- `RUMPTY_AI_API_KEY`: API key for AI diagnosis.
- `RUMPTY_AI_MODEL`: AI model name (e.g. `llama3.2:3b`).

## 2. GitHub OAuth Setup

You must create two separate GitHub OAuth Applications:
1. One for local development (`http://localhost:3000`).
2. One for production deployment.

### Production OAuth App Configuration

Note: The live production URL must exist before creating the production GitHub OAuth app.

1. Navigate to GitHub Settings &gt; Developer Settings &gt; OAuth Apps &gt; New OAuth App.
2. Set **Application Name** to `Pulse` (or your chosen branding).
3. Set **Homepage URL** to `${APP_URL}` (e.g. `https://pulse.yourdomain.com`).
4. Set **Authorization callback URL** strictly to:
   `${APP_URL}/api/auth/callback/github`
5. Copy the generated Client ID to `AUTH_GITHUB_ID`.
6. Generate a Client Secret and copy it to `AUTH_GITHUB_SECRET`.

## 3. Database Migrations

Before starting the web and API services, apply the database schema migrations:

```bash
pnpm --filter @pulse/db exec prisma migrate deploy
```

## 4. Building and Starting Services

Build all packages and apps:
```bash
pnpm build
```

Run services:
- API service: `pnpm --filter @pulse/api start`
- Web service: `pnpm --filter @pulse/web start`
