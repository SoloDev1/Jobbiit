/**
 * OpporHub OS — Core Redis Cache Adapter
 * Manages caching for AI responses, opportunity matches, and presigned URLs.
 */

import { logger } from '../telemetry/logger.service';

export class RedisCacheService {
  private inMemoryCache: Map<string, { value: string; expiresAt: number }> = new Map();

  /**
   * Sets a key with TTL in seconds.
   */
  public async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.inMemoryCache.set(key, { value: serialized, expiresAt });
    logger.info({ key, ttlSeconds }, '[Cache] Key set in cache');
  }

  /**
   * Gets a value by key. Returns null if expired or missing.
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const cached = this.inMemoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(cached.value) as T;
    } catch {
      return cached.value as unknown as T;
    }
  }

  /**
   * Invalidates a cache key.
   */
  public async del(key: string): Promise<void> {
    this.inMemoryCache.delete(key);
  }
}

export const CacheEngine = new RedisCacheService();
