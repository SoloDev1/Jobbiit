import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().url(),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY:    z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  JWT_ACCESS_SECRET:      z.string().min(32),
  JWT_REFRESH_SECRET:     z.string().min(32),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CORS_ORIGIN:        z.string().default('*'),
  // Comma-separated list of allowed origins used in production CORS config.
  // Must be set in production — an empty value means no origins are whitelisted.
  ALLOWED_ORIGINS:    z.string().default(''),
  RATE_LIMIT_WINDOW:  z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX:     z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .optional(),

  /** Resend API key (`re_...`). If empty, outbound email is skipped (dev-friendly). */
  RESEND_API_KEY: z.string().optional().default(''),
  /**
   * Sender shown to recipients, e.g. `OpporLink <onboarding@resend.dev>` for Resend tests
   * or your verified domain address in production.
   */
  EMAIL_FROM: z.string().min(1).default('OpporLink <onboarding@resend.dev>'),

  /**
   * Web or universal-link base for password reset, without query string.
   * Example: `https://app.opporlink.com/auth/reset-password` — we append `?token=...`.
   * If empty, the reset email includes the raw token for in-app entry (mobile).
   */
  PASSWORD_RESET_URL_BASE: z.string().optional().default(''),


  // ─── OAuth ────────────────────────────────────────────────────────────────
  /**
   * Google OAuth — Web client ID is used by the backend to verify ID tokens.
   * iOS and Android client IDs are accepted as additional valid audiences.
   * All three come from Google Cloud Console → APIs & Services → Credentials.
   */
  GOOGLE_WEB_CLIENT_ID:     z.string().min(1),
  GOOGLE_IOS_CLIENT_ID:     z.string().min(1),
  GOOGLE_ANDROID_CLIENT_ID: z.string().min(1),

  /**
   * Apple Sign-In — must match your iOS app's bundle ID exactly.
   * Example: `com.yourcompany.yourapp`
   * No secret needed for native iOS token verification (public key fetch is automatic).
   */
  APPLE_CLIENT_ID: z.string().min(1),

  // Redis VPS
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Cloudflare R2
  CF_ACCOUNT_ID: z.string().min(1),
  CF_R2_ACCESS_KEY_ID: z.string().min(1),
  CF_R2_SECRET_ACCESS_KEY: z.string().min(1),
  CF_R2_BUCKET_NAME: z.string().min(1),
  CF_R2_PUBLIC_URL: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env

export const isProd = env.NODE_ENV === 'production'
export const isDev  = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'
