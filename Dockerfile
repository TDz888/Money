# syntax=docker/dockerfile:1.7

# ---------- Dependencies stage ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- Builder stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./prisma/dev.db"
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# ---------- Runner stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy standalone output (includes traced node_modules subset)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy Prisma engine + generated client + CLI (needed for runtime db push)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Persistent data dir for SQLite (mount a Railway volume here in production)
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000

# Default: apply schema then start. Railway's startCommand in railway.toml
# controls the actual command and overrides this. Kept in sync.
CMD ["sh", "-c", "DATABASE_URL=${DATABASE_URL:-file:/data/dev.db} node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss --schema=./prisma/schema.prisma && node server.js"]
