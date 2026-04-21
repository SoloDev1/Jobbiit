import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

const rateLimitResponse = (message: string) => ({
  success: false,
  message,
})

/**
 * Broad limiter applied to every route.
 * Configured via RATE_LIMIT_WINDOW and RATE_LIMIT_MAX env vars.
 */
export const globalLimiter = rateLimit({
  windowMs:        env.RATE_LIMIT_WINDOW,
  limit:           env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         rateLimitResponse('Too many requests, please try again later.'),
})

/**
 * Strict limiter for auth endpoints (signup, login, refresh).
 * 20 requests per 15 minutes per IP — limits credential-stuffing and
 * brute-force token rotation attacks without exposing env vars.
 */
export const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1_000,
  limit:           20,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         rateLimitResponse('Too many requests, please try again later.'),
})
