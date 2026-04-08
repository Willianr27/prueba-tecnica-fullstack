import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { loadConfig } from './core/config.js';
import { logger } from './core/logger.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';
import { watchlistsRoutes } from './modules/watchlists/watchlists.routes.js';
import { correlationIdPlugin } from './plugins/correlation-id.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { metricsPlugin } from './plugins/metrics.js';

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = Fastify({
    loggerInstance: logger as unknown as FastifyBaseLogger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    exposedHeaders: ['x-correlation-id'],
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(correlationIdPlugin);
  await app.register(metricsPlugin);
  await app.register(errorHandlerPlugin);

  await app.register(healthRoutes);
  await app.register(watchlistsRoutes);
  await app.register(eventsRoutes);

  return app;
}
