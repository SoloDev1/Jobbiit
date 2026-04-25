import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize }    from '../middleware/authorize'
import { validate }     from '../middleware/validate'
import { resolveReportSchema } from '../schemas/report.schema'
import {
  adminManualPushSchema,
  adminInAppNotificationSchema,
  banUserSchema,
  changeRoleSchema,
  adminCreatePostSchema,
} from '../schemas/admin.schema'
import * as AdminController from '../controllers/admin.controller'

const router = Router()

router.use(authenticate)

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.getStats)

// ─── User management ──────────────────────────────────────────────────────────

router.get(
  '/users',
  authorize('ADMIN', 'SUPER_ADMIN'),
  AdminController.listUsers,
)

router.get(
  '/users/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  AdminController.getUserDetail,
)

router.patch(
  '/users/:id/ban',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(banUserSchema),
  AdminController.banUser,
)

router.patch(
  '/users/:id/unban',
  authorize('ADMIN', 'SUPER_ADMIN'),
  AdminController.unbanUser,
)

router.patch(
  '/users/:id/role',
  authorize('SUPER_ADMIN'),
  validate(changeRoleSchema),
  AdminController.changeUserRole,
)

// ─── Post management ──────────────────────────────────────────────────────────

router.get(
  '/posts',
  authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  AdminController.adminListPosts,
)

router.post(
  '/posts',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(adminCreatePostSchema),
  AdminController.adminCreatePost,
)

router.delete(
  '/posts/:id',
  authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  AdminController.adminDeletePost,
)

router.patch(
  '/posts/:id/restore',
  authorize('ADMIN', 'SUPER_ADMIN'),
  AdminController.adminRestorePost,
)

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get(
  '/reports',
  authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  AdminController.getPendingReports,
)

router.post(
  '/reports/:id/resolve',
  authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  validate(resolveReportSchema),
  AdminController.resolveReport,
)

router.post(
  '/reports/:id/dismiss',
  authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  AdminController.dismissReport,
)

// ─── Audit logs ───────────────────────────────────────────────────────────────

router.get(
  '/audit-logs',
  authorize('ADMIN', 'SUPER_ADMIN'),
  AdminController.listAuditLogs,
)

// ─── Push / in-app notifications ─────────────────────────────────────────────

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

export default router
