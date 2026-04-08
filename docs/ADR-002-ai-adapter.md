# ADR-002 — AI provider adapter, mock mode and caching

## Status
Accepted.

## Context
The product enriches each simulated event with an LLM call (summary, severity classification, suggested action). We need this to be:
1. Testable without an API key.
2. Cheap and fast on repeated identical events.
3. Resilient — a flaky LLM should not break the product.
4. Easy to swap providers later (Gemini → OpenAI/Anthropic/Azure).

## Decision

### Adapter pattern
A single interface lives in `apps/api/src/modules/ai/provider.interface.ts`:

```ts
interface AIProvider {
  readonly name: string;
  enrichEvent(input: EnrichInput): Promise<AiEnrichment>;
}
```

Two implementations:
- **`GeminiProvider`** — uses `@google/genai` with `responseMimeType: "application/json"` and a `responseSchema` so Gemini is forced to return a structured object that matches our Zod `AiEnrichmentSchema`. Output is re-validated with Zod after parsing — we never trust the LLM to be well-formed.
- **`MockProvider`** — deterministic keyword-based classifier (`ransomware → CRITICAL`, `phishing → HIGH`, …). Used by default in tests and when no API key is available.

A factory in `ai.service.ts` picks the implementation based on `AI_PROVIDER` (`gemini` | `mock`).

### Caching
The `AiService` wraps the provider with a Redis cache:
- Cache key = `sha256` of `{ watchlist name, sorted terms, raw payload, provider name }`.
- TTL configurable via `AI_CACHE_TTL_SECONDS` (default 600s).
- Cache hits increment `ai_cache_hits_total` and short-circuit the provider call entirely.
- Cache writes are fire-and-forget — a Redis hiccup never blocks a request.

### Resilience
- 1 retry with linear backoff on provider errors.
- 15-second per-call timeout via `AbortController`.
- **Graceful degradation**: if the provider fails after retries, the service still returns a result — `severity: 'LOW'`, a stub summary, a "retry manually" suggestion — so the event is persisted and the UI keeps working. This is logged at `error` level and counted in `ai_calls_total{outcome="failure"}`.

## Consequences
- Adding a new provider = one file implementing the interface + a switch case in the factory.
- The Mock provider doubles as a deterministic test fixture, removing any need to mock fetch.
- Severity classifications can drift if Gemini changes behaviour, but the Zod schema guarantees the shape stays valid.
- Cache key includes the provider name so swapping providers naturally invalidates old entries.
