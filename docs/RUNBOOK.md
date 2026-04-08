# Runbook — Signal Watcher

Operational procedures for running, debugging and maintaining Signal Watcher.

## Services

| Service | Port | Notes |
|---|---|---|
| `apps/web` (Next.js) | 3000 | Talks to the API server-side via `API_BASE_URL` |
| `apps/api` (Fastify) | 3001 | Exposes `/health`, `/metrics`, `/api/*` |
| Postgres | 5432 | Managed by `docker-compose.yml` locally |
| Redis | 6379 | Managed by `docker-compose.yml` locally |

## Common tasks

### Bring everything up locally
```bash
docker compose up -d
pnpm install
pnpm --filter @signal-watcher/api prisma migrate deploy
pnpm dev
```

### Reset the database
```bash
pnpm --filter @signal-watcher/api prisma migrate reset
```
This wipes data and re-runs migrations and the seed.

### Rotate the Gemini API key
1. Revoke the old key at https://aistudio.google.com/apikey.
2. Generate a new key.
3. Update `GEMINI_API_KEY` in the deployment environment (Railway/Render dashboard).
4. Restart the API service. Verify with `curl https://<api-host>/health` and a single simulated event.
5. **Never** commit the key, paste it in chats, or echo it in logs. Pino is configured to redact `*.GEMINI_API_KEY`, but treat any leaked key as compromised and rotate immediately.

### Clear the AI cache
The cache is stored in Redis under keys `ai:enrich:*`.
```bash
redis-cli --scan --pattern 'ai:enrich:*' | xargs redis-cli del
```
Or set `AI_CACHE_TTL_SECONDS=1` and let entries expire naturally.

### Switch AI provider
- Set `AI_PROVIDER=mock` (no key needed) to disable real LLM calls — useful during incidents or quota exhaustion.
- Set `AI_PROVIDER=gemini` and ensure `GEMINI_API_KEY` is present.
Restart the API to apply.

## Observability

### Reading metrics
```bash
curl http://localhost:3001/metrics
```
Important counters:
- `http_requests_total{status="5xx"}` — server errors
- `ai_calls_total{outcome="failure"}` — LLM failures
- `ai_cache_hits_total` — cache effectiveness

### Tracing a request end-to-end
Each response includes an `x-correlation-id` header. Find it in the frontend network panel and grep the API logs:
```bash
docker logs signal-watcher-api 2>&1 | grep '<correlation-id>'
```
You can also force your own:
```bash
curl -H 'x-correlation-id: debug-123' http://localhost:3001/api/watchlists
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API exits at startup with "Invalid environment configuration" | Missing/typo in env var | Check `.env` against `.env.example` |
| `/health` returns 503 | DB or Redis unreachable | `docker compose ps`, check connection strings |
| All events return severity `LOW` and "AI enrichment unavailable" | Gemini failing after retries | Check `ai_calls_total{outcome="failure"}`, verify API key & quota |
| Frontend shows "Failed to fetch" | `API_BASE_URL` wrong or CORS misconfigured | Update env, ensure `CORS_ORIGINS` includes the frontend host |
| Rate limited (429) | More than 100 req/min from one IP | Adjust `@fastify/rate-limit` config in `apps/api/src/app.ts` |

## On-call escalation
This is a take-home project — no on-call. In a real deployment:
1. Page the API owner for any sustained `5xx` rate above 1%.
2. Page the data owner if the cache hit rate drops to ~0% (likely Redis outage).
