import type { Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { logger } from '../config/logger'
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse'
import { prisma } from '../config/db'
import { env } from '../config/env'
import * as UserModel from '../models/User'
import * as ProfileModel from '../models/Profile'
import * as PasswordResetTokenModel from '../models/PasswordResetToken'
import * as TokenModel from '../models/RefreshToken'
import * as AccountService from '../services/account.service'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../services/password.service'
import * as EmailService from '../services/email.service'
import {
  signAccess,
  storeRefresh,
  rotateRefresh,
  validateStoredRefresh,
  verifyRefresh,
} from '../services/token.service'
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  ForgotPasswordOtpInput,
  VerifyOtpInput,
  DeleteAccountInput,
} from '../schemas/auth.schema'
import {
  generateSixDigitOtp,
  hashOtp,
  otpMatches,
  otpExpiresAt,
  isOtpExpired,
} from '../services/otp.service'
import * as OAuthService from '../services/oauth.service'
import * as OAuthAccountModel from '../models/OAuthAccount'
import { audit } from '../models/AuditLog'

// ─── shared helper ────────────────────────────────────────────────────────────

// email is string | null because OAuth users (Apple without email) may have none.
function userAuthPayload(u: {
  id: string
  email: string | null
  role: Role
  onboardingCompletedAt: Date | null
  passwordHash?: string | null
}) {
  return {
    id: u.id,
    email: u.email ?? null,
    role: u.role,
    onboardingCompletedAt: u.onboardingCompletedAt?.toISOString() ?? null,
    hasPassword:           !!u.passwordHash, 
  }
}

// ─── signup ───────────────────────────────────────────────────────────────────

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  // Fail fast before hashing — but keep message generic.
  const existing = await UserModel.findByEmail(email)
  if (existing) {
    await audit(req, 'SIGNUP', {
      status: 'FAILURE',
      errorMessage: 'Email already registered',
      metadata: { email },
    })
    sendError(res, 'Email already registered', 409)
    return
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email, passwordHash },
      select: {
        id: true,
        email: true,
        role: true,
        onboardingCompletedAt: true,
        passwordHash:          true, 
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

  const accessToken = signAccess(user.id, user.role)
  const refreshToken = await storeRefresh(user.id)

  logger.info({ userId: user.id }, 'User signed up')

  await audit(req, 'SIGNUP', {
    actorId: user.id,
    metadata: { email: user.email },
  })

  sendCreated(res, {
    user: userAuthPayload(user),
    accessToken,
    refreshToken,
  }, 'Account created successfully')

  // email is always present for password signup
  if (user.email) {
    void EmailService.sendWelcomeEmail(user.email).catch((err: unknown) => {
      logger.error({ err, userId: user.id }, 'Welcome email failed')
    })
  }
}

// ─── login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  const INVALID_CREDENTIALS = 'Invalid email or password'

  const user = await UserModel.findByEmailWithPassword(email)

  // Always call verifyPassword — even when user is null — to keep response
  // time constant and prevent email enumeration via timing.
  const passwordValid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  )

  // Block: not found, wrong password, inactive, OR OAuth-only (no passwordHash).
  if (!user || !user.passwordHash || !passwordValid || !user.isActive) {
    const reason = !user
      ? 'user_not_found'
      : !user.passwordHash
        ? 'oauth_only_account'
        : !user.isActive
          ? 'inactive'
          : 'wrong_password'

    await audit(req, 'LOGIN_FAILED', {
      actorId: user?.id ?? null,
      status: 'FAILURE',
      errorMessage: INVALID_CREDENTIALS,
      metadata: { email, reason },
    })

    sendError(res, INVALID_CREDENTIALS, 401)
    return
  }

  const accessToken = signAccess(user.id, user.role)
  const refreshToken = await storeRefresh(user.id)

  logger.info({ userId: user.id }, 'User logged in')

  await audit(req, 'LOGIN_SUCCESS', {
    actorId: user.id,
    metadata: { email: user.email },
  })

  sendSuccess(res, {
    user: userAuthPayload(user),
    accessToken,
    refreshToken,
  }, 'Logged in successfully')
}

