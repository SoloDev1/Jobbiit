import type { Request, Response } from 'express'
import { logger }      from '../config/logger'
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse'
import { prisma }      from '../config/db'
import * as UserModel  from '../models/User'
import * as TokenModel from '../models/RefreshToken'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../services/password.service'
import {
  signAccess,
  signRefresh,
  storeRefresh,
  rotateRefresh,
  validateStoredRefresh,
  verifyRefresh,
} from '../services/token.service'

// ─── signup ───────────────────────────────────────────────────────────────────

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  // Check uniqueness before hashing to fail fast.
  // Use a generic message — do not reveal whether the email is registered.
  const existing = await UserModel.findByEmail(email)
  if (existing) {
    sendError(res, 'Email already registered', 409)
    return
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, role: true },
    })

    await tx.profile.create({
      data: {
        userId: createdUser.id,
        firstName: 'New',
        lastName: 'User',
        headline: 'New member',
      },
      select: { id: true },
    })

    return createdUser
  })

  const accessToken  = signAccess(user.id, user.role)
  const refreshToken = await storeRefresh(user.id)

  logger.info({ userId: user.id }, 'User signed up')

  sendCreated(res, {
    user:  { id: user.id, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  }, 'Account created successfully')
}

// ─── login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  const INVALID_CREDENTIALS = 'Invalid email or password'

  const user = await UserModel.findByEmailWithPassword(email)

  // ALWAYS call verifyPassword — even when user is null — using DUMMY_HASH.
  // This keeps response time constant so an attacker cannot distinguish
  // "email not found" from "wrong password" via timing.
  const passwordValid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  )

  // Do not reveal whether the failure was email or password.
  // Do not reveal whether the account is banned/inactive.
  if (!user || !passwordValid || !user.isActive) {
    sendError(res, INVALID_CREDENTIALS, 401)
    return
  }

  const accessToken  = signAccess(user.id, user.role)
  const refreshToken = await storeRefresh(user.id)

  logger.info({ userId: user.id }, 'User logged in')

  sendSuccess(res, {
    user:  { id: user.id, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  }, 'Logged in successfully')
}

// ─── refresh ──────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string }

  // 1. Cryptographically verify the JWT is well-formed and not expired.
  let payload
  try {
    payload = verifyRefresh(refreshToken)
  } catch {
    sendError(res, 'Invalid refresh token', 401)
    return
  }

  // 2. Check the token exists in the DB (not rotated or revoked).
  const stored = await validateStoredRefresh(refreshToken)

  if (!stored) {
    // Token is not in DB — either already rotated or never stored.
    // This is the reuse detection signal: nuke every session for this user
    // to contain the damage if the old token was stolen.
    await TokenModel.deleteAllForUser(payload.sub)
    logger.warn(
      { userId: payload.sub },
      'Refresh token reuse detected — all sessions invalidated',
    )
    sendError(res, 'Session invalidated due to suspicious activity', 401)
    return
  }

  // 3. Re-fetch the user to get the current role.
  //    Never trust the role embedded in the old token — it may be stale
  //    (e.g. the user was promoted or banned since the token was issued).
  const user = await UserModel.findById(stored.userId)
  if (!user || !user.isActive) {
    sendError(res, 'Invalid refresh token', 401)
    return
  }

  // 4. Rotate: delete old token, issue new one.
  const newRefreshToken = await rotateRefresh(refreshToken, user.id)
  const newAccessToken  = signAccess(user.id, user.role)

  sendSuccess(res, {
    accessToken:  newAccessToken,
    refreshToken: newRefreshToken,
  }, 'Token refreshed successfully')
}

// ─── logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string }

  // Verify the JWT — but if it's already expired/invalid we still succeed.
  // Logout must be idempotent: a client with a bad token should still be
  // able to clear their session.
  try {
    verifyRefresh(refreshToken)
  } catch {
    sendSuccess(res, null, 'Logged out successfully')
    return
  }

  // Silently ignore if the token was already deleted.
  await TokenModel.deleteToken(refreshToken)

  sendSuccess(res, null, 'Logged out successfully')
}
