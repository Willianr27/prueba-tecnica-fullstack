// Set required env vars BEFORE any module is imported, so that
// loadConfig() in core/config.ts validates successfully when test
// files transitively import logger / services.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.AI_PROVIDER = process.env.AI_PROVIDER ?? 'mock';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'fatal';
