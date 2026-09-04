import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ workers
  connectTimeout: 5000,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.warn({ attempt: times, delay }, '[Redis] Reconnecting to Redis...');
    return delay;
  },
  tls: env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
});

redisConnection.on('error', (err) => {
  logger.error({ err }, '[Redis] Connection error encountered');
});

redisConnection.on('connect', () => {
  logger.info('[Redis] Connected successfully');
});

