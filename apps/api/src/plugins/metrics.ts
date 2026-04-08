import type { FastifyInstance } from 'fastify';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  registry,
} from '../core/metrics.js';

export async function metricsPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    (request as unknown as { __startHr: bigint }).__startHr = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request, reply) => {
    const start = (request as unknown as { __startHr?: bigint }).__startHr;
    const route = request.routeOptions?.url ?? request.url;
    if (route === '/metrics') return; // don't measure the scrape endpoint itself
    const status = String(reply.statusCode);
    const labels = { method: request.method, route, status };
    httpRequestsTotal.inc(labels);
    if (start) {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      httpRequestDurationSeconds.observe(labels, seconds);
    }
  });

  app.get('/metrics', async (_req, reply) => {
    reply.header('content-type', registry.contentType);
    return registry.metrics();
  });
}
