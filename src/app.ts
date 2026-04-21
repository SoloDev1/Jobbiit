// ─── Import order is mandatory ────────────────────────────────────────────────
// 1. env FIRST — validates all env vars immediately; process.exit(1) on failure
// 2. express-async-errors SECOND — must patch Express before any route loads
import './config/env'
import 'express-async-errors'

import express, {
  type Request,
  type Response,
  type NextFunction,
  type ErrorRequestHandler,
  Router,
} from 'express'
import { randomUUID }  from 'node:crypto'
import helmet          from 'helmet'
import cors            from 'cors'
import hpp             from 'hpp'
import compression     from 'compression'
import { Prisma }      from '@prisma/client'
import jwt             from 'jsonwebtoken'
import multer          from 'multer'
import { ZodError }    from 'zod'

import { env, isProd }        from './config/env'
import { logger }             from './config/logger'
import { connectDb, prisma }  from './config/db'
import { globalLimiter }      from './middleware/rateLimiter'
import { sendSuccess, sendError } from './utils/apiResponse'
import authRoutes             from './routes/auth.routes'
import profileRoutes          from './routes/profile.routes'
import postRoutes             from './routes/post.routes'
import connectionRoutes       from './routes/connection.routes'
import jobRoutes              from './routes/job.routes'
import opportunityRoutes      from './routes/opportunity.routes'
import notificationRoutes     from './routes/notification.routes'
import pushRoutes             from './routes/push.routes'
import reportRoutes           from './routes/report.routes'
import adminRoutes            from './routes/admin.routes'

// ─── App ──────────────────────────────────────────────────────────────────────

export const app = express()

// ─── 1. Security middleware ───────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy:        true,
    crossOriginEmbedderPolicy:    true,
    crossOriginResourcePolicy:    { policy: 'same-origin' },
    referrerPolicy:               { policy: 'no-referrer' },
    hsts:                         { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    noSniff:                      true,
    frameguard:                   { action: 'deny' },
    xssFilter:                    true,
  }),
)

app.use(
  cors({
    // Production: explicit per-origin whitelist from env — never wildcard '*'.
    // Development: localhost dev servers only.
    origin: isProd
      ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : ['http://localhost:8081', 'http://localhost:3000'],
    methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
    maxAge:         86_400, // cache preflight 24h
  }),
)

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false, limit: '10kb' }))
app.use(hpp())
app.use(compression())
app.use(globalLimiter)

// ─── 2. Request hygiene middleware ────────────────────────────────────────────

// Attach a unique ID to every request so logs can be correlated end-to-end.
app.use((req: Request, res: Response, next: NextFunction): void => {
  const id      = randomUUID()
  req.requestId = id
  res.setHeader('X-Request-ID', id)
  next()
})

// Log every incoming request.
// NEVER log: Authorization, Cookie, or req.body — they contain secrets.
app.use((req: Request, _res: Response, next: NextFunction): void => {
  logger.info(
    { requestId: req.requestId, method: req.method, path: req.path, ip: req.ip },
    'Incoming request',
  )
  next()
})

// ─── 3. Health checks ─────────────────────────────────────────────────────────

// Ultra-lightweight ping — used by load balancers polling every few seconds.
app.get('/health/ping', (_req: Request, res: Response): void => {
  sendSuccess(res, { status: 'ok' })
})

// Full health check: includes DB connectivity.
// Wrapped in try/catch so a DB failure returns 503 instead of crashing.
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const timestamp = new Date().toISOString()
  try {
    await prisma.$queryRaw`SELECT 1`
    sendSuccess(
      res,
      { status: 'ok', db: 'connected', timestamp, uptime: process.uptime() },
    )
  } catch {
    res.status(503).json({
      success: false,
      data: { status: 'degraded', db: 'unreachable', timestamp },
    })
  }
})

// ─── 4. API routes ────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/connections', connectionRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/opportunities', opportunityRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/push', pushRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', adminRoutes)

