# syntax=docker/dockerfile:1.6
#
# Multi-stage Dockerfile for NEXORA.
#
# Stage 1 (deps):    install full node_modules for build-time use.
# Stage 2 (builder): run `next build` which produces `.next/standalone`
#                    containing only the runtime-required subset of deps.
# Stage 3 (runner):  copy the standalone bundle into a slim image and
#                    run as a non-root user.
#
# Final image is ~180MB and boots in under a second on a 1-vCPU VPS.

# ─── Stage 1: install deps ─────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Prisma needs OpenSSL at runtime on Alpine.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma
# `postinstall` runs `prisma generate`, which needs the schema.
RUN npm ci --ignore-scripts && npx prisma generate


# ─── Stage 2: build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL is not needed at build time thanks to the lazy-init
# Prisma client (src/lib/prisma.ts). AUTH_SECRET has to be present
# though — any long random string works for the build-time check.
ENV AUTH_SECRET=build-time-placeholder-replaced-at-runtime

RUN npm run build


# ─── Stage 3: runner ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat openssl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone bundle includes a minimal node_modules tree.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma migrations are needed at container start to run `migrate deploy`.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs
EXPOSE 3000

# Healthcheck hits /api/status (no DB dependency, sub-10ms response).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --spider --quiet http://localhost:3000/api/status || exit 1

# Run migrations then boot the server. `migrate deploy` is safe to run
# every start — it's a no-op when migrations are already applied.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
