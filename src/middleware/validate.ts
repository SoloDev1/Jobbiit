import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { sendError } from '../utils/apiResponse'

/**
 * Express middleware that validates req.body against a Zod schema.
 * On success, req.body is replaced with the parsed (coerced + stripped) data.
 * On failure, responds 422 with a structured error and short-circuits the chain.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      sendError(
        res,
        'Validation failed',
        422,
        'VALIDATION_ERROR',
        result.error.flatten(),
      )
      return
    }

    req.body = result.data
    next()
  }
}
