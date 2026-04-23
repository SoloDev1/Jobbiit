import { Router } from 'express'
import { authLimiter }   from '../middleware/rateLimiter'
import { authenticate }  from '../middleware/authenticate'
import { validate }      from '../middleware/validate'
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
} from '../schemas/auth.schema'
import * as AuthController from '../controllers/auth.controller'

const router = Router()

// authLimiter is applied to /signup, /login, and /refresh — not /logout.
// /refresh gets rate-limited to prevent brute-force token rotation attacks.
router.post('/signup',  authLimiter, validate(signupSchema),  AuthController.signup)
router.post('/login',   authLimiter, validate(loginSchema),   AuthController.login)
router.post('/refresh', authLimiter, validate(refreshSchema), AuthController.refresh)
router.post('/logout',               validate(refreshSchema), AuthController.logout)

router.post('/password/forgot', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword)
router.post('/password/reset',  authLimiter, validate(resetPasswordSchema), AuthController.resetPassword)

router.get('/me', authenticate, AuthController.me)
router.post('/onboarding/complete', authenticate, AuthController.completeOnboarding)
router.get('/account/data-export', authenticate, AuthController.exportAccountData)
router.post('/account/delete', authenticate, validate(deleteAccountSchema), AuthController.deleteAccount)

export default router
