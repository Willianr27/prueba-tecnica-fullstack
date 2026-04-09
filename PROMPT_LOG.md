# PROMPT_LOG

Registro de cómo se usó IA durante la construcción de Signal Watcher. Este es el meta-log: no las llamadas IA en runtime (esas viven en Postgres + Prometheus), sino la colaboración humano ↔ asistente durante el desarrollo.

| Fecha | Objetivo | Resumen del prompt | Resultado | Decisión |
|---|---|---|---|---|
| 2026-04-08 | Entender requisitos | Pedí al asistente leer el PDF de la prueba técnica y producir un plan paso a paso | Plan generado cubriendo stack, módulos, observabilidad, despliegue | Aprobado como `~/.claude/plans/polymorphic-kindling-conway.md` |
| 2026-04-08 | Elegir proveedor de IA | Discusión OpenAI vs Google AI Studio (Gemini) | Gemini elegido por free-tier y soporte de structured output JSON | `AI_PROVIDER=gemini`, `gemini-2.5-flash` |
| 2026-04-08 | Scaffolding del monorepo | Generación de `package.json`, `pnpm-workspace.yaml`, configs base de TS, prettier, gitignore, docker-compose | Archivos escritos en `C:\Users\willi\Prueba` | — |
| 2026-04-08 | Esqueleto del backend | Generación de la app Fastify con Pino, config validada con Zod, plugin de correlation-id, métricas Prometheus, error handler, ruta health | Código en `apps/api/src/{app,server,core,plugins,modules/health}` | — |
| 2026-04-08 | Adapter de IA | Diseño de la interfaz `AIProvider`, `MockProvider` (clasificador determinista por keywords), `GeminiProvider` con `@google/genai` y `responseSchema`, más `AiService` con caché Redis + retry + fallback | Código en `apps/api/src/modules/ai/*` | Documentado en ADR-002 |
| 2026-04-08 | Watchlists y eventos | Servicio CRUD + rutas; simulador de eventos generando payloads realistas; endpoint `/simulate` orquestando IA + persistencia | Código en `apps/api/src/modules/{watchlists,events}` | — |
| 2026-04-08 | Frontend | Next.js 15 App Router, Tailwind, Server Actions para create/delete/simulate, badges de severidad, páginas list y detail | Código en `apps/web` | — |
| 2026-04-08 | Tests | Tests Vitest para las reglas del `MockProvider` y el `AiService` (caché + fallback) | `apps/api/tests/*.test.ts` | — |
| 2026-04-08 | DevOps | GitHub Actions CI (con servicios postgres+redis), Dockerfile multi-stage para el backend con usuario no-root | `.github/workflows/ci.yml`, `apps/api/Dockerfile` | — |
| 2026-04-08 | Documentación | README, ADR-001 (stack), ADR-002 (adapter de IA), RUNBOOK | `README.md`, `docs/*.md` | — |
| 2026-04-08 | Fix CI shared package | El `api` (NodeNext) requería extensiones `.js` pero el webpack de Next no las resolvía. Solución: compilar `packages/shared` a `dist/` con `tsc` y apuntar `main`/`types` a `dist/` | `packages/shared/{package.json,tsconfig.json}` + paso "Build shared package" en CI | — |
| 2026-04-08 | Fix puertos locales | Conflictos con servicios fantasma de WSL en 5432/6379. Remapeo a 5433/6380 + carga explícita de `.env` con `--env-file` para tsx | `docker-compose.yml`, `apps/api/package.json`, `.env.example` | — |
| 2026-04-08 | Documentación en español | Reescritura completa de README, ADRs, RUNBOOK y este log al español, con guía de uso end-to-end | Este commit | — |
| 2026-04-08 | Despliegue en la nube | Iteración sobre Dockerfile (pnpm deploy, binary target `linux-musl-openssl-3.0.x`, migraciones al arrancar, openssl en alpine) + Railway API + Vercel web | Backend en `signal-watcherapi-production.up.railway.app`, frontend en Vercel | — |
| 2026-04-09 | UI guide P0 + P1 | Aplicación de mejoras del primer UI guide: watchlist cards en grid con chips y mini-barra de severidad, event cards con secciones (IA summary, acción, metadata), StatsBar con `GET /api/stats`, EmptyState, timestamps relativos con date-fns, toasts con sonner, tag de tipo de evento | `components/{dashboard,events,watchlists,ui}/*.tsx` + endpoint `/api/stats` | — |
| 2026-04-09 | Polish guide | 6 ajustes visuales: labels a sentence case, subir contraste de metadata con middle dot, botón simular en outline, EmptyState con CTA, dot verde/gris para provider, formulario como Dialog modal | `components/ui/Dialog.tsx`, `components/watchlists/NewWatchlistButton.tsx`, refactor de WatchlistForm con props `bare`/`onSuccess` | — |
| 2026-04-09 | Header, footer y BackLink | SiteHeader sticky con logo animado + nav + indicador Operativo, SiteFooter con stack chips y links, componente BackLink con chip en vez de texto plano | `components/layout/{SiteHeader,SiteFooter}.tsx`, `components/ui/BackLink.tsx` | — |

## Uso de IA en runtime

Cada simulación de evento dispara una llamada al LLM contra `gemini-2.5-flash` (o el mock determinista). Inputs y outputs quedan guardados en la tabla `Event` para auditoría:
- `rawPayload` — el evento simulado que se le pasó al modelo
- `summary`, `severity`, `suggestedAction` — la salida del modelo (validada contra `AiEnrichmentSchema`)
- `aiProvider`, `aiLatencyMs` — proveniencia y rendimiento

Eventos idénticos dentro de `AI_CACHE_TTL_SECONDS` (default 600s) se sirven desde Redis sin contactar al modelo — ver métrica `ai_cache_hits_total`.
