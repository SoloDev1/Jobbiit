import { Router } from 'express'
import { authenticate }  from '../middleware/authenticate'
import { optionalAuthenticate } from '../middleware/optionalAuthenticate'
import { authorize }     from '../middleware/authorize'
import { validate }      from '../middleware/validate'
import {
  readTierLimiter,
  writeTierLimiter,
  criticalMutationLimiter,
} from '../middleware/rateLimiter'
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  applyOpportunitySchema,
  rejectOpportunitySchema,
} from '../schemas/opportunity.schema'
import * as OppController from '../controllers/opportunity.controller'

const router = Router()

// ─── Public Discovery (Unauthenticated gets stripped applyUrl, authenticated gets full)
router.get('/',              optionalAuthenticate, readTierLimiter, OppController.getOpportunities)
router.get('/:id',           optionalAuthenticate, readTierLimiter, OppController.getOpportunityById)

// ─── Authenticated Routes ────────────────────────────────────────────────────
router.use(authenticate)

// ─── Read-Heavy Public-facing (any authenticated user) ────────────────────────
// Bound to req.user.id (100 req/min/user)
router.get('/recommended',   readTierLimiter, OppController.getRecommended)
router.get('/saved',         readTierLimiter, OppController.getSavedOpportunities)
router.get('/:id/analysis',  readTierLimiter, OppController.getOpportunityAnalysis)

// ─── Mutations / Social (25 req/min/user) ────────────────────────────────────
router.post('/save/:id',     writeTierLimiter, OppController.toggleSave)
router.post('/:id/like',     writeTierLimiter, OppController.toggleOpportunityLike)
router.get('/:id/comments',  readTierLimiter,  OppController.getOpportunityComments)
router.post('/:id/comments', writeTierLimiter, OppController.addOpportunityComment)
router.delete('/:id/comments/:commentId', writeTierLimiter, OppController.deleteOpportunityComment)

// ─── Critical Mutations (10 req/5min/user) ───────────────────────────────────
router.post('/:id/confirm-status', criticalMutationLimiter, OppController.confirmApplicationStatus)
router.post('/:id/apply', criticalMutationLimiter, validate(applyOpportunitySchema), OppController.applyToOpportunity)

// ─── Admin / Moderator ────────────────────────────────────────────────────────
router.post(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  criticalMutationLimiter,
  validate(createOpportunitySchema),
  OppController.createOpportunity,
)
router.patch(
  '/:id',
  authorize('ADMIN', 'MODERATOR'),
  criticalMutationLimiter,
  validate(updateOpportunitySchema),
  OppController.updateOpportunity,
)

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post(
  '/:id/approve',
  authorize('ADMIN'),
  criticalMutationLimiter,
  OppController.approveOpportunity,
)
router.post(
  '/:id/reject',
  authorize('ADMIN', 'MODERATOR'),
  criticalMutationLimiter,
  validate(rejectOpportunitySchema),
  OppController.rejectOpportunity,
)

export default router
