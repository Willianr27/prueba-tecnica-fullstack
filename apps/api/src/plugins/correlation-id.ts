import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

const HEADER = 'x-correlation-id';

export async function correlationIdPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers[HEADER];
    const id =
      typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();
    request.correlationId = id;
    reply.header(HEADER, id);
    // Replace the request logger with a child that always carries correlationId.
    request.log = request.log.child({ correlationId: id });
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}
