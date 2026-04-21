import { env }    from './env'
import { logger } from './logger'
import { prisma } from './db'

logger.info('Environment loaded: ' + env.NODE_ENV)
logger.info('Port: '              + env.PORT)

async function main() {
  const userCount = await prisma.user.count()
  logger.info('Users in database: ' + userCount)
  await prisma.$disconnect()
}

main()