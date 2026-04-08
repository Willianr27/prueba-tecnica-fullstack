import { Redis } from 'ioredis';
import { loadConfig } from './config.js';
import { logger } from './logger.js';

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

class RedisCache implements Cache {
  constructor(private readonly client: Redis) {}
  async get(key: string) {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }
  async ping() {
    try {
      const r = await this.client.ping();
      return r === 'PONG';
    } catch {
      return false;
    }
  }
  async close() {
    await this.client.quit();
  }
}

class MemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number }>();
  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
  async ping() {
    return true;
  }
  async close() {
    this.store.clear();
  }
}

let instance: Cache | null = null;

export function getCache(): Cache {
  if (instance) return instance;
  const config = loadConfig();
  if (!config.REDIS_URL) {
    logger.warn('REDIS_URL not set — falling back to in-memory cache');
    instance = new MemoryCache();
    return instance;
  }
  const client = new Redis(config.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  client.on('error', (err) => logger.error({ err }, 'redis error'));
  instance = new RedisCache(client);
  return instance;
}
