# syntax=docker/dockerfile:1

# IMPORTANT: this image requires the REPOSITORY ROOT as its build context, not
# apps/web. A pnpm workspace cannot be installed from a subdirectory, because
# the lockfile describes every workspace project.
#
# If deploying to Railway, set the service root to the repository root and the
# Dockerfile path to apps/web/Dockerfile.

# ---------- base ----------
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Pinned to the exact version that produced pnpm-lock.yaml (see the
# `packageManager` field in package.json), so `--frozen-lockfile` below cannot
# fail on a workspace or lockfile format mismatch.
RUN npm install -g pnpm@12.8.1 --no-audit --no-fund

# ---------- dependencies ----------
FROM base AS deps
WORKDIR /app

# Every workspace manifest must be present before installing. pnpm compares the
# on-disk workspace against pnpm-lock.yaml, so omitting any project (for example
# apps/relay) makes --frozen-lockfile fail with ERR_PNPM_OUTDATED_LOCKFILE.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/relay/package.json ./apps/relay/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM base AS builder
WORKDIR /app

# Copy installed dependencies first so this layer is cached across source edits.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# .dockerignore keeps local node_modules, .next, .git and .env files out of the
# context, so this does not clobber the layer above or bake in secrets.
COPY . .

# Must use the package name, not the directory name.
RUN pnpm --filter @deepsee/web build

# ---------- runtime ----------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: 'standalone'` in next.config.ts emits a self-contained server plus a
# pruned node_modules, so the runtime image needs no install step.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]