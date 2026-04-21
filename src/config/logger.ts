import pino, { type Logger, type LoggerOptions } from 'pino'
import { env, isProd } from './env'

const options: LoggerOptions = {
  level: env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base:  { env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProd
    ? {
        target: 'pino-pretty',
        options: {
          colorize:      true,
          translateTime: 'SYS:HH:MM:ss',
          ignore:        'pid,hostname',
          singleLine:    false,
        },
      }
    : undefined,
}

export const logger: Logger = pino(options)
