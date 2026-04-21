import { Router } from 'express'
import { authLimiter }  from '../middleware/rateLimiter'
import { validate }     from '../middleware/validate'
import {
  signupSchema,
  loginSchema,
  refreshSchema,
} from '../schemas/auth.schema'
import * as AuthController from '../controllers/auth.controller'

const router = Router()

// authLimiter is applied to /signup, /login, and /refresh — not /logout.
// /refresh gets rate-limited to prevent brute-force token rotation attacks.
router.post('/signup',  authLimiter, validate(signupSchema),  AuthController.signup)
router.post('/login',   authLimiter, validate(loginSchema),   AuthController.login)
router.post('/refresh', authLimiter, validate(refreshSchema), AuthController.refresh)
router.post('/logout',               validate(refreshSchema), AuthController.logout)

export default router
