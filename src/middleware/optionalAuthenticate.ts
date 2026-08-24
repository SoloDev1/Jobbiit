import type { Request, Response, NextFunction } from 'express'
import { verifyAccess } from '../services/token.service'
import * as UserModel   from '../models/User'

/**
 * Optional authentication middleware:
 * - If Authorization header is provided with a valid Bearer token, attaches req.user.
 * - If header is missing or token is expired/invalid, continues silently with req.user = undefined.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return next()
  }

  const token = parts[1]

  try {
    const payload = verifyAccess(token)
    const user = await UserModel.findById(payload.sub)
    if (user && user.isActive) {
      req.user = user
    }
  } catch {
    // If token invalid/expired, proceed as anonymous user
  }

  next()
}
