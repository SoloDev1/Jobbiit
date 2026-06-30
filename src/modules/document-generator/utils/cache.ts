import { createHash } from 'crypto';
import { redisConnection } from '../../../config/redis';
import { logger } from '../../../config/logger';

/**
 * Generates a SHA-256 hash of the input object to use in cache keys.
 */
export function hashData(data: any): string {
  const serialized = JSON.stringify(data);
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Checks Redis for cached AI response.
 * Cache key: ai:prompt:${type}:${hash}
 */
export async function getCachedAIResponse(type: string, data: any): Promise<string | null> {
  const hash = hashData(data);
  const key = `ai:prompt:${type}:${hash}`;
  try {
    const cached = await redisConnection.get(key);
    if (cached) {
      logger.info({ key }, 'Redis Cache hit for AI prompt');
      return cached;
    }
  } catch (error) {
    logger.error({ error, key }, 'Failed to read AI prompt cache from Redis');
  }
  return null;
}

/**
 * Saves AI response to Redis with a 6-hour TTL (21600 seconds).
 */
export async function setCachedAIResponse(type: string, data: any, response: string): Promise<void> {
  const hash = hashData(data);
  const key = `ai:prompt:${type}:${hash}`;
  try {
    await redisConnection.set(key, response, 'EX', 21600);
    logger.info({ key }, 'Cached AI prompt in Redis');
  } catch (error) {
    logger.error({ error, key }, 'Failed to write AI prompt cache to Redis');
  }
}

/**
 * Checks Redis for cached generated document URLs.
 * Cache key: doc:${userId}:${type}:${hash}
 */
export async function getCachedDocUrls(
  userId: string,
  type: string,
  data: any
): Promise<{ pdfUrl?: string; docxUrl?: string; r2PdfKey?: string; r2DocxKey?: string } | null> {
  const hash = hashData(data);
  const key = `doc:${userId}:${type}:${hash}`;
  try {
    const cached = await redisConnection.get(key);
    if (cached) {
      logger.info({ key }, 'Redis Cache hit for generated document URLs');
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.error({ error, key }, 'Failed to read document URL cache from Redis');
  }
  return null;
}

/**
 * Saves generated document URLs to Redis with a 24-hour TTL (86400 seconds).
 */
export async function setCachedDocUrls(
  userId: string,
  type: string,
  data: any,
  value: { pdfUrl?: string; docxUrl?: string; r2PdfKey?: string; r2DocxKey?: string }
): Promise<void> {
  const hash = hashData(data);
  const key = `doc:${userId}:${type}:${hash}`;
  try {
    await redisConnection.set(key, JSON.stringify(value), 'EX', 86400);
    logger.info({ key }, 'Cached generated document URLs in Redis');
  } catch (error) {
    logger.error({ error, key }, 'Failed to write document URL cache to Redis');
  }
}
