// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

const rateLimitResponse = (message: string) => ({
  success: false,
  message,
})

// 🌍 1. GLOBAL: General browsing (Feed, Profile viewing)
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW || 15 * 60 * 1000,
  limit: env.RATE_LIMIT_MAX || 100, 
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rateLimitResponse('Too many requests, please try again later.'),
})

// 🛡️ 2. AUTH: Signup/Login/Password (High Security)
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // 10 attempts per 15 mins is safer for brute-force
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rateLimitResponse('Too many attempts. Please try again in 15 minutes.'),
})


export const socialActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 30, // Max 30 likes/posts per minute
  message: rateLimitResponse('You are liking posts too fast!'),
})


// 🔄 3. SESSION: Token Refreshing (Background Activity)
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50, // Higher limit for background sync/refresh
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rateLimitResponse('Session busy. Please wait.'),
})