// ─── refresh ──────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string }

  // 1. Verify JWT structure and expiry.
  let payload
  try {
    payload = verifyRefresh(refreshToken)
  } catch {
    sendError(res, 'Invalid refresh token', 401)
    return
  }

  // 2. Confirm the token still exists in DB (not rotated / revoked).
  const stored = await validateStoredRefresh(refreshToken)
  if (!stored) {
    // Reuse detected — nuke all sessions for this user.
    await TokenModel.deleteAllForUser(payload.sub)
    logger.warn({ userId: payload.sub }, 'Refresh token reuse detected — all sessions invalidated')
    await audit(req, 'REFRESH_TOKEN_REUSE', {
      actorId: payload.sub,
      status: 'FAILURE',
      errorMessage: 'Refresh token reuse detected',
    })
    sendError(res, 'Session invalidated due to suspicious activity', 401)
    return
  }

  // 3. Re-fetch user so we always use the current role (never trust the token).
  const user = await UserModel.findById(stored.userId)
  if (!user || !user.isActive) {
    sendError(res, 'Invalid refresh token', 401)
    return
  }

  // 4. Rotate.
  const newRefreshToken = await rotateRefresh(refreshToken, user.id)
  const newAccessToken = signAccess(user.id, user.role)

  sendSuccess(res, {
    accessToken: newAccessToken,
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

  sendSuccess(res, {
    onboardingComplete: true,
    onboardingCompletedAt: at.toISOString(),
  }, 'Onboarding completed successfully')
}

// ─── forgotPassword ───────────────────────────────────────────────────────────

const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for that email, you will receive reset instructions shortly.'

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as ForgotPasswordInput

  const user = await UserModel.findByEmailWithPassword(email)

  // Always burn time to prevent timing attacks.
  await verifyPassword('ResetTimingNeutral1!', user?.passwordHash ?? DUMMY_HASH)

  // Also bail if it's an OAuth-only account (no email / no password).
  if (!user || !user.isActive || !user.email) {
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

  await audit(req, 'PASSWORD_RESET_REQUESTED', {
    actorId: user.id,
    metadata: { email: user.email, channel: 'link' },
  })

  sendSuccess(res, null, FORGOT_PASSWORD_MESSAGE)
}

// ─── forgotPasswordOtp ────────────────────────────────────────────────────────

export async function forgotPasswordOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as ForgotPasswordOtpInput

  const user = await UserModel.findByEmailWithPassword(email)

  await verifyPassword('ResetTimingNeutral1!', user?.passwordHash ?? DUMMY_HASH)

  if (!user || !user.isActive || !user.email) {
    await audit(req, 'PASSWORD_OTP_REQUESTED', {
      status: 'FAILURE',
      errorMessage: !user
        ? 'unknown_email'
        : !user.isActive
          ? 'inactive'
          : 'no_email',
      metadata: { email },
    })
    sendSuccess(res, null, FORGOT_PASSWORD_MESSAGE)
    return
  }

  const rawOtp = generateSixDigitOtp()
  await UserModel.setPasswordOtp(user.id, hashOtp(rawOtp), otpExpiresAt())

  void EmailService.sendPasswordOtpEmail(user.email, rawOtp).catch((err: unknown) => {
    logger.error({ err, userId: user.id }, 'Password OTP email failed')
  })

  await audit(req, 'PASSWORD_OTP_REQUESTED', {
    actorId: user.id,
    metadata: { email: user.email },
  })

  sendSuccess(res, null, FORGOT_PASSWORD_MESSAGE)
}

