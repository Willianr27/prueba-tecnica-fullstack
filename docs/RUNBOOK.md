# Runbook — Signal Watcher

Procedimientos operacionales para correr, depurar y mantener Signal Watcher.

## Servicios

| Servicio | Puerto | Notas |
|---|---|---|
| `apps/web` (Next.js) | 3000 | Habla con el API del lado servidor vía `API_BASE_URL` |
| `apps/api` (Fastify) | 3001 | Expone `/health`, `/metrics`, `/api/*` |
| Postgres | 5433 (host) → 5432 (contenedor) | Gestionado por `docker-compose.yml` localmente |
| Redis | 6380 (host) → 6379 (contenedor) | Gestionado por `docker-compose.yml` localmente |

> Los puertos del host están remapeados (5433/6380) para evitar conflictos con instancias locales o relays de WSL en los puertos estándar.

## Tareas comunes

### Levantar todo localmente
```bash
docker compose up -d
pnpm install
pnpm run build:shared
pnpm --filter @signal-watcher/api run prisma:deploy
pnpm dev
```

### Resetear la base de datos
```bash
pnpm --filter @signal-watcher/api run prisma:reset
```
Esto borra los datos y vuelve a aplicar migraciones + seed.

### Rotar la API key de Gemini
1. Revoca la clave vieja en https://aistudio.google.com/apikey.
2. Genera una clave nueva.
3. Actualiza `GEMINI_API_KEY` en el entorno del despliegue (dashboard de Railway/Render).
4. Reinicia el servicio del API. Verifica con `curl https://<api-host>/health` y un evento simulado.
5. **Nunca** commitees la clave, la pegues en chats, ni la printees en logs. Pino está configurado para redactar `*.GEMINI_API_KEY`, pero trata cualquier clave filtrada como comprometida y rótala inmediatamente.

### Limpiar la caché de IA
La caché vive en Redis bajo claves `ai:enrich:*`.
```bash
docker exec signal-watcher-redis redis-cli --scan --pattern 'ai:enrich:*' | xargs docker exec -i signal-watcher-redis redis-cli del
```
O setea `AI_CACHE_TTL_SECONDS=1` y deja que expiren naturalmente.

### Cambiar el proveedor de IA
- `AI_PROVIDER=mock` (sin clave) para deshabilitar llamadas reales — útil en incidentes o cuando se acaba la cuota.
- `AI_PROVIDER=gemini` y asegurate de que `GEMINI_API_KEY` esté presente.

Reinicia el API para aplicar.

## Observabilidad

### Leer métricas
```bash
curl http://localhost:3001/metrics
```
Contadores importantes:
- `http_requests_total{status="5xx"}` — errores del servidor
- `ai_calls_total{outcome="failure"}` — fallos del LLM
- `ai_cache_hits_total` — efectividad de la caché

### Trazar una request end-to-end
Cada respuesta incluye un header `x-correlation-id`. Encuéntralo en el panel de red del frontend y greppealo en los logs del API:
```bash
docker logs signal-watcher-api 2>&1 | grep '<correlation-id>'
```
También podés forzar el tuyo:
```bash
curl -H 'x-correlation-id: debug-123' http://localhost:3001/api/watchlists
```

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| El API muere al arranque con "Invalid environment configuration" | Variable faltante o mal escrita | Compará `.env` contra `.env.example` |
| `/health` devuelve `degraded` con `database:false` | Postgres inalcanzable | `docker compose ps`, verificá `DATABASE_URL` y el puerto 5433 |
| `/health` devuelve `degraded` con `cache:false` | Redis inalcanzable | `docker exec signal-watcher-redis redis-cli ping`, verificá `REDIS_URL` y el puerto 6380 |
| Todos los eventos vuelven con severidad `LOW` y "Enriquecimiento de IA no disponible" | Gemini fallando tras reintentos | Mirá `ai_calls_total{outcome="failure"}`, verificá API key y cuota |
| El frontend muestra "Failed to fetch" | `API_BASE_URL` mal o CORS mal configurado | Actualizá las env vars, asegurate de que `CORS_ORIGINS` incluya el host del frontend |
| Rate limited (429) | Más de 100 req/min desde una IP | Ajustá la configuración de `@fastify/rate-limit` en `apps/api/src/app.ts` |
| `prisma migrate` falla con "P1001 can't reach database" | Postgres no levantado o conflicto de puerto | `docker compose up -d`, comprobá que `DATABASE_URL` use puerto 5433 |

## Escalamiento on-call
Esto es un proyecto take-home — no hay on-call. En un despliegue real:
1. Paginar al owner del API ante cualquier tasa sostenida de `5xx` por encima del 1%.
2. Paginar al owner de datos si la tasa de hits de caché cae a ~0% (probable caída de Redis).
