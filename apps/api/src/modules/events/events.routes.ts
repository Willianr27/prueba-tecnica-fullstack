import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eventsService } from './events.service.js';

const QuerySchema = z.object({
  watchlistId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/api/events', async (req) => {
    const { watchlistId, limit } = QuerySchema.parse(req.query);
    return eventsService.listForWatchlist(watchlistId, limit);
  });
}
