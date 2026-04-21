import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.coerce.number().int().positive().default(3000),

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
