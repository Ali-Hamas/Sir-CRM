# Multi-stage Dockerfile for Next.js 14 Frontend

# Stage 1: Base dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/frontend/package.json ./apps/frontend/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --filter frontend...

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

COPY apps/frontend ./apps/frontend
COPY package.json pnpm-workspace.yaml turbo.json ./

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}

WORKDIR /app/apps/frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
