import { Router } from 'express'
import { authenticate }  from '../middleware/authenticate'
import { authorize }     from '../middleware/authorize'
import { validate }      from '../middleware/validate'
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  applyOpportunitySchema,
  rejectOpportunitySchema,
} from '../schemas/opportunity.schema'
import * as OppController from '../controllers/opportunity.controller'

const router = Router()

router.use(authenticate)

// ─── Public-facing (any authenticated user) ───────────────────────────────────
// Static / prefix paths first to avoid /:id capture.
router.get('/recommended',   OppController.getRecommended)
router.post('/save/:id',     OppController.toggleSave)

router.get('/',  OppController.getOpportunities)
router.get('/:id', OppController.getOpportunityById)
router.post('/:id/apply', validate(applyOpportunitySchema), OppController.applyToOpportunity)

// ─── Admin / Moderator ────────────────────────────────────────────────────────
router.post(
  '/',
  authorize('ADMIN', 'MODERATOR'),
  validate(createOpportunitySchema),
  OppController.createOpportunity,
)
router.patch(
  '/:id',
  authorize('ADMIN', 'MODERATOR'),
  validate(updateOpportunitySchema),
  OppController.updateOpportunity,
)

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post(
  '/:id/approve',
  authorize('ADMIN'),
  OppController.approveOpportunity,
)
router.post(
  '/:id/reject',
  authorize('ADMIN', 'MODERATOR'),
  validate(rejectOpportunitySchema),
  OppController.rejectOpportunity,
)

export default router
