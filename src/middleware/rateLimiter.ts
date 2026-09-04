// middleware/rateLimiter.ts
import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import crypto from 'node:crypto'
import { redisConnection } from '../config/redis'
import { env } from '../config/env'

const createRedisStore = (prefix: string) =>
  new RedisStore({
    sendCommand: (...args: string[]) =>
      redisConnection.call(args[0], ...args.slice(1)) as Promise<any>,
    prefix: `rl:${prefix}:`,
  })

const rateLimitResponse = (message: string, code = 'RATE_LIMIT_EXCEEDED') => ({
  success: false,
  error: message,
  code,
})

// Helper to extract a normalized hash of email/target identifier
const hashTargetIdentifier = (req: Request): string => {
  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : typeof req.query?.email === 'string'
        ? (req.query.email as string).trim().toLowerCase()
        : 'anonymous'
  return crypto.createHash('sha256').update(email).digest('hex')
}

// User-ID key generator with IP fallback for authenticated routes
export const userKeyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id || (req as any).userId
  return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip ?? '')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 🌐 LAYER 1: Global Infrastructure Safety Net (Protects DB Connection Pool)
// ─────────────────────────────────────────────────────────────────────────────
export const globalInfrastructureLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW || 15 * 60 * 1000,
  limit: env.RATE_LIMIT_MAX || 10000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('global'),
  message: rateLimitResponse('Too many requests, please try again later.', 'GLOBAL_RATE_LIMIT'),
})
export const globalLimiter = globalInfrastructureLimiter

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ LAYER 2: Dual-Bucket Authentication Limiters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Account Bucket (Failed Login Attempts):
 * Limits repeated authentication failures against a target account to prevent brute force / credential stuffing.
 * skipSuccessfulRequests: true ensures legitimate users are NEVER locked out by successful logins.
 */
export const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 failed attempts per target account
  skipSuccessfulRequests: true, // Only count 4xx / failed credentials
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('auth:acc-login'),
  keyGenerator: (req: Request) => `acc:${hashTargetIdentifier(req)}`,
  message: rateLimitResponse(
    'Too many failed login attempts on this account. Please try again in 15 minutes.',
    'ACCOUNT_LOGIN_LOCKED',
  ),
})

/**
 * IP Bucket (Auth Origin Limit):
 * Broad per-IP ceiling on sensitive auth endpoints to block single-source credential stuffing and spraying tools.
 */
export const ipAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100, // 100 attempts per IP per 15 min
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('auth:ip-origin'),
  keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
  message: rateLimitResponse(
    'Too many requests from this network. Please try again later.',
    'IP_AUTH_LIMIT',
  ),
})
export const strictAuthLimiter = ipAuthLimiter

/**
 * OTP / Password Reset Target Limiter:
 * Very strict limit per target email/phone to prevent SMS/email bombing and financial drain.
 */
export const otpTargetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // 5 OTP triggers per 15 minutes per target email + IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('otp:target'),
  keyGenerator: (req: Request) =>
    `otp:${ipKeyGenerator(req.ip ?? '')}:${hashTargetIdentifier(req)}`,
  message: rateLimitResponse(
    'Too many verification requests. Please wait 15 minutes before requesting again.',
    'OTP_RATE_LIMIT',
  ),
})
export const forgotPasswordOtpLimiter = otpTargetLimiter

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 LAYER 3: Identity-Bound Authenticated Tiers (Keyed by req.user.id)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tier 1: Read-Heavy Browsing (Feed, Opportunities, Jobs, Profile view)
 * 100 requests per 1 minute per authenticated user (independent of shared Wi-Fi / NAT IP).
 */
export const readTierLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('tier:read'),
  keyGenerator: userKeyGenerator,
  message: rateLimitResponse('You are browsing too quickly. Slow down.', 'READ_LIMIT_EXCEEDED'),
})

/**
 * Tier 2: Light Writes & Social Mutations (Likes, Comments, Saves)
 * 25 requests per 1 minute per authenticated user.
 */
export const writeTierLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('tier:write'),
  keyGenerator: userKeyGenerator,
  message: rateLimitResponse('You are interacting too fast. Please slow down.', 'WRITE_LIMIT_EXCEEDED'),
})
export const socialActionLimiter = writeTierLimiter
export const likeActionLimiter = writeTierLimiter

/**
 * Tier 3: Critical Mutations (Applications, Profile Updates, Deletions, Post Creation)
 * 10 requests per 5 minutes per authenticated user.
 */
export const criticalMutationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('tier:critical'),
  keyGenerator: userKeyGenerator,
  message: rateLimitResponse(
    'Action limit reached. Please wait a few minutes before submitting again.',
    'CRITICAL_ACTION_LIMIT',
  ),
})
export const postCreationLimiter = criticalMutationLimiter

/**
 * Tier 4: AI Endpoints Rate Limiter (Chat, Refine, Tailor, Studio Generate)
 * 10 requests per 1 minute per authenticated user (accompanied by concurrency & quota guards).
 */
export const aiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('tier:ai'),
  keyGenerator: userKeyGenerator,
  message: rateLimitResponse(
    'AI generation limit reached. Please wait a moment.',
    'AI_RATE_LIMIT_EXCEEDED',
  ),
})

/**
 * Session Token Refresh Limiter (Background Mobile Sync)
 */
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore('session'),
  keyGenerator: userKeyGenerator,
  message: rateLimitResponse('Session sync busy. Please wait.', 'SESSION_SYNC_BUSY'),
})
