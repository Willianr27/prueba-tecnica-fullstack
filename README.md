# Signal Watcher

Monitor de listas de vigilancia con IA. Un analista crea **watchlists** (listas de marcas, dominios o palabras clave); el sistema simula eventos de seguridad entrantes y un LLM los **resume**, **clasifica su severidad** (`LOW`/`MED`/`HIGH`/`CRITICAL`) y **sugiere la siguiente acción**.

Construido como prueba técnica enfocada en arquitectura, observabilidad e integración real (no de juguete) con IA.

| Listado de watchlists | Detalle con eventos enriquecidos |
|---|---|
| ![Listado](./docs/screenshots/01-listado-watchlists.png) | ![Detalle](./docs/screenshots/02-detalle-eventos.png) |

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
| `GeminiProvider` | `AI_PROVIDER=gemini` con `GEMINI_API_KEY` | Llama a `gemini-flash-latest` con structured output |
| `MockProvider` | `AI_PROVIDER=mock` (default en tests/dev) | Clasificador determinista por palabras clave (`ransomware → CRITICAL`, `phishing → HIGH`, …) |

Agregar OpenAI/Anthropic/Azure es **un archivo nuevo** que implemente la interfaz + un `case` en el factory. Detalles en [`docs/ADR-002-ai-adapter.md`](./docs/ADR-002-ai-adapter.md).

### Schemas compartidos

`packages/shared` contiene los schemas Zod (`WatchlistSchema`, `EventSchema`, `AiEnrichmentSchema`, …) que **ambos** lados consumen. Es la única forma en que tipos cruzan la frontera front ↔ back; nunca se exportan tipos de Prisma al frontend.

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
| Frontend | **Next.js 15** App Router · Server Actions · Tailwind CSS |
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

### 1. Crear una watchlist

Abre http://localhost:3000. Verás un formulario con dos campos:

- **Nombre**: identificador legible (ej. `Marca ACME`).
- **Términos**: lista separada por comas (ej. `acme.com, acme-corp, ransomware-acme`).

Al enviar, una Server Action de Next.js llama al backend y crea la watchlist en Postgres. La página se revalida automáticamente y la verás listada.

### 2. Ver el detalle

Haz clic en una watchlist. La página de detalle muestra:
- Sus términos.
- Los últimos 50 eventos asociados, con su severidad coloreada (`LOW` gris, `MED` amarillo, `HIGH` naranja, `CRITICAL` rojo).
- Para cada evento: el resumen del LLM, la acción sugerida, el proveedor (`gemini` / `mock`) y la latencia.

### 3. Simular un evento

Botón **"Simular evento"** en la página de detalle. El backend genera un payload sintético, lo manda a la IA y persiste el resultado. Si el evento contiene la palabra `ransomware` o `phishing`, el `MockProvider` lo clasificará como `CRITICAL` o `HIGH` respectivamente — útil para demos sin Gemini.

### 4. Ver métricas

```bash
curl http://localhost:3001/metrics
```

Busca estos contadores:
- `http_requests_total{status="2xx"}` — tráfico exitoso
- `ai_calls_total{provider="gemini",outcome="success"}` — llamadas reales a IA
- `ai_cache_hits_total` — eventos servidos desde caché
- `ai_call_duration_seconds_bucket` — histograma de latencia

### 5. Cambiar de proveedor en caliente

Edita `apps/api/.env`:
```env
AI_PROVIDER=mock     # o gemini
```
Reinicia el api (`tsx watch` se recargará solo si cambias código, pero las env vars requieren reinicio del proceso).

### 6. Trazar una request de punta a punta

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
| `GEMINI_MODEL` | – | Por defecto `gemini-flash-latest` |
| `AI_CACHE_TTL_SECONDS` | – | Por defecto `600` |
| `CORS_ORIGINS` | – | Lista separada por comas |
| `LOG_LEVEL` | – | `fatal` / `error` / `warn` / `info` / `debug` / `trace` |
| `API_BASE_URL` | ✅ (web) | URL server-side que el frontend usa para llamar al api |

---

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/watchlists` | Crear `{ name, terms[] }` |
| `GET` | `/api/watchlists` | Listar todas |
| `GET` | `/api/watchlists/:id` | Detalle + últimos 50 eventos |
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
