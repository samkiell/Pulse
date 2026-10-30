# syntax=docker/dockerfile:1
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifest files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source trees
COPY packages/db ./packages/db
COPY packages/sdk ./packages/sdk
COPY apps/api ./apps/api

# Generate Prisma client and build packages
RUN pnpm --filter @pulse/db generate
RUN pnpm --filter @samkiel/pulse build
RUN pnpm --filter @pulse/api build

# Runner stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nodejs

# Copy root workspace and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built api package
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy database client and schema for runtime operations
COPY --from=builder --chown=nodejs:nodejs /app/packages/db ./packages/db

# Copy sdk package for internal workspace resolution
COPY --from=builder --chown=nodejs:nodejs /app/packages/sdk ./packages/sdk

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

CMD ["node", "apps/api/dist/server.js"]

