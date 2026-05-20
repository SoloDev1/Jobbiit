// routes/auth.routes.ts
import { Router } from 'express'
import {
  strictAuthLimiter,
  sessionLimiter,
  forgotPasswordOtpLimiter,
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
  oauthSigninSchema
} from '../schemas/auth.schema'
import * as AuthController from '../controllers/auth.controller'

const router = Router()

// ─── SENSITIVE ENDPOINTS ──────────────────────────────────────────────────
// Uses strict limiter to prevent brute force
router.post('/signup', strictAuthLimiter, validate(signupSchema), AuthController.signup)
router.post('/login',  strictAuthLimiter, validate(loginSchema),  AuthController.login)

router.post('/password/forgot', strictAuthLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword)
router.post('/password/reset',  strictAuthLimiter, validate(resetPasswordSchema),  AuthController.resetPassword)

router.post('/forgot-password', forgotPasswordOtpLimiter, validate(forgotPasswordOtpSchema), AuthController.forgotPasswordOtp)
router.post('/verify-otp', strictAuthLimiter, validate(verifyOtpSchema), AuthController.verifyOtp)

// ─── SESSION ENDPOINTS ────────────────────────────────────────────────────
// Uses session limiter (higher limit) so background refreshes don't lock the user out
router.post('/refresh', sessionLimiter, validate(refreshSchema), AuthController.refresh)

// Logout doesn't need a rate limiter (you want users to be able to leave!)
router.post('/logout', validate(refreshSchema), AuthController.logout)

// ─── AUTHENTICATED ENDPOINTS ──────────────────────────────────────────────
router.get('/me', authenticate, AuthController.me)
router.post('/onboarding/complete', authenticate, AuthController.completeOnboarding)
router.get('/account/data-export', authenticate, AuthController.exportAccountData)
router.post('/account/delete', authenticate, validate(deleteAccountSchema), AuthController.deleteAccount)

// OAuth

router.post('/oauth/signin', strictAuthLimiter, validate(oauthSigninSchema), AuthController.oauthSignin)
router.post('/account/delete/oauth', authenticate, AuthController.deleteOAuthAccount)


export default router