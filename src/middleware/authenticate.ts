import type { Request, Response, NextFunction } from 'express'
import { sendError }    from '../utils/apiResponse'
import { verifyAccess } from '../services/token.service'
import * as UserModel   from '../models/User'

const UNAUTHORIZED = 'Unauthorized'

/**
 * Verifies the JWT in the Authorization header and attaches req.user.
 *
 * Security properties enforced here:
 *  - Header must be exactly "Bearer <token>" — rejects missing scheme,
 *    malformed headers, and non-Bearer schemes.
 *  - Token is verified with JWT_ACCESS_SECRET and HS256 algorithm only.
 *  - payload.type is checked to be 'access' — refresh tokens are rejected
 *    even if their signature is valid (cross-token type confusion prevention).
 *  - User is re-fetched from DB on every request to catch mid-session bans
 *    without waiting for the access token to expire.
 *  - All failures return a generic 401 "Unauthorized" — no detail about
 *    which check failed to avoid leaking information to attackers.
 */
export async function authenticate(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    sendError(res, UNAUTHORIZED, 401)
    return
  }

  // Must be exactly two parts: scheme and token.
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    sendError(res, UNAUTHORIZED, 401)
    return
  }

  const token = parts[1]

  let payload
  try {
    payload = verifyAccess(token)
  } catch {
    // Covers: expired, malformed, wrong secret, wrong algorithm, wrong type.
    sendError(res, UNAUTHORIZED, 401)
    return
  }

  // Re-fetch from DB to confirm the user still exists and is not banned.
  // This catches mid-session account deactivation without relying solely
  // on short token expiry.
  const user = await UserModel.findById(payload.sub)
  if (!user || !user.isActive) {
    sendError(res, UNAUTHORIZED, 401)
    return
  }

  req.user = { id: user.id, role: user.role }
  next()
}