// ─── verifyOtp ────────────────────────────────────────────────────────────────

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { email, otp, new_password } = req.body as VerifyOtpInput

  const user = await UserModel.findByEmailWithOtp(email)

  const otpInvalid =
    !user ||
    !user.isActive ||
    !user.otp ||
    isOtpExpired(user.otpExpiresAt) ||
    !otpMatches(user.otp, otp)

  if (otpInvalid) {
    await audit(req, 'PASSWORD_OTP_VERIFY_FAILED', {
      actorId: user?.id ?? null,
      status: 'FAILURE',
      errorMessage: 'Invalid or expired OTP',
      metadata: { email },
    })
    sendError(res, 'Invalid or expired OTP', 400, 'INVALID_OTP')
    return
  }

  const passwordHash = await hashPassword(new_password)
  await UserModel.updatePasswordHash(user.id, passwordHash)
  await UserModel.clearPasswordOtp(user.id)
  await TokenModel.deleteAllForUser(user.id)

  logger.info({ userId: user.id }, 'Password reset via OTP completed')

  await audit(req, 'PASSWORD_OTP_VERIFY_SUCCESS', {
    actorId: user.id,
    metadata: { email: user.email },
  })

  sendSuccess(res, null, 'Password updated successfully. Please sign in again.')
}

// ─── resetPassword ────────────────────────────────────────────────────────────

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

  await audit(req, 'PASSWORD_RESET_COMPLETED', {
    actorId: userId,
    metadata: { channel: 'link' },
  })

  sendSuccess(res, null, 'Password updated successfully. Please sign in again.')
}

// ─── deleteAccount ────────────────────────────────────────────────────────────

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const { password } = req.body as DeleteAccountInput
  const id = req.user!.id

  const user = await UserModel.findByIdWithPassword(id)
  if (!user || !user.isActive) {
    sendError(res, 'Unauthorized', 401)
    return
  }

  // OAuth-only users have no passwordHash — they cannot delete via this endpoint.
  if (!user.passwordHash) {
    sendError(
      res,
      'OAuth-only accounts must use account settings to delete.',
      400,
      'NO_PASSWORD_ACCOUNT',
    )
    return
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD')
    return
  }

  await TokenModel.deleteAllForUser(id)
  await UserModel.deleteUser(id)

  logger.info({ userId: id }, 'User account deleted')

  await audit(req, 'ACCOUNT_DELETED', {
    actorId: id,
    metadata: { email: user.email },
  })

  sendSuccess(res, null, 'Account deleted successfully')
}

// ─── exportAccountData ────────────────────────────────────────────────────────

export async function exportAccountData(req: Request, res: Response): Promise<void> {
  const id = req.user!.id
  const account = await AccountService.buildAccountDataExport(id)
  if (!account) {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, {
    exportedAt: new Date().toISOString(),
    account,
  }, 'Personal data export')
}

// ─── logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string }

  // Logout is idempotent — an already-expired token should still succeed.
  let payloadSub: string | null = null
  try {
    payloadSub = verifyRefresh(refreshToken).sub
  } catch {
    sendSuccess(res, null, 'Logged out successfully')
    return
  }

  await TokenModel.deleteToken(refreshToken)

  await audit(req, 'LOGOUT', { actorId: payloadSub })

  sendSuccess(res, null, 'Logged out successfully')
}

// ─── oauthSignin ─────────────────────────────────────────────────────────────
//
// Flow:
//   1. Verify the provider token (Google / Apple).
//   2. If the OAuth account is already linked → sign in.
//   3. If not linked but email matches an existing user → link + sign in.
//   4. Otherwise → create user + profile, link, sign in.

