# ADR-002 — Adaptador de proveedor IA, modo mock y caché

## Estado
Aceptado.

## Contexto
El producto enriquece cada evento simulado con una llamada a un LLM (resumen, clasificación de severidad, acción sugerida). Necesitamos que esto sea:
1. Testeable sin API key.
2. Barato y rápido en eventos repetidos.
3. Resiliente — un LLM intermitente no debe romper el producto.
4. Fácil de cambiar de proveedor en el futuro (Gemini → OpenAI/Anthropic/Azure).

## Decisión

### Patrón adapter
Una sola interfaz vive en `apps/api/src/modules/ai/provider.interface.ts`:

```ts
interface AIProvider {
  readonly name: string;
  enrichEvent(input: EnrichInput): Promise<AiEnrichment>;
}
```

Dos implementaciones:
- **`GeminiProvider`** — usa `@google/genai` con `responseMimeType: "application/json"` y un `responseSchema`, así Gemini está obligado a devolver un objeto estructurado que matchea nuestro `AiEnrichmentSchema` de Zod. La salida se **revalida con Zod** después de parsear — nunca confiamos en que el LLM venga bien formado.
- **`MockProvider`** — clasificador determinista por palabras clave (`ransomware → CRITICAL`, `phishing → HIGH`, …). Se usa por defecto en tests y cuando no hay API key disponible.

Un factory en `ai.service.ts` elige la implementación según `AI_PROVIDER` (`gemini` | `mock`).

### Caché
El `AiService` envuelve al provider con una caché Redis:
- Cache key = `sha256` de `{ nombre de la watchlist, términos ordenados, raw payload, nombre del provider }`.
- TTL configurable vía `AI_CACHE_TTL_SECONDS` (default 600s).
- Los hits incrementan `ai_cache_hits_total` y cortocircuitan la llamada al provider entera.
- Las escrituras a la caché son fire-and-forget — un hipo de Redis nunca bloquea una request.

### Resiliencia
- 1 reintento con backoff lineal en errores del provider.
- Timeout por llamada de 15 segundos vía `Promise.race`.
- **Degradación elegante**: si el provider falla tras los reintentos, el servicio aún devuelve un resultado — `severity: 'LOW'`, un summary stub y una sugerencia de "reintentar manualmente" — para que el evento se persista y la UI siga funcionando. Esto se loguea a nivel `error` y se cuenta en `ai_calls_total{outcome="failure"}`.

## Consecuencias
- Agregar un proveedor nuevo = un archivo que implemente la interfaz + un `case` en el factory.
- El `MockProvider` hace doble función como fixture determinista para tests, eliminando la necesidad de mockear `fetch`.
- Las clasificaciones de severidad pueden derivar si Gemini cambia su comportamiento, pero el schema Zod garantiza que la forma siga siendo válida.
- La cache key incluye el nombre del provider, así que cambiar de proveedor invalida naturalmente las entradas viejas.
