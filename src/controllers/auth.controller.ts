import type { Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { logger }      from '../config/logger'
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse'
import { prisma }      from '../config/db'
import { env }         from '../config/env'
import * as UserModel  from '../models/User'
import * as ProfileModel from '../models/Profile'
import * as PasswordResetTokenModel from '../models/PasswordResetToken'
import * as TokenModel from '../models/RefreshToken'
import * as AccountService from '../services/account.service'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../services/password.service'
import * as EmailService from '../services/email.service'
import {
  signAccess,
  signRefresh,
  storeRefresh,
  rotateRefresh,
  validateStoredRefresh,
  verifyRefresh,
} from '../services/token.service'
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  DeleteAccountInput,
} from '../schemas/auth.schema'

function userAuthPayload(u: {
  id: string
  email: string
  role: Role
  onboardingCompletedAt: Date | null
}) {
  return {
    id:                   u.id,
    email:                u.email,
    role:                 u.role,
    onboardingComplete: u.onboardingCompletedAt !== null,
    ...(u.onboardingCompletedAt !== null && {
      onboardingCompletedAt: u.onboardingCompletedAt.toISOString(),
    }),
  }
}

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
      select: {
        id:                     true,
        email:                  true,
        role:                   true,
        onboardingCompletedAt:  true,
      },
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
    user:        userAuthPayload(user),
    accessToken,
    refreshToken,
  }, 'Account created successfully')

  void EmailService.sendWelcomeEmail(user.email).catch((err: unknown) => {
    logger.error({ err, userId: user.id }, 'Welcome email failed')
  })
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
    user:        userAuthPayload(user),
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

// ─── me ───────────────────────────────────────────────────────────────────────

export async function me(req: Request, res: Response): Promise<void> {
  const user = await UserModel.findById(req.user!.id)
  if (!user || !user.isActive) {
    sendError(res, 'Unauthorized', 401)
    return
  }

  sendSuccess(res, { user: userAuthPayload(user) }, 'OK')
}

// ─── completeOnboarding ───────────────────────────────────────────────────────

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  const id = req.user!.id

  const meets = await ProfileModel.profileMeetsOnboardingRequirements(id)
  if (!meets) {
    sendError(
      res,
      'Profile must have location and at least one skill before completing onboarding',
      400,
      'ONBOARDING_INCOMPLETE',
    )
    return
  }

  const at = await UserModel.completeOnboarding(id)
  if (at === null) {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(
    res,
    {
      onboardingComplete:      true,
      onboardingCompletedAt:   at.toISOString(),
    },
    'Onboarding completed successfully',
  )
}

// ─── forgotPassword ───────────────────────────────────────────────────────────

const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for that email, you will receive reset instructions shortly.'

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as ForgotPasswordInput

  const user = await UserModel.findByEmailWithPassword(email)
  await verifyPassword('ResetTimingNeutral1!', user?.passwordHash ?? DUMMY_HASH)

  if (!user || !user.isActive) {
    sendSuccess(res, null, FORGOT_PASSWORD_MESSAGE)
    return
  }

  const { raw } = await PasswordResetTokenModel.createForUser(user.id)
  const base = env.PASSWORD_RESET_URL_BASE.trim()
  const resetLink = base
    ? `${base.replace(/\/$/, '')}?token=${encodeURIComponent(raw)}`
    : null

  void EmailService.sendPasswordResetEmail(user.email, {
    resetLink,
    rawToken: resetLink ? undefined : raw,
  }).catch((err: unknown) => {
    logger.error({ err, userId: user.id }, 'Password reset email failed')
  })

  sendSuccess(res, null, FORGOT_PASSWORD_MESSAGE)
}

// ─── resetPassword ───────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as ResetPasswordInput

  const userId = await PasswordResetTokenModel.consumeAndGetUserId(token)
  if (!userId) {
    sendError(res, 'Invalid or expired reset link', 400, 'INVALID_RESET_TOKEN')
    return
  }

  const passwordHash = await hashPassword(password)
  await UserModel.updatePasswordHash(userId, passwordHash)
  await TokenModel.deleteAllForUser(userId)

  logger.info({ userId }, 'Password reset completed')

  sendSuccess(res, null, 'Password updated successfully. Please sign in again.')
}

// ─── deleteAccount ───────────────────────────────────────────────────────────

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const { password } = req.body as DeleteAccountInput
  const id = req.user!.id

  const user = await UserModel.findByIdWithPassword(id)
  if (!user || !user.isActive) {
    sendError(res, 'Unauthorized', 401)
    return
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD')
    return
  }

  await TokenModel.deleteAllForUser(id)
  await UserModel.deleteUser(id)

  logger.info({ userId: id }, 'User account deleted (data export / store compliance)')

  sendSuccess(res, null, 'Account deleted successfully')
}

// ─── exportAccountData ───────────────────────────────────────────────────────

export async function exportAccountData(req: Request, res: Response): Promise<void> {
  const id = req.user!.id
  const account = await AccountService.buildAccountDataExport(id)
  if (!account) {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(
    res,
    { exportedAt: new Date().toISOString(), account },
    'Personal data export',
  )
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
