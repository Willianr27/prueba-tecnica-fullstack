# ADR-001 — Technology stack

## Status
Accepted.

## Context
We need to build a small full-stack product that demonstrates architecture, observability, and AI integration in a few hours, while being production-shaped (validation, logs, metrics, deploy).

## Decision

| Concern | Choice | Rationale |
|---|---|---|
| HTTP framework | **Fastify** | Faster than Express, first-class JSON Schema/Zod validation, Pino built in (structured logs without extra wiring), tiny plugin API. |
| Language | TypeScript end-to-end | Type-safety across the API, frontend and shared schemas reduces integration bugs and makes the AI contract explicit. |
| ORM | **Prisma** | Type-safe, declarative migrations, ergonomic for a short project. The PDF explicitly recommends it. |
| DB | **PostgreSQL** | Standard, supports `String[]` columns natively, Railway/Render offer managed instances. |
| Cache | **Redis** with in-memory fallback | Required for the AI cache. The fallback keeps local dev / tests trivial. |
| Validation | **Zod** | Single source of truth for schemas shared backend ↔ frontend through `packages/shared`. |
| Frontend | **Next.js 15 App Router + Server Actions** | Avoids duplicating an HTTP client layer in the browser, keeps secrets server-side, supports SSR by default. |
| Styling | **Tailwind CSS** | Fastest path to a coherent UI without dragging in a full component library. |
| Tests | **Vitest** | Native TS, fast, the same runner can be used in both apps. |
| Monorepo | **pnpm workspaces** | Lightweight, no Turbo/Nx overhead for a project this size. Lets the API and the web app share Zod schemas via `@signal-watcher/shared`. |
| CI | **GitHub Actions** | Free, integrates Postgres/Redis as services for integration tests. |

## Alternatives considered
- **Express**: more mainstream but lacks built-in validation/logging; ends up being more wiring than Fastify.
- **NestJS**: too much ceremony for a 4–8h test.
- **Drizzle**: lighter than Prisma but the team is more familiar with Prisma's migration workflow.
- **tRPC**: tight coupling between front and back, but plain REST is more honest about the deployment shape (separate Vercel + container backend).

## Consequences
- The frontend cannot call the API directly from the browser using shared Prisma types — only the Zod types from `@signal-watcher/shared` cross the boundary, which is the right separation.
- Pino's pretty transport is dev-only; in production logs are JSON for ingestion by any aggregator.
