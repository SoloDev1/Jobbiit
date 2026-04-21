import { PrismaClient, type Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env, isProd } from './env'
import { logger } from './logger'

// Prisma 7 uses the "client" engine; PostgreSQL requires @prisma/adapter-pg.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

const logConfig: Prisma.LogDefinition[] = isProd
  ? [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn'  },
    ]
  : [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn'  },
    ]

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: logConfig })

if (!isProd) {
  globalForPrisma.prisma = prisma
}

// Forward Prisma events into Pino so we have a single log pipeline.
// @ts-expect-error - Prisma's event typings are narrow per-level
prisma.$on('error', (e) => logger.error({ prisma: e }, 'Prisma error'))
// @ts-expect-error
prisma.$on('warn',  (e) => logger.warn({ prisma: e },  'Prisma warn'))

if (!isProd) {
  // @ts-expect-error — Prisma 7 query event typings are narrow
  prisma.$on('query', (e: { query: string; params: string; duration: number }) => {
    logger.debug(
      { query: e.query, params: e.params, durationMs: e.duration },
      'Prisma query',
    )
  })
}

export async function connectDb(): Promise<void> {
  await prisma.$connect()
  logger.info('Database connected')
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Database disconnected')
}
