import type { CorsOptions } from 'cors'
import { env, isProd } from './env'
import { logger } from './logger'

function parseOriginList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Origins from ALLOWED_ORIGINS, or comma-separated CORS_ORIGIN when not `*`. */
export function getAllowedOrigins(): string[] {
  const fromAllowed = parseOriginList(env.ALLOWED_ORIGINS)
  if (fromAllowed.length > 0) return fromAllowed

  if (env.CORS_ORIGIN && env.CORS_ORIGIN !== '*') {
    return parseOriginList(env.CORS_ORIGIN)
  }

  return []
}

const DEV_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:3000',
  'http://localhost:19006',
]

/** Local dev servers and LAN IPs used by Expo / React Native web. */
function isDevOrigin(origin: string): boolean {
  if (DEV_ORIGINS.includes(origin)) return true
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
    origin,
  )
}

export function buildCorsOptions(): CorsOptions {
  const allowedOrigins = getAllowedOrigins()

  if (isProd && allowedOrigins.length === 0) {
    logger.warn(
      'ALLOWED_ORIGINS is empty — allowing all browser origins until you set it on Render. ' +
        'Example: ALLOWED_ORIGINS=https://yourapp.com,http://localhost:19006',
    )
  }

  return {
    origin(origin, callback) {
      // React Native, Postman, and server-side callers often omit Origin.
      if (!origin) {
        callback(null, true)
        return
      }

      if (!isProd && isDevOrigin(origin)) {
        callback(null, true)
        return
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      // Env not configured yet — avoid blocking signup from web/Expo clients.
      if (isProd && allowedOrigins.length === 0) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86_400,
  }
}
