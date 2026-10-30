# syntax=docker/dockerfile:1
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo configuration and package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies across all workspace packages
RUN pnpm install --frozen-lockfile=false

# Copy source trees
COPY packages/db ./packages/db
COPY packages/sdk ./packages/sdk
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Generate Prisma client and build all workspace artifacts
RUN pnpm --filter @pulse/db generate
RUN pnpm --filter @samkiel/pulse build
RUN pnpm --filter @pulse/api build
RUN pnpm --filter @pulse/web build

# Production runner stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nodejs

# Copy root workspace and dependencies for API
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=nodejs:nodejs /app/packages/sdk ./packages/sdk
COPY --from=builder --chown=nodejs:nodejs /app/apps/api ./apps/api

# Copy standalone output and static assets for Web
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

# Copy entrypoint script and normalize line endings
COPY --chown=nodejs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

USER nodejs

EXPOSE 3000 3001

ENTRYPOINT ["./docker-entrypoint.sh"]

