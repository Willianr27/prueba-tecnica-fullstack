# PROMPT_LOG

Record of how AI was used during the construction of Signal Watcher. This is the meta-log: not the runtime AI calls (those live in Postgres + Prometheus), but the human↔assistant collaboration during development.

| Date | Goal | Prompt summary | Outcome | Decision |
|---|---|---|---|---|
| 2026-04-08 | Understand requirements | Asked the assistant to read the technical-test PDF and produce a step-by-step plan | Plan generated covering stack, modules, observability, deploy | Approved as `~/.claude/plans/polymorphic-kindling-conway.md` |
| 2026-04-08 | Choose AI provider | Discussed OpenAI vs Google AI Studio (Gemini) | Gemini chosen for free-tier and JSON-structured output support | `AI_PROVIDER=gemini`, `gemini-flash-latest` |
| 2026-04-08 | Scaffold monorepo | Generated `package.json`, `pnpm-workspace.yaml`, base TS config, prettier, gitignore, docker-compose | Files written under `C:\Users\willi\Prueba` | — |
| 2026-04-08 | Backend skeleton | Generated Fastify app with Pino, Zod-validated config, correlation-id plugin, Prometheus metrics, error handler, health route | Code in `apps/api/src/{app,server,core,plugins,modules/health}` | — |
| 2026-04-08 | AI adapter | Designed `AIProvider` interface, `MockProvider` (deterministic keyword classifier), `GeminiProvider` using `@google/genai` with `responseSchema`, plus `AiService` with Redis cache + retry + graceful fallback | Code in `apps/api/src/modules/ai/*` | Documented in ADR-002 |
| 2026-04-08 | Watchlists & events | CRUD service + routes; event simulator generating realistic payloads; `/simulate` endpoint orchestrating AI + persistence | Code in `apps/api/src/modules/{watchlists,events}` | — |
| 2026-04-08 | Frontend | Next.js 15 App Router, Tailwind, Server Actions for create/delete/simulate, severity badges, watchlists list & detail pages | Code in `apps/web` | — |
| 2026-04-08 | Tests | Vitest tests for `MockProvider` rules and `AiService` cache + fallback | `apps/api/tests/*.test.ts` | — |
| 2026-04-08 | DevOps | GitHub Actions CI (postgres+redis services), multi-stage Dockerfile for the backend with non-root user | `.github/workflows/ci.yml`, `apps/api/Dockerfile` | — |
| 2026-04-08 | Documentation | README, ADR-001 (stack), ADR-002 (AI adapter), RUNBOOK | `README.md`, `docs/*.md` | — |

## Runtime AI usage
Each event simulation triggers one LLM call against `gemini-flash-latest` (or the deterministic mock). Inputs and outputs are stored in the `Event` table for auditability:
- `rawPayload` — the simulated event passed to the model
- `summary`, `severity`, `suggestedAction` — the model output (validated against `AiEnrichmentSchema`)
- `aiProvider`, `aiLatencyMs` — provenance and performance

Identical events within `AI_CACHE_TTL_SECONDS` (default 600s) are served from Redis without contacting the model — see `ai_cache_hits_total` metric.
