#!/bin/sh
set -e

# If explicit arguments were passed to the container, execute them directly
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Locate local Prisma CLI without contacting npm registry
PRISMA_CLI=""
if [ -x "./node_modules/.bin/prisma" ]; then
  PRISMA_CLI="./node_modules/.bin/prisma"
elif [ -x "./packages/db/node_modules/.bin/prisma" ]; then
  PRISMA_CLI="./packages/db/node_modules/.bin/prisma"
elif command -v prisma >/dev/null 2>&1; then
  PRISMA_CLI="prisma"
fi

# Controlled, observable and non-destructive database deployment migration workflow
if [ -n "$DATABASE_URL" ]; then
  echo "[Pulse] Checking database connection and schema migrations..."
  if [ -n "$PRISMA_CLI" ]; then
    echo "[Pulse] Running database migrations with $PRISMA_CLI..."
    if ! "$PRISMA_CLI" migrate deploy --schema=packages/db/prisma/schema.prisma; then
      echo "[Pulse] Initial migrate deploy encountered existing unmanaged schema, reconciling baseline..."
      # If tables exist but _prisma_migrations is uninitialized, baseline migration 1
      "$PRISMA_CLI" migrate resolve --applied 20261030152103_add_auth_and_ownership --schema=packages/db/prisma/schema.prisma 2>/dev/null || true
      echo "[Pulse] Re-applying migrations after baseline reconciliation..."
      "$PRISMA_CLI" migrate deploy --schema=packages/db/prisma/schema.prisma
    fi
    echo "[Pulse] Database schema migrations applied successfully."
  else
    echo "[Pulse] ERROR: Local Prisma CLI binary not found. Refusing to download unbundled CLI." >&2
    exit 1
  fi
fi

# Automatic service detection based on port or environment flags
if [ "$APP" = "api" ] || [ "$PORT" = "3001" ] || [ -n "$TELEGRAM_BOT_TOKEN" -a -z "$DASHBOARD_PASSWORD" ]; then
  echo "[Pulse] Starting API service on port ${PORT:-3001}..."
  exec node apps/api/dist/server.js
else
  echo "[Pulse] Starting Web dashboard on port ${PORT:-3000}..."
  exec node apps/web/server.js
fi

