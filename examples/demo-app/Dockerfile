# syntax=docker/dockerfile:1
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifest files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sdk/package.json ./packages/sdk/
COPY examples/demo-app/package.json ./examples/demo-app/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source trees
COPY packages/sdk ./packages/sdk
COPY examples/demo-app ./examples/demo-app

# Build sdk and demo-app
RUN pnpm --filter @samkiel/pulse-monitor build
RUN pnpm --filter @pulse/demo-app build

# Runner stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/examples/demo-app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/examples/demo-app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/examples/demo-app/node_modules ./node_modules

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

CMD ["node", "dist/index.js"]
