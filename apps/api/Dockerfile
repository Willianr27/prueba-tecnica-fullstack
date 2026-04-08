# syntax=docker/dockerfile:1.6
# ─────────── Stage 1: build ───────────
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# --ignore-scripts evita que el `prepare` de packages/shared corra tsc antes
# de que copiemos los fuentes.
RUN pnpm install --frozen-lockfile=false --ignore-scripts

COPY packages/shared packages/shared
COPY apps/api apps/api

# Compilar shared antes que api porque api lo importa por NodeNext (.js)
RUN pnpm --filter @signal-watcher/shared build
RUN pnpm --filter @signal-watcher/api run prisma:generate
RUN pnpm --filter @signal-watcher/api build

# Crear un bundle standalone del api con todas sus dependencias resueltas
RUN pnpm deploy --filter @signal-watcher/api --prod --legacy /deploy
# Reemplazar el symlink al workspace por el contenido real (con dist/ ya compilado)
RUN rm -rf /deploy/node_modules/@signal-watcher/shared \
  && cp -r /repo/packages/shared /deploy/node_modules/@signal-watcher/shared
# Copiar el dist compilado del api dentro del bundle
RUN cp -r /repo/apps/api/dist /deploy/dist
RUN cp -r /repo/apps/api/prisma /deploy/prisma
# Regenerar el cliente Prisma dentro del bundle (el de /repo no está en /deploy)
RUN cd /deploy && node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# ─────────── Stage 2: runtime ───────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# openssl + libc6-compat son necesarios para los engines binarios de Prisma
RUN apk add --no-cache openssl libssl3 libc6-compat \
  && addgroup -S app && adduser -S app -G app

COPY --from=builder /deploy/package.json ./package.json
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/dist ./dist
COPY --from=builder /deploy/prisma ./prisma

RUN chown -R app:app /app

USER app
EXPOSE 3001

# Aplica migraciones de forma idempotente y arranca el servidor.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma && node dist/server.js"]