// Stub routers for features not yet implemented.
// Each returns 501 so routes are discoverable and testable from day one.
const stubRouter = (): Router => {
  const router = Router()
  router.use((_req: Request, res: Response): void => {
    res.status(501).json({ success: false, error: 'Not implemented yet' })
  })
  return router
}

app.use('/api/users',          stubRouter())

// ─── 5. Error handlers ────────────────────────────────────────────────────────

// 404 — must come after all routes.
app.use((req: Request, res: Response): void => {
  logger.warn(
    { requestId: req.requestId, method: req.method, path: req.path },
    'Route not found',
  )
  sendError(res, 'Route not found', 404, 'ROUTE_NOT_FOUND')
})

// Global error handler — must be last and must declare all 4 parameters so
// Express recognises it as an error-handling middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId

  // Always log the full error with stack — never suppress internally.
  logger.error({ err, requestId }, 'Unhandled error')

  // ── Prisma: DB unreachable / timeout (driver uses code ETIMEDOUT; engine uses P100x) ──
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return void sendError(
      res,
      'Database temporarily unavailable',
      503,
      'DATABASE_UNAVAILABLE',
    )
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'ETIMEDOUT':
      case 'P1001': // can't reach server
      case 'P1002': // reached but timed out
      case 'P1017': // server closed the connection
        return void sendError(
          res,
          'Database temporarily unavailable',
          503,
          'DATABASE_UNAVAILABLE',
        )
      case 'P2002':
        return void sendError(res, 'Resource already exists', 409, 'CONFLICT')
      case 'P2025':
        return void sendError(res, 'Resource not found', 404, 'NOT_FOUND')
      case 'P2003':
        return void sendError(res, 'Invalid reference', 400, 'INVALID_REFERENCE')
    }
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  // Check TokenExpiredError first — it is a subclass of JsonWebTokenError.
  if (err instanceof jwt.TokenExpiredError) {
    return void sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED')
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return void sendError(res, 'Invalid token', 401, 'INVALID_TOKEN')
  }

  // ── Zod validation errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    return void sendError(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.flatten().fieldErrors,
    )
  }

  // ── Multer / upload ───────────────────────────────────────────────────────
  if (err instanceof Error && err.message === 'INVALID_IMAGE_TYPE') {
    return void sendError(
      res,
      'Only JPEG, PNG, or WebP images are allowed',
      400,
      'INVALID_IMAGE_TYPE',
    )
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return void sendError(res, 'File too large', 413, 'FILE_TOO_LARGE')
    }
    return void sendError(res, 'Upload failed', 400, 'UPLOAD_ERROR')
  }

  // ── Default ───────────────────────────────────────────────────────────────
  // In production: generic message only — no internal details in the response.
  // In development: include message and stack for easier debugging.
  if (isProd) {
    return void sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR')
  }

  return void sendError(
    res,
    err instanceof Error ? err.message : 'Internal server error',
    500,
    'INTERNAL_ERROR',
    { stack: err instanceof Error ? err.stack : undefined },
  )
}

app.use(errorHandler)

// ─── 6. Server startup ────────────────────────────────────────────────────────
// Connect to PostgreSQL before listening so misconfiguration fails fast with a clear log.
let server: ReturnType<typeof app.listen> | undefined

async function start(): Promise<void> {
  await connectDb()
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started')
  })
}

void start().catch((startErr: unknown) => {
  logger.fatal(
    { err: startErr },
    'Failed to start server — check DATABASE_URL, firewall, SSL (e.g. ?sslmode=require), and that PostgreSQL is running',
  )
  process.exit(1)
})

// Graceful shutdown — stop accepting new connections, drain existing ones,
// then cleanly disconnect Prisma before exiting.
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received')
  if (!server) {
    await prisma.$disconnect()
    logger.info('Server shut down cleanly')
    process.exit(0)
    return
  }
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Server shut down cleanly')
    process.exit(0)
  })
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT',  () => { void shutdown('SIGINT') })

// Treat unhandled async failures and uncaught exceptions as fatal.
// Log and exit so the process manager (Docker, PM2, etc.) can restart cleanly.
process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled promise rejection')
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception')
  process.exit(1)
})
