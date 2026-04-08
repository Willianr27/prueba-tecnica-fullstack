import { buildApp } from './app.js';
import { getCache } from './core/cache.js';
import { loadConfig } from './core/config.js';
import { logger } from './core/logger.js';
import { prisma } from './core/prisma.js';

async function main() {
  const config = loadConfig();
  const app = await buildApp();

  const close = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
      await getCache().close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'shutdown error');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void close('SIGINT'));
  process.on('SIGTERM', () => void close('SIGTERM'));

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(
      { port: config.PORT, aiProvider: config.AI_PROVIDER },
      'signal-watcher api listening',
    );
  } catch (err) {
    logger.error({ err }, 'failed to start server');
    process.exit(1);
  }
}

void main();
