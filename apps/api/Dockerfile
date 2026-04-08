# syntax=docker/dockerfile:1.6
# ─────────── Stage 1: build ───────────
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile=false

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @signal-watcher/api prisma generate
RUN pnpm --filter @signal-watcher/api build

# ─────────── Stage 2: runtime ───────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./package.json
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages/shared ./node_modules/@signal-watcher/shared

USER app
EXPOSE 3001

CMD ["node", "dist/server.js"]
