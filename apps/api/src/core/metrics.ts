import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const aiCallsTotal = new Counter({
  name: 'ai_calls_total',
  help: 'AI provider calls',
  labelNames: ['provider', 'outcome'] as const,
  registers: [registry],
});

export const aiCallDurationSeconds = new Histogram({
  name: 'ai_call_duration_seconds',
  help: 'AI provider call duration in seconds',
  labelNames: ['provider'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15],
  registers: [registry],
});

export const aiCacheHitsTotal = new Counter({
  name: 'ai_cache_hits_total',
  help: 'Number of AI enrichment cache hits',
  registers: [registry],
});
