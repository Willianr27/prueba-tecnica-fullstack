import type { Prisma } from '@prisma/client';
import { getCache } from '../../core/cache.js';
import { NotFoundError } from '../../core/errors.js';
import { prisma } from '../../core/prisma.js';
import { buildAiService } from '../ai/ai.service.js';
import { generateEvent } from './events.simulator.js';

export const eventsService = {
  async simulateForWatchlist(watchlistId: string) {
    const watchlist = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!watchlist) throw NotFoundError('Watchlist');

    const payload = generateEvent(watchlist.terms);

    const aiService = buildAiService(getCache());
    const enrichment = await aiService.enrichEvent({
      watchlistName: watchlist.name,
      terms: watchlist.terms,
      rawPayload: payload as unknown as Record<string, unknown>,
    });

    return prisma.event.create({
      data: {
        watchlistId,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
        summary: enrichment.summary,
        severity: enrichment.severity,
        suggestedAction: enrichment.suggestedAction,
        aiProvider: enrichment.provider,
        aiLatencyMs: Math.round(enrichment.latencyMs),
      },
    });
  },

  async listForWatchlist(watchlistId: string, limit = 100) {
    return prisma.event.findMany({
      where: { watchlistId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
