import { createHash } from 'node:crypto';
import type { AiEnrichment } from '@signal-watcher/shared';
import type { Cache } from '../../core/cache.js';
import { loadConfig } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { aiCacheHitsTotal, aiCallDurationSeconds, aiCallsTotal } from '../../core/metrics.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockProvider } from './providers/mock.provider.js';
import type { AIProvider, EnrichInput } from './provider.interface.js';

export interface EnrichResult extends AiEnrichment {
  provider: string;
  latencyMs: number;
  cached: boolean;
}

export class AiService {
  constructor(
    private readonly provider: AIProvider,
    private readonly cache: Cache,
    private readonly cacheTtlSeconds: number,
  ) {}

  private cacheKey(input: EnrichInput): string {
    const normalized = JSON.stringify({
      n: input.watchlistName,
      t: [...input.terms].sort(),
      p: input.rawPayload,
      v: this.provider.name,
    });
    const hash = createHash('sha256').update(normalized).digest('hex');
    return `ai:enrich:${hash}`;
  }

  async enrichEvent(input: EnrichInput): Promise<EnrichResult> {
    const key = this.cacheKey(input);

    // 1) Cache lookup
    try {
      const hit = await this.cache.get(key);
      if (hit) {
        aiCacheHitsTotal.inc();
        const parsed = JSON.parse(hit) as AiEnrichment;
        return { ...parsed, provider: this.provider.name, latencyMs: 0, cached: true };
      }
    } catch (err) {
      logger.warn({ err }, 'cache get failed, continuing without cache');
    }

    // 2) Provider call with retry
    const start = process.hrtime.bigint();
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await this.provider.enrichEvent(input);
        const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;
        aiCallsTotal.inc({ provider: this.provider.name, outcome: 'success' });
        aiCallDurationSeconds.observe({ provider: this.provider.name }, latencyMs / 1000);

        // Fire-and-forget cache write
        this.cache
          .set(key, JSON.stringify(result), this.cacheTtlSeconds)
          .catch((err) => logger.warn({ err }, 'cache set failed'));

        return { ...result, provider: this.provider.name, latencyMs, cached: false };
      } catch (err) {
        lastErr = err;
        logger.warn({ err, attempt }, 'AI provider call failed');
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 250 * attempt));
        }
      }
    }

    aiCallsTotal.inc({ provider: this.provider.name, outcome: 'failure' });
    const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;

    // 3) Graceful degradation: return a low-severity stub instead of throwing
    logger.error({ err: lastErr }, 'AI enrichment failed after retries — using fallback');
    return {
      summary: 'Enriquecimiento de IA no disponible; evento crudo almacenado para análisis posterior.',
      severity: 'LOW',
      suggestedAction: 'Reintentar el enriquecimiento manualmente o revisar el payload crudo.',
      provider: `${this.provider.name}-fallback`,
      latencyMs,
      cached: false,
    };
  }
}

let cached: AiService | null = null;

export function buildAiService(cache: Cache): AiService {
  if (cached) return cached;
  const config = loadConfig();
  const provider: AIProvider =
    config.AI_PROVIDER === 'gemini'
      ? new GeminiProvider(config.GEMINI_API_KEY!, config.GEMINI_MODEL)
      : new MockProvider();
  cached = new AiService(provider, cache, config.AI_CACHE_TTL_SECONDS);
  return cached;
}
