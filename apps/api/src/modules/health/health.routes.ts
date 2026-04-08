import type { FastifyInstance } from 'fastify';
import { getCache } from '../../core/cache.js';
import { prisma } from '../../core/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    const [dbOk, cacheOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      getCache().ping(),
    ]);

    const status = dbOk && cacheOk ? 'ok' : 'degraded';
    const code = dbOk && cacheOk ? 200 : 503;
    return reply.status(code).send({
      status,
      checks: { database: dbOk, cache: cacheOk },
      uptimeSeconds: Math.round(process.uptime()),
    });
  });
}
