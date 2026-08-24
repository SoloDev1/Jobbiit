// routes/auth.routes.ts
import { Router } from 'express'
import {
  accountLoginLimiter,
  ipAuthLimiter,
  otpTargetLimiter,
  sessionLimiter,
  readTierLimiter,
  criticalMutationLimiter,
} from '../middleware/rateLimiter'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  forgotPasswordOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  deleteAccountSchema,
  oauthSigninSchema,
} from '../schemas/auth.schema'
import * as AuthController from '../controllers/auth.controller'

const router = Router()

// ─── SENSITIVE AUTH ENDPOINTS (DUAL BUCKET DEFENSE) ───────────────────────
// Login: Must pass both IP-origin limiter AND Account-specific failure limiter
router.post(
  '/login',
  ipAuthLimiter,
  accountLoginLimiter,
  validate(loginSchema),
  AuthController.login,
)

// Signup: High-capacity IP ceiling with bot/abuse protection
router.post('/signup', ipAuthLimiter, validate(signupSchema), AuthController.signup)

// Password Recovery & OTP: Strictly limited per target identifier to prevent SMS/email bombing
router.post(
  '/password/forgot',
  otpTargetLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword,
)
router.post(
  '/password/reset',
  otpTargetLimiter,
  validate(resetPasswordSchema),
  AuthController.resetPassword,
)
router.post(
  '/forgot-password',
  otpTargetLimiter,
  validate(forgotPasswordOtpSchema),
  AuthController.forgotPasswordOtp,
)
router.post(
  '/verify-otp',
  otpTargetLimiter,
  validate(verifyOtpSchema),
  AuthController.verifyOtp,
)

// ─── SESSION ENDPOINTS ────────────────────────────────────────────────────
router.post('/refresh', sessionLimiter, validate(refreshSchema), AuthController.refresh)
router.post('/logout', validate(refreshSchema), AuthController.logout)

// ─── AUTHENTICATED USER ENDPOINTS ─────────────────────────────────────────
router.get('/me', authenticate, readTierLimiter, AuthController.me)
router.post('/onboarding/complete', authenticate, criticalMutationLimiter, AuthController.completeOnboarding)
router.get('/account/data-export', authenticate, criticalMutationLimiter, AuthController.exportAccountData)
router.post(
  '/account/delete',
  authenticate,
  criticalMutationLimiter,
  validate(deleteAccountSchema),
  AuthController.deleteAccount,
)

// OAuth
router.post('/oauth/signin', ipAuthLimiter, validate(oauthSigninSchema), AuthController.oauthSignin)
router.post('/account/delete/oauth', authenticate, criticalMutationLimiter, AuthController.deleteOAuthAccount)

export default router