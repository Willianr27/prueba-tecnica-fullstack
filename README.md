# Signal Watcher

AI-first watchlist monitor. An analyst creates **watchlists** of brands, domains or keywords; the system simulates incoming security events; an LLM **summarizes**, **classifies severity** (`LOW`/`MED`/`HIGH`/`CRITICAL`) and **suggests the next action**.

Built as a technical test focused on architecture, observability, and real (not demo) AI integration.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node 20 · TypeScript · **Fastify** · Pino · Zod · prom-client |
| Persistence | **PostgreSQL 16** + Prisma ORM |
| Cache | **Redis 7** (in-memory fallback if `REDIS_URL` is unset) |
| AI | **Google Gemini** (`gemini-flash-latest`) via `@google/genai`, with a deterministic `MockProvider` for tests/dev |
| Frontend | **Next.js 15** App Router · Server Actions · Tailwind CSS |
| Tests | Vitest |
| CI | GitHub Actions (lint · typecheck · test · build) |
| Deploy | Vercel (frontend) · Railway / Render (backend Docker) |

## Repo layout

```
signal-watcher/
├─ apps/
│  ├─ api/         # Fastify backend
│  └─ web/         # Next.js frontend
├─ packages/
│  └─ shared/      # Zod schemas & types shared by both apps
├─ docs/
│  ├─ ADR-001-stack.md
│  ├─ ADR-002-ai-adapter.md
│  └─ RUNBOOK.md
├─ .github/workflows/ci.yml
├─ docker-compose.yml
├─ .env.example
└─ PROMPT_LOG.md
```

## Quick start (local)

> Requires Node 20+, pnpm 10+, Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure environment
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# (edit GEMINI_API_KEY and set AI_PROVIDER=gemini if you want real AI;
#  leave AI_PROVIDER=mock to run with no key.)

# 4. Run database migrations + seed
pnpm --filter @signal-watcher/api prisma migrate dev
pnpm --filter @signal-watcher/api prisma:seed

# 5. Run both apps
pnpm dev
```

- Frontend → http://localhost:3000
- Backend → http://localhost:3001
- Metrics → http://localhost:3001/metrics
- Health → http://localhost:3001/health

## Environment variables

See [`.env.example`](./.env.example). All env vars are validated at startup with Zod (`apps/api/src/core/config.ts`) — the API fails fast if anything is missing or malformed.

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `REDIS_URL` | ⚠️ | Optional; falls back to in-memory cache |
| `AI_PROVIDER` | ✅ | `gemini` or `mock` |
| `GEMINI_API_KEY` | if `AI_PROVIDER=gemini` | Get one at https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | – | Defaults to `gemini-flash-latest` |
| `CORS_ORIGINS` | – | Comma-separated list |
| `API_BASE_URL` | ✅ (web) | Server-side URL the frontend uses to call the API |

## API

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/watchlists` | Create `{ name, terms[] }` |
| `GET` | `/api/watchlists` | List |
| `GET` | `/api/watchlists/:id` | Detail + last 50 events |
| `DELETE` | `/api/watchlists/:id` | Delete |
| `POST` | `/api/watchlists/:id/events/simulate` | Generate fake event → enrich with AI → persist |
| `GET` | `/api/events?watchlistId=` | List events for a watchlist |
| `GET` | `/health` | Liveness + DB/Redis check |
| `GET` | `/metrics` | Prometheus metrics |

All errors follow `{ error: { code, message, correlationId, details? } }`. Every request gets an `x-correlation-id` header (echoed back); pass your own to trace a flow end-to-end.

## Observability

- **Structured logs**: Pino JSON, with `correlationId` propagated automatically into every child logger.
- **Prometheus metrics**:
  - `http_requests_total{method,route,status}`
  - `http_request_duration_seconds`
  - `ai_calls_total{provider,outcome}`
  - `ai_call_duration_seconds`
  - `ai_cache_hits_total`
- **Health check** pings both Postgres and Redis.

## Tests

```bash
pnpm test
```

Covers the AI service (caching + graceful degradation) and the MockProvider classification rules.

## Deploy

- **Frontend (Vercel)**: import the repo, root = `apps/web`, set `API_BASE_URL` to the public backend URL.
- **Backend (Railway / Render / Fly)**: use `apps/api/Dockerfile`, attach Postgres + Redis addons, set the env vars.
- See [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) for ops procedures.

## Security notes

- API key for Gemini lives **only on the backend**. The frontend talks to the backend via Server Actions; the browser never sees the key.
- Helmet, CORS, rate limiting (100 req/min) enabled by default.
- Env vars validated at boot; secrets redacted from logs.
- `.env` is gitignored; only `.env.example` is committed.

## Documentation

- [`docs/ADR-001-stack.md`](./docs/ADR-001-stack.md) — why Fastify + Prisma + Next.js
- [`docs/ADR-002-ai-adapter.md`](./docs/ADR-002-ai-adapter.md) — adapter pattern + Mock provider + caching
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — ops procedures
- [`PROMPT_LOG.md`](./PROMPT_LOG.md) — record of AI usage during development
