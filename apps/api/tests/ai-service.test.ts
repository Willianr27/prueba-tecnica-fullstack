import { describe, expect, it, vi } from 'vitest';
import type { Cache } from '../src/core/cache.js';
import { AiService } from '../src/modules/ai/ai.service.js';
import type { AIProvider } from '../src/modules/ai/provider.interface.js';

function makeMemoryCache(): Cache {
  const store = new Map<string, string>();
  return {
    async get(k) {
      return store.get(k) ?? null;
    },
    async set(k, v) {
      store.set(k, v);
    },
    async ping() {
      return true;
    },
    async close() {
      store.clear();
    },
  };
}

function makeProvider(): AIProvider & { calls: number } {
  return {
    name: 'fake',
    calls: 0,
    async enrichEvent() {
      this.calls += 1;
      return {
        summary: 'test summary',
        severity: 'MED' as const,
        suggestedAction: 'investigate',
      };
    },
  };
}

describe('AiService', () => {
  it('caches results so a second identical call does not invoke the provider', async () => {
    const provider = makeProvider();
    const service = new AiService(provider, makeMemoryCache(), 60);

    const input = {
      watchlistName: 'Acme',
      terms: ['acme'],
      rawPayload: { type: 'social_chatter', x: 1 },
    };

    const first = await service.enrichEvent(input);
    const second = await service.enrichEvent(input);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(provider.calls).toBe(1);
    expect(second.summary).toBe('test summary');
  });

  it('falls back gracefully when the provider keeps failing', async () => {
    const provider: AIProvider = {
      name: 'broken',
      enrichEvent: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const service = new AiService(provider, makeMemoryCache(), 60);

    const result = await service.enrichEvent({
      watchlistName: 'Acme',
      terms: ['acme'],
      rawPayload: { type: 'whatever' },
    });

    expect(result.severity).toBe('LOW');
    expect(result.provider).toBe('broken-fallback');
    expect(provider.enrichEvent).toHaveBeenCalledTimes(2); // 1 + 1 retry
  });
});
