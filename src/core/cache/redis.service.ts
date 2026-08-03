/**
 * OpporHub OS — Core Redis Cache Adapter
 * Manages caching for AI responses, opportunity matches, and presigned URLs.
 */

import { logger } from '../telemetry/logger.service';
import { redisConnection } from '../../config/redis';

export class RedisCacheService {
  /**
   * Sets a key with TTL in seconds.
   */
  public async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redisConnection.set(key, serialized, 'EX', ttlSeconds);
      logger.info({ key, ttlSeconds }, '[Cache] Key set in Redis cache');
    } catch (error) {
      logger.error({ error, key }, '[Cache] Failed to set key in Redis');
    }
  }

  /**
   * Gets a value by key. Returns null if expired or missing.
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await redisConnection.get(key);
      if (!cached) return null;

      try {
        return JSON.parse(cached) as T;
      } catch {
        return cached as unknown as T;
      }
    } catch (error) {
      logger.error({ error, key }, '[Cache] Failed to get key from Redis');
      return null;
    }
  }

  /**
   * Invalidates a cache key.
   */
  public async del(key: string): Promise<void> {
    try {
      await redisConnection.del(key);
      logger.info({ key }, '[Cache] Key invalidated in Redis cache');
    } catch (error) {
      logger.error({ error, key }, '[Cache] Failed to delete key from Redis');
    }
  }
}

export const CacheEngine = new RedisCacheService();

