import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { sendError } from '../utils/apiResponse'

/**
 * Role-based authorisation gate. Must be placed AFTER authenticate.
 * Returns 403 if the authenticated user's role is not in the allowlist.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden', 403, 'FORBIDDEN')
      return
    }
    next()
  }
}
