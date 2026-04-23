import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize }    from '../middleware/authorize'
import { validate }     from '../middleware/validate'
import { resolveReportSchema } from '../schemas/report.schema'
import { adminManualPushSchema, adminInAppNotificationSchema } from '../schemas/admin.schema'
import * as AdminController from '../controllers/admin.controller'

const router = Router()

router.use(authenticate)

router.get('/stats', authorize('ADMIN'), AdminController.getStats)

router.post(
  '/push/send',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(adminManualPushSchema),
  AdminController.sendManualPush,
)

router.post(
  '/notifications/send',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(adminInAppNotificationSchema),
  AdminController.sendInAppNotification,
)

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
