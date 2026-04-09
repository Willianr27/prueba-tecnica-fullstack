import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateWatchlistSchema } from '@signal-watcher/shared';
import { watchlistsService } from './watchlists.service.js';
import { eventsService } from '../events/events.service.js';
import { loadConfig } from '../../core/config.js';

const IdParamSchema = z.object({ id: z.string().min(1) });

export async function watchlistsRoutes(app: FastifyInstance) {
  app.post('/api/watchlists', async (req, reply) => {
    const input = CreateWatchlistSchema.parse(req.body);
    const created = await watchlistsService.create(input);
    req.log.info({ watchlistId: created.id }, 'watchlist created');
    return reply.status(201).send(created);
  });

  app.get('/api/watchlists', async () => {
    return watchlistsService.list();
  });

  app.get('/api/stats', async () => {
    const stats = await watchlistsService.stats();
    const cfg = loadConfig();
    return { ...stats, aiProvider: cfg.AI_PROVIDER };
  });

  app.get('/api/watchlists/:id', async (req) => {
    const { id } = IdParamSchema.parse(req.params);
    return watchlistsService.getById(id);
  });

  app.delete('/api/watchlists/:id', async (req, reply) => {
    const { id } = IdParamSchema.parse(req.params);
    await watchlistsService.delete(id);
    return reply.status(204).send();
  });

  app.post('/api/watchlists/:id/events/simulate', async (req, reply) => {
    const { id } = IdParamSchema.parse(req.params);
    const event = await eventsService.simulateForWatchlist(id);
    req.log.info(
      { watchlistId: id, eventId: event.id, severity: event.severity },
      'event simulated and enriched',
    );
    return reply.status(201).send(event);
  });
}
