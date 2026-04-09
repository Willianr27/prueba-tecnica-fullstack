# Signal Watcher

Monitor de listas de vigilancia con IA. Un analista crea **watchlists** (listas de marcas, dominios o palabras clave); el sistema simula eventos de seguridad entrantes y un LLM los **resume**, **clasifica su severidad** (`LOW`/`MED`/`HIGH`/`CRITICAL`) y **sugiere la siguiente acción**.

Construido como prueba técnica enfocada en arquitectura, observabilidad e integración real (no de juguete) con IA.

### Dashboard — listado con stats y watchlist cards

![Dashboard con stats bar, watchlist cards, header y footer](./docs/screenshots/01-listado-watchlists.png)

Incluye: header sticky con indicador *Operativo*, barra de stats (eventos totales, críticos, listas activas, proveedor IA), watchlist cards en grid con chips de términos y mini-barra de severidad, y footer con stack y enlaces a documentación.

### Detalle — eventos enriquecidos por IA

![Detalle de watchlist con event cards: resumen IA, acción sugerida y metadata](./docs/screenshots/02-detalle-eventos.png)

Cada event card separa visualmente: **badge de severidad** + tipo de evento + timestamp relativo, **resumen de IA** con borde izquierdo coloreado por severidad, **acción sugerida** en un bloque destacado, y **metadata** (proveedor con dot verde si es Gemini, latencia, caché).

---

## Tabla de contenidos

