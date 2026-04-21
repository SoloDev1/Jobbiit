import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize }    from '../middleware/authorize'
import { validate }     from '../middleware/validate'
import { resolveReportSchema } from '../schemas/report.schema'
import * as AdminController from '../controllers/admin.controller'

const router = Router()

router.use(authenticate)

router.get('/stats', authorize('ADMIN'), AdminController.getStats)

router.get(
  '/reports',
  authorize('ADMIN', 'MODERATOR'),
  AdminController.getPendingReports,
)
router.post(
  '/reports/:id/resolve',
  authorize('ADMIN', 'MODERATOR'),
  validate(resolveReportSchema),
  AdminController.resolveReport,
)
router.post(
  '/reports/:id/dismiss',
  authorize('ADMIN', 'MODERATOR'),
  AdminController.dismissReport,
)

export default router
