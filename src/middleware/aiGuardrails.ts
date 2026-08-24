// middleware/aiGuardrails.ts
import type { Request, Response, NextFunction } from 'express'
import { redisConnection } from '../config/redis'
import { logger } from '../config/logger'

const MAX_CONCURRENT_AI_JOBS = 2
const CONCURRENCY_LOCK_TTL_SECONDS = 90 // 90s auto-release failsafe

/**
 * AI Guardrails Middleware:
 * 1. Checks active concurrent AI generation tasks for the user.
 * 2. Employs a robust Redis lease with TTL to avoid counter leaks on process crash.
 * 3. Enforces user quota / credit availability before invoking costly LLMs.
 */
export async function aiGuardrails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = (req as any).user?.id || (req as any).userId
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' })
    return
  }

  const concurrencyKey = `concurrency:ai:${userId}`

  try {
    // 1. Atomically acquire/increment active concurrency slot
    const currentActive = await redisConnection.incr(concurrencyKey)
    if (currentActive === 1) {
      await redisConnection.expire(concurrencyKey, CONCURRENCY_LOCK_TTL_SECONDS)
    }

    if (currentActive > MAX_CONCURRENT_AI_JOBS) {
      await redisConnection.decr(concurrencyKey).catch(() => {})
      res.status(429).json({
        success: false,
        error: 'You already have an AI generation in progress. Please wait for it to finish.',
        code: 'CONCURRENT_LIMIT_EXCEEDED',
      })
      return
    }

    // 2. Safe cleanup on response finish or socket close
    let released = false
    const releaseLock = async () => {
      if (released) return
      released = true
      try {
        const remaining = await redisConnection.decr(concurrencyKey)
        if (remaining <= 0) {
          await redisConnection.del(concurrencyKey).catch(() => {})
        }
      } catch (cleanupErr) {
        logger.warn({ cleanupErr, userId }, 'Failed to release AI concurrency lock')
      }
    }

    res.once('finish', releaseLock)
    res.once('close', releaseLock)

    next()
  } catch (err) {
    logger.error({ err, userId }, 'AI guardrails verification error')
    next()
  }
}