1. [¿Qué hace este proyecto?](#qué-hace-este-proyecto)
2. [Cómo funciona por dentro](#cómo-funciona-por-dentro)
3. [Stack](#stack)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Puesta en marcha local](#puesta-en-marcha-local)
6. [Guía de uso](#guía-de-uso)
7. [Variables de entorno](#variables-de-entorno)
8. [API REST](#api-rest)
9. [Observabilidad](#observabilidad)
10. [Tests](#tests)
11. [Despliegue](#despliegue)
12. [Notas de seguridad](#notas-de-seguridad)
13. [Documentación adicional](#documentación-adicional)

---

## ¿Qué hace este proyecto?

Signal Watcher resuelve un caso real de un analista de seguridad / threat intelligence:

> "Quiero vigilar ciertas marcas, dominios o palabras clave y, cuando llegue un evento sospechoso relacionado, quiero que la IA me diga **qué pasó**, **qué tan grave es** y **qué hago al respecto** — sin tener que leer el JSON crudo."

El producto cubre tres flujos:

1. **Crear y administrar watchlists.** Cada watchlist tiene un nombre y una lista de términos (`acme.com`, `ransomware`, `acme-corp`, …).
2. **Simular eventos.** Como en una prueba técnica no hay un feed real de inteligencia, el backend genera eventos sintéticos verosímiles (intentos de login, dominios parecidos, menciones en filtraciones, etc.) asociados a una watchlist.
3. **Enriquecer con IA.** Cada evento pasa por un proveedor LLM (Google Gemini en producción, un *mock* determinista en tests) que devuelve:
   - `summary` — explicación en lenguaje natural de qué ocurrió.
   - `severity` — `LOW` / `MED` / `HIGH` / `CRITICAL`.
   - `suggestedAction` — qué debería hacer el analista a continuación.

Toda la enriquecimiento queda persistido en Postgres junto con el payload original, así que el evento es **auditable** (se sabe qué entró, qué salió, con qué proveedor y cuánto tardó).

---

## Cómo funciona por dentro

```
┌──────────────┐  Server Action  ┌────────────────┐  enrichEvent()  ┌──────────────┐
│  Next.js 15  │ ───────────────▶│  Fastify API   │ ───────────────▶│ AI Provider  │
│   (apps/web) │                 │   (apps/api)   │                 │ Gemini / Mock│
└──────────────┘                 └────────┬───────┘                 └──────────────┘
                                          │
                          ┌───────────────┼─────────────────┐
                          ▼               ▼                 ▼
                     ┌─────────┐    ┌─────────┐       ┌────────────┐
                     │ Postgres│    │  Redis  │       │ Prometheus │
                     │ (Prisma)│    │ (cache) │       │ /metrics   │
                     └─────────┘    └─────────┘       └────────────┘
```

### Flujo de un evento simulado

1. El usuario hace clic en **"Simular evento"** en la UI.
2. La página de Next.js ejecuta una **Server Action** que llama a `POST /api/watchlists/:id/events/simulate` en el backend (la URL nunca queda expuesta al navegador).
3. Fastify recibe la petición, le asigna un `correlationId`, valida con Zod y delega en `EventsService`.
4. `EventsService` genera un payload sintético (`rawPayload`) y se lo pasa a `AiService`.
5. `AiService` calcula un hash SHA-256 del input + nombre del proveedor → si está en Redis, devuelve la respuesta cacheada y suma `ai_cache_hits_total`. Si no, llama al `AIProvider`.
6. **Gemini** es invocado con `responseMimeType: "application/json"` y un `responseSchema`, así devuelve siempre un objeto estructurado. La respuesta se **revalida con Zod** — nunca se confía ciegamente en el LLM.
7. Si el proveedor falla tras 1 reintento + timeout de 15s, `AiService` **degrada gracefully**: devuelve `severity: 'LOW'` con un summary stub para que el evento se persista igualmente y la UI no se rompa. Esto se loguea como `error` y se cuenta en `ai_calls_total{outcome="failure"}`.
8. El evento (payload + enriquecimiento + provider + latencia) se guarda en Postgres y se devuelve al frontend, que lo muestra con un badge de severidad.

### Adaptador de IA

`AIProvider` es una interfaz con dos implementaciones:

| Provider | Cuándo se usa | Comportamiento |
|---|---|---|
| `GeminiProvider` | `AI_PROVIDER=gemini` con `GEMINI_API_KEY` | Llama a `gemini-2.5-flash` con structured output y system prompt en español |
| `MockProvider` | `AI_PROVIDER=mock` (default en tests/dev) | Clasificador determinista por palabras clave (`ransomware → CRITICAL`, `phishing → HIGH`, …) |

Agregar OpenAI/Anthropic/Azure es **un archivo nuevo** que implemente la interfaz + un `case` en el factory. Detalles en [`docs/ADR-002-ai-adapter.md`](./docs/ADR-002-ai-adapter.md).

### Schemas compartidos

`packages/shared` contiene los schemas Zod (`WatchlistSchema`, `EventSchema`, `AiEnrichmentSchema`, …) que **ambos** lados consumen. Es la única forma en que tipos cruzan la frontera front ↔ back; nunca se exportan tipos de Prisma al frontend.

### Frontend (Next.js 15)

El web es un App Router puro, con **Server Components** por defecto y **Server Actions** para todas las mutaciones. Componentes destacados:

- `components/layout/SiteHeader.tsx` — header sticky con logo, navegación activa e indicador *Operativo*.
- `components/layout/SiteFooter.tsx` — footer con stack, enlaces a documentación y copyright.
- `components/dashboard/StatsBar.tsx` — 4 metric cards alimentadas por `GET /api/stats`.
- `components/watchlists/WatchlistCard.tsx` — tarjeta con términos como chips y mini-barra de severidad computada desde `severityCounts`.
- `components/watchlists/NewWatchlistButton.tsx` + `components/ui/Dialog.tsx` — botón que abre un modal (backdrop, ESC, scroll lock) con `WatchlistForm` dentro.
- `components/events/EventCard.tsx` — tarjeta de evento con header, sección IA con borde por severidad, acción sugerida y metadata con dot verde/gris por proveedor.
- `components/ui/EmptyState.tsx` — estado vacío reutilizable con icono SVG, título, descripción y CTA opcional.
- `components/ui/RelativeTime.tsx` — timestamps relativos con `date-fns/es` y tooltip con la fecha absoluta.
- `components/SimulateEventButton.tsx` — dispara la Server Action y muestra un toast con la severidad devuelta.

**Feedback inmediato**: `sonner` maneja los toasts (creación, simulación, errores) con tema dark y posición bottom-right.

### Observabilidad de primer día

- **Logs estructurados Pino** con `correlationId` propagado automáticamente a cada child logger. Cada request entra y sale con su id.
- **Métricas Prometheus** en `/metrics`: HTTP, latencia, llamadas a IA, hits de caché.
- **Health check** en `/health` que pinguea Postgres y Redis.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node 20 · TypeScript · **Fastify 5** · Pino · Zod · prom-client |
| Persistencia | **PostgreSQL 16** + Prisma ORM |
| Caché | **Redis 7** (con fallback en memoria si `REDIS_URL` no está definida) |
| IA | **Google Gemini** (`gemini-flash-latest`) vía `@google/genai`, con `MockProvider` determinista para tests/dev |
| Frontend | **Next.js 15** App Router · Server Actions · Tailwind CSS · Sonner (toasts) · date-fns |
| Tests | Vitest |
| CI | GitHub Actions (typecheck · test · build, con servicios Postgres + Redis) |
| Despliegue | Vercel (frontend) · Railway / Render (backend Docker) |

---

## Estructura del repositorio

```
signal-watcher/
├─ apps/
│  ├─ api/                       # Backend Fastify
│  │  ├─ prisma/                 # Schema + migraciones + seed
│  │  ├─ src/
│  │  │  ├─ core/                # config, logger, cache, metrics, errors
│  │  │  ├─ plugins/             # correlation-id, error-handler
│  │  │  ├─ modules/
│  │  │  │  ├─ ai/               # AIProvider, Gemini, Mock, AiService
│  │  │  │  ├─ watchlists/
│  │  │  │  ├─ events/
│  │  │  │  └─ health/
│  │  │  ├─ app.ts               # registra plugins, rutas, middlewares
│  │  │  └─ server.ts            # bootstrap
│  │  └─ tests/                  # Vitest
│  └─ web/                       # Frontend Next.js 15
│     ├─ src/app/                # App Router (server components + actions)
│     └─ src/lib/                # cliente API server-side
├─ packages/
│  └─ shared/                    # Schemas Zod compartidos (compilado a dist/)
├─ docs/
│  ├─ ADR-001-stack.md           # Por qué Fastify + Prisma + Next.js
│  ├─ ADR-002-ai-adapter.md      # Patrón adapter + caché + degradación
│  └─ RUNBOOK.md                 # Procedimientos de operación
├─ .github/workflows/ci.yml
├─ docker-compose.yml            # Postgres (5433) + Redis (6380)
├─ .env.example
├─ PROMPT_LOG.md                 # Registro de uso de IA durante el desarrollo
└─ README.md
```

---

## Puesta en marcha local

> **Prerrequisitos:** Node 20+, pnpm 10+, Docker Desktop.

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar Postgres + Redis (puertos 5433 y 6380 para evitar conflictos locales)
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edita apps/api/.env si quieres usar Gemini real:
#   AI_PROVIDER=gemini
#   GEMINI_API_KEY=tu-clave
# Si lo dejas en mock, no hace falta API key.

# 4. Compilar el paquete shared (necesario por NodeNext en api + webpack en web)
pnpm run build:shared

# 5. Migraciones de base de datos
pnpm --filter @signal-watcher/api run prisma:deploy

# 6. Arrancar ambas apps en paralelo
pnpm dev
```

URLs:
- **Frontend** → http://localhost:3000
- **Backend** → http://localhost:3001
- **Health** → http://localhost:3001/health
- **Métricas** → http://localhost:3001/metrics

---

## Guía de uso

### 1. Dashboard

Abre http://localhost:3000/watchlists. Arriba de todo ves una **barra de stats** con 4 métricas leídas de `GET /api/stats`:

- **Eventos totales** — conteo global de eventos en todas las listas.
- **Críticos** — conteo de `severity=CRITICAL` (en rojo si hay alguno).
- **Listas activas** — número de watchlists.
- **Proveedor IA** — `Gemini` o `Mock` según el backend (en verde).

### 2. Crear una watchlist

Haz clic en el botón **"+ Nueva lista"** del header de la sección. Se abre un **dialog modal** con dos campos:

- **Nombre**: identificador legible (ej. `Marca ACME`).
- **Términos**: uno por línea o separados por comas (ej. `acme.com, acme-corp, ransomware-acme`).

Al enviar, una Server Action llama al backend, crea la watchlist en Postgres y muestra un **toast de confirmación**. La página se revalida y el dialog se cierra automáticamente al tener éxito. Si no hay ninguna lista aún, en lugar del listado verás un **empty state** con un CTA para crear la primera.

### 3. Ver el detalle de una lista

Haz clic en una **watchlist card**. Las cards muestran el nombre, los términos como chips, el conteo de eventos y una mini-barra de severidad con un cuadradito por cada severidad presente (rojo `CRITICAL`, naranja `HIGH`, amarillo `MED`, verde `LOW`). Si la lista tiene críticos, un badge `N críticos` lo avisa en el header de la card.

La página de detalle muestra los últimos 50 eventos como **event cards** con cuatro zonas visualmente separadas:

- **Header** — badge de severidad coloreado, tipo de evento (`malware_mention`, `social_chatter`, …) y timestamp relativo (`hace 2 min`, con la fecha absoluta en el tooltip).
- **Resumen de IA** — el texto del LLM con un borde izquierdo coloreado por severidad.
- **Acción sugerida** — en un bloque destacado con fondo sutil.
- **Metadata** — proveedor (con dot verde si es Gemini, gris si es Mock), latencia en ms y estado de caché, separados por `·`.

### 4. Simular un evento

Botón **"+ Simular evento"** (outline) arriba a la derecha. El backend genera un payload sintético, lo manda a la IA y persiste el resultado. Al recibir la respuesta, aparece un **toast** con la severidad y un preview del resumen. Si el evento contiene la palabra `ransomware` o `phishing`, el `MockProvider` lo clasificará como `CRITICAL` o `HIGH` respectivamente — útil para demos sin Gemini.

Si la lista todavía no tiene eventos, verás un **empty state** con un CTA "+ Simular evento" directamente en el panel vacío.

### 5. Ver métricas

```bash
curl http://localhost:3001/metrics
```

Busca estos contadores:
- `http_requests_total{status="2xx"}` — tráfico exitoso
- `ai_calls_total{provider="gemini",outcome="success"}` — llamadas reales a IA
- `ai_cache_hits_total` — eventos servidos desde caché
- `ai_call_duration_seconds_bucket` — histograma de latencia

### 6. Cambiar de proveedor en caliente

Edita `apps/api/.env`:
```env
AI_PROVIDER=mock     # o gemini
```
Reinicia el api (`tsx watch` se recargará solo si cambias código, pero las env vars requieren reinicio del proceso).

### 7. Trazar una request de punta a punta

Cada respuesta del backend incluye `x-correlation-id`. Pasa el tuyo para forzar un valor:

```bash
curl -H 'x-correlation-id: debug-001' http://localhost:3001/api/watchlists
```

Luego búscalo en los logs del api — todas las líneas que tocó esa request lo llevan.

---

## Variables de entorno

Todas las variables se validan con Zod en el arranque (`apps/api/src/core/config.ts`). Si falta una o tiene un formato inválido, el api **falla rápido** con un mensaje claro en lugar de explotar más adelante. Plantilla en [`.env.example`](./.env.example).

| Variable | Requerida | Notas |
|---|---|---|
| `DATABASE_URL` | ✅ | Cadena de conexión Postgres. Local: `postgresql://signal:signal@localhost:5433/signal_watcher?schema=public` |
| `REDIS_URL` | ⚠️ | Opcional. Si no está, usa caché en memoria. Local: `redis://localhost:6380` |
| `AI_PROVIDER` | ✅ | `gemini` o `mock` |
| `GEMINI_API_KEY` | si `AI_PROVIDER=gemini` | Obtén una en https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | – | Por defecto `gemini-2.5-flash` |
| `AI_CACHE_TTL_SECONDS` | – | Por defecto `600` |
| `CORS_ORIGINS` | – | Lista separada por comas |
| `LOG_LEVEL` | – | `fatal` / `error` / `warn` / `info` / `debug` / `trace` |
| `API_BASE_URL` | ✅ (web) | URL server-side que el frontend usa para llamar al api |

---

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/watchlists` | Crear `{ name, terms[] }` |
| `GET` | `/api/watchlists` | Listar todas (incluye `severityCounts` por lista) |
| `GET` | `/api/watchlists/:id` | Detalle + últimos 50 eventos |
| `GET` | `/api/stats` | Agregados globales para el dashboard (`totalEvents`, `criticalCount`, `watchlistCount`, `aiProvider`, …) |
| `DELETE` | `/api/watchlists/:id` | Eliminar |
| `POST` | `/api/watchlists/:id/events/simulate` | Generar evento sintético → enriquecer con IA → persistir |
| `GET` | `/api/events?watchlistId=` | Listar eventos de una watchlist |
| `GET` | `/health` | Liveness + check de DB y Redis |
| `GET` | `/metrics` | Métricas Prometheus |

Todos los errores siguen el formato `{ error: { code, message, correlationId, details? } }`. Cada request recibe (y devuelve) un header `x-correlation-id`; pásalo tú mismo para trazar un flujo end-to-end.

---

## Observabilidad

- **Logs estructurados**: Pino en JSON, con `correlationId` propagado automáticamente.
- **Métricas Prometheus**:
  - `http_requests_total{method,route,status}`
  - `http_request_duration_seconds`
  - `ai_calls_total{provider,outcome}`
  - `ai_call_duration_seconds`
  - `ai_cache_hits_total`
- **Health check** que pinguea Postgres y Redis y devuelve `ok` / `degraded`.

---

## Tests

```bash
pnpm test
```

Cubre:
- Reglas del `MockProvider` (clasificación por keywords).
- `AiService`: hit/miss de caché y degradación cuando el provider falla.

CI corre lo mismo en GitHub Actions con servicios Postgres + Redis reales.

---

## Despliegue

### Backend — Railway (recomendado)

1. Crea un proyecto nuevo en Railway → **Deploy from GitHub repo** → selecciona este repo.
2. En *Settings*:
   - **Root directory**: déjalo en blanco (la raíz del monorepo).
   - **Dockerfile path**: `apps/api/Dockerfile`.
   - **Build context**: `.` (raíz del repo).
3. Añade dos plugins: **PostgreSQL** y **Redis**.
4. Variables de entorno del servicio api:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referencia automática)
   - `REDIS_URL` = `${{Redis.REDIS_URL}}`
   - `AI_PROVIDER` = `gemini` (o `mock` para arrancar sin clave)
   - `GEMINI_API_KEY` = tu clave (obtén una en https://aistudio.google.com/apikey)
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `CORS_ORIGINS` = la URL pública de tu frontend en Vercel
   - `PORT` = `3001`
5. Deploy. El `CMD` del Dockerfile aplica las migraciones automáticamente al arrancar (`prisma migrate deploy`).
6. Verifica con `curl https://<tu-api>.up.railway.app/health` — debe devolver `{"status":"ok"}`.

> El Dockerfile usa `pnpm deploy` para crear un bundle standalone, instala `openssl` para los engines de Prisma, y declara `linux-musl-openssl-3.0.x` como binary target. Verificado localmente con `docker build -f apps/api/Dockerfile -t signal-watcher-api .`.

### Frontend — Vercel

1. **New Project** → importa el repo.
2. **Root directory**: `apps/web`.
3. **Framework preset**: Next.js (auto-detectado).
4. Variables de entorno:
   - `API_BASE_URL` = la URL pública del backend en Railway
5. Deploy.
6. Vuelve a Railway y agrega la URL final de Vercel a `CORS_ORIGINS`.

Más detalle operacional en [`docs/RUNBOOK.md`](./docs/RUNBOOK.md).

---

## Notas de seguridad

- La **API key de Gemini vive sólo en el backend**. El frontend habla con el backend vía Server Actions; el navegador nunca ve la clave.
- Helmet, CORS y rate limiting (100 req/min) habilitados por defecto.
- Variables de entorno validadas en el arranque; secretos redactados en logs por Pino.
- `.env` está en `.gitignore`; sólo se commitea `.env.example`.
- Si una API key se filtra alguna vez, **rotala inmediatamente** en https://aistudio.google.com/apikey — trata cualquier clave expuesta como comprometida.

---

## Documentación adicional

- [`docs/ADR-001-stack.md`](./docs/ADR-001-stack.md) — Por qué Fastify + Prisma + Next.js
- [`docs/ADR-002-ai-adapter.md`](./docs/ADR-002-ai-adapter.md) — Patrón adapter + provider mock + caché
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — Procedimientos de operación
- [`PROMPT_LOG.md`](./PROMPT_LOG.md) — Registro de uso de IA durante el desarrollo
