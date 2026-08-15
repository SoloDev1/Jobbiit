// middleware/rateLimiter.ts
import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redisConnection } from '../config/redis'
import { env } from '../config/env'

const createRedisStore = (prefix: string) => new RedisStore({
  sendCommand: (...args: string[]) => redisConnection.call(args[0], ...args.slice(1)) as Promise<any>,
  prefix: `rl:${prefix}:`,
})

const rateLimitResponse = (message: string) => ({
  success: false,
  message,
})

// 🌍 1. GLOBAL: General browsing (Feed, Profile viewing, Opportunities)
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW || 15 * 60 * 1000,
  limit: env.RATE_LIMIT_MAX || 10000, 
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('global'),
  message: rateLimitResponse('Too many requests, please try again later.'),
})

// 🛡️ 2. AUTH: Signup/Login/Password (High Security & High Scalability)
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000, // 2000 attempts per 15 mins to support large bursts on shared Wi-Fi/NAT
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: rateLimitResponse('Too many attempts. Please try again in 15 minutes.'),
})

/** OTP forgot-password: max 3 requests per 15 minutes per IP + email. */
export const forgotPasswordOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('forgot-password'),
  keyGenerator: (req: Request) => {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'unknown'
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`
  },
  message: rateLimitResponse(
    'Too many reset requests. Please try again in 15 minutes.',
  ),
})


export const socialActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // Max 100 actions per minute
  store: createRedisStore('social'),
  message: rateLimitResponse('You are interacting too fast!'),
})


// 🔄 3. SESSION: Token Refreshing (Background Activity)
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000, // High limit for background sync/refresh across large user bases
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('session'),
  message: rateLimitResponse('Session busy. Please wait.'),
})

export const likeActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60, // ~1/sec, normal scroll behavior
  store: createRedisStore('like'),
  message: rateLimitResponse('Slow down on the likes!'),
})

export const postCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  store: createRedisStore('post-creation'),
  message: rateLimitResponse('Post limit reached. Try again in an hour.'),
})



