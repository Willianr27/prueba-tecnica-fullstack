import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../core/errors.js';

export async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((err, request, reply) => {
    const correlationId = request.correlationId;

    if (err instanceof ZodError) {
      request.log.warn({ err: err.issues }, 'validation error');
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          correlationId,
          details: err.issues,
        },
      });
    }

    if (err instanceof AppError) {
      request.log.warn({ code: err.code, details: err.details }, err.message);
      return reply.status(err.statusCode).send({
        error: {
          code: err.code,
          message: err.message,
          correlationId,
          details: err.details,
        },
      });
    }

    // Fastify's built-in validation errors
    const fastifyErr = err as { statusCode?: number; message?: string };
    if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
      request.log.warn({ err }, 'client error');
      return reply.status(fastifyErr.statusCode).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: fastifyErr.message ?? 'Bad request',
          correlationId,
        },
      });
    }

    request.log.error({ err }, 'unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        correlationId,
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        correlationId: request.correlationId,
      },
    });
  });
}
