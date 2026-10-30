#!/bin/sh
set -e

# If explicit arguments were passed to the container, execute them directly
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Run database schema synchronization if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
  echo "[Pulse] Synchronizing database schema..."
  npx prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate || true
fi

# Automatic service detection based on port or environment flags
if [ "$APP" = "api" ] || [ "$PORT" = "3001" ] || [ -n "$TELEGRAM_BOT_TOKEN" -a -z "$DASHBOARD_PASSWORD" ]; then
  echo "[Pulse] Starting API service on port ${PORT:-3001}..."
  exec node apps/api/dist/server.js
else
  echo "[Pulse] Starting Web dashboard on port ${PORT:-3000}..."
  exec node apps/web/server.js
fi

