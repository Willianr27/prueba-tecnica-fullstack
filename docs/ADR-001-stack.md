# ADR-001 — Stack tecnológico

## Estado
Aceptado.

## Contexto
Necesitamos construir un producto full-stack pequeño que demuestre arquitectura, observabilidad e integración con IA en pocas horas, manteniendo forma productiva (validación, logs, métricas, despliegue).

## Decisión

| Aspecto | Elección | Justificación |
|---|---|---|
| Framework HTTP | **Fastify** | Más rápido que Express, validación JSON Schema/Zod de primera clase, Pino integrado (logs estructurados sin cableado extra), API de plugins minimalista. |
| Lenguaje | TypeScript end-to-end | Type-safety entre API, frontend y schemas compartidos. Reduce bugs de integración y hace explícito el contrato con la IA. |
| ORM | **Prisma** | Type-safe, migraciones declarativas, ergonómico para un proyecto corto. El PDF lo recomienda explícitamente. |
| Base de datos | **PostgreSQL** | Estándar, soporta `String[]` nativo, Railway/Render ofrecen instancias gestionadas. |
| Caché | **Redis** con fallback en memoria | Requerido para la caché de IA. El fallback hace triviales el dev local y los tests. |
| Validación | **Zod** | Una sola fuente de verdad de los schemas, compartida backend ↔ frontend vía `packages/shared`. |
| Frontend | **Next.js 15 App Router + Server Actions** | Evita duplicar una capa de cliente HTTP en el navegador, mantiene los secretos del lado servidor, soporta SSR por defecto. |
| Estilos | **Tailwind CSS** | Camino más rápido a una UI coherente sin arrastrar una librería de componentes completa. |
| Tests | **Vitest** | TS nativo, rápido, el mismo runner sirve para ambas apps. |
| Monorepo | **pnpm workspaces** | Ligero, sin la sobrecarga de Turbo/Nx para un proyecto de este tamaño. Permite a la API y la web compartir schemas Zod vía `@signal-watcher/shared`. |
| CI | **GitHub Actions** | Gratis, integra Postgres/Redis como servicios para tests de integración. |

## Alternativas consideradas
- **Express**: más mainstream pero sin validación/logging integrados; termina siendo más cableado que Fastify.
- **NestJS**: demasiada ceremonia para una prueba de 4–8h.
- **Drizzle**: más ligero que Prisma, pero el flujo de migraciones de Prisma es más conocido.
- **tRPC**: acopla mucho front y back; REST plano es más honesto sobre la forma del despliegue (Vercel + contenedor backend separados).

## Consecuencias
- El frontend no puede llamar al API directamente desde el navegador con tipos de Prisma — sólo los tipos Zod de `@signal-watcher/shared` cruzan la frontera, lo cual es la separación correcta.
- El transport "pretty" de Pino es sólo para dev; en producción los logs son JSON para que cualquier agregador los ingiera.