export async function oauthSignin(req: Request, res: Response): Promise<void> {
  const { provider, idToken, firstName: bodyFirstName, lastName: bodyLastName }
    = req.body as { provider: 'google' | 'apple'; idToken: string; firstName?: string; lastName?: string }

  let identity: OAuthService.OAuthIdentity
  try {
    identity = provider === 'google'
      ? await OAuthService.verifyGoogleToken(idToken)
      : await OAuthService.verifyAppleToken(idToken)
  } catch {
    await audit(req, 'LOGIN_FAILED', {
      status: 'FAILURE',
      errorMessage: 'Invalid OAuth token',
      metadata: { provider },
    })
    sendError(res, 'Invalid OAuth token', 401, 'INVALID_OAUTH_TOKEN')
    return
  }

  const firstName = identity.firstName ?? bodyFirstName ?? 'New'
  const lastName  = identity.lastName  ?? bodyLastName  ?? 'User'

  const existing = await OAuthAccountModel.findByProviderSubject(
    identity.provider,
    identity.subject,
  )

  if (existing) {
    const user = existing.user
    if (!user.isActive || user.isBanned) {
      await audit(req, 'LOGIN_FAILED', {
        actorId: user.id,
        status: 'FAILURE',
        errorMessage: user.isBanned ? 'banned' : 'inactive',
        metadata: { provider },
      })
      sendError(res, 'Account is not active', 403)
      return
    }
    const accessToken  = signAccess(user.id, user.role)
    const refreshToken = await storeRefresh(user.id)
    logger.info({ userId: user.id, provider }, 'OAuth sign-in (existing)')
    await audit(req, 'OAUTH_SIGNIN_EXISTING', {
      actorId: user.id,
      metadata: { provider, email: user.email },
    })
    sendSuccess(res, { user: userAuthPayload(user), accessToken, refreshToken }, 'Signed in successfully')
    return
  }

  let userId: string

  if (identity.email) {
    const existingUser = await UserModel.findByEmail(identity.email)
    if (existingUser) {
      userId = existingUser.id
    } else {
      const newUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { email: identity.email! },
          select: { id: true, email: true, role: true, onboardingCompletedAt: true, passwordHash: true },
        })
        await tx.profile.create({
          data: { userId: u.id, firstName, lastName, headline: 'New member' },  // ✅ real name
          select: { id: true },
        })
        return u
      })
      userId = newUser.id
      if (newUser.email) {
        void EmailService.sendWelcomeEmail(newUser.email).catch((err: unknown) => {
          logger.error({ err, userId: newUser.id }, 'Welcome email failed')
        })
      }
    }
  } else {
    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {},   // ✅ no email, no passwordHash
        select: { id: true, email: true, role: true, onboardingCompletedAt: true, passwordHash: true },
      })
      await tx.profile.create({
        data: { userId: u.id, firstName, lastName, headline: 'New member' },  // ✅ real name
        select: { id: true },
      })
      return u
    })
    userId = newUser.id
  }

  await OAuthAccountModel.linkToUser(userId, identity.provider, identity.subject, identity.email ?? null)

  // ✅ findByIdWithPassword so hasPassword is accurate in the response
  const user = await UserModel.findByIdWithPassword(userId)
  if (!user) {
    sendError(res, 'Failed to create account', 500)
    return
  }

  const accessToken  = signAccess(user.id, user.role)
  const refreshToken = await storeRefresh(user.id)

  logger.info({ userId: user.id, provider }, 'OAuth account created')

  await audit(req, 'OAUTH_SIGNIN_NEW', {
    actorId: user.id,
    metadata: { provider, email: user.email },
  })

  sendCreated(res, { user: userAuthPayload(user), accessToken, refreshToken }, 'Account created successfully')
}


export async function deleteOAuthAccount(req: Request, res: Response): Promise<void> {
  const id = req.user!.id

  const user = await UserModel.findByIdWithPassword(id)
  if (!user || !user.isActive) {
    sendError(res, 'Unauthorized', 401)
    return
  }

  // Guard: only OAuth-only accounts (no passwordHash) can use this endpoint
  if (user.passwordHash) {
    sendError(
      res,
      'Password accounts must use the standard delete endpoint.',
      400,
      'USE_PASSWORD_DELETE',
    )
    return
  }

  await TokenModel.deleteAllForUser(id)
  await UserModel.deleteUser(id)

  logger.info({ userId: id }, 'OAuth user account deleted')

  await audit(req, 'ACCOUNT_DELETED_OAUTH', {
    actorId: id,
    metadata: { email: user.email },
  })

  sendSuccess(res, null, 'Account deleted successfully')
}