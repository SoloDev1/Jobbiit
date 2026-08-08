import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize }    from '../middleware/authorize'
import { validate }     from '../middleware/validate'
import { uploadPostFiles } from '../middleware/upload'
import { resolveReportSchema } from '../schemas/report.schema'
import {
  adminManualPushSchema,
  adminInAppNotificationSchema,
  banUserSchema,
  changeRoleSchema,
  adminCreatePostSchema,
} from '../schemas/admin.schema'
import * as AdminController from '../controllers/admin.controller'
import { createOpportunitySchema, updateOpportunitySchema, rejectOpportunitySchema } from '../schemas/opportunity.schema'
import { createJobSchema, updateJobSchema } from '../schemas/job.schema'
import * as OpportunityController from '../controllers/opportunity.controller'
import * as JobController from '../controllers/job.controller'

const router = Router()
router.use(authenticate)

// Stats
router.get('/stats', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.getStats)

// Users
router.get('/users', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.listUsers)
router.get('/users/:id', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.getUserDetail)
router.patch('/users/:id/ban', authorize('ADMIN', 'SUPER_ADMIN'), validate(banUserSchema), AdminController.banUser)
router.patch('/users/:id/unban', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.unbanUser)
router.patch('/users/:id/role', authorize('SUPER_ADMIN'), validate(changeRoleSchema), AdminController.changeUserRole)

// Posts
router.get('/posts', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.adminListPosts)
router.post('/posts/media/upload', authorize('ADMIN', 'SUPER_ADMIN'), uploadPostFiles, AdminController.adminUploadPostMedia)
router.post('/posts', authorize('ADMIN', 'SUPER_ADMIN'), validate(adminCreatePostSchema), AdminController.adminCreatePost)
router.delete('/posts/:id', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.adminDeletePost)
router.patch('/posts/:id/restore', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.adminRestorePost)

// Reports
router.get('/reports', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.getPendingReports)
router.post('/reports/:id/resolve', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), validate(resolveReportSchema), AdminController.resolveReport)
router.post('/reports/:id/dismiss', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.dismissReport)

// Audit logs
router.get('/audit-logs', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.listAuditLogs)

// Notifications
router.post('/push/send', authorize('ADMIN', 'SUPER_ADMIN'), validate(adminManualPushSchema), AdminController.sendManualPush)
router.post('/notifications/send', authorize('ADMIN', 'SUPER_ADMIN'), validate(adminInAppNotificationSchema), AdminController.sendInAppNotification)

// Jobs — uses dedicated admin model function (no status filter)
router.get('/jobs', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.adminListJobs)
router.post('/jobs', authorize('ADMIN', 'SUPER_ADMIN'), validate(createJobSchema), JobController.createJob)
router.patch('/jobs/:id/close', authorize('ADMIN', 'SUPER_ADMIN'), JobController.closeJob)
router.patch(
  '/jobs/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateJobSchema),
  AdminController.adminUpdateJob,
)
router.delete('/jobs/:id', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.adminSoftDeleteJob)
router.patch('/jobs/:id/restore', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.adminRestoreJob)
router.delete('/jobs/:id/hard', authorize('SUPER_ADMIN'), AdminController.adminHardDeleteJob)

// Opportunities — uses dedicated admin model function (no status/deadline filter)
router.get('/opportunities', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.adminListOpportunities)
router.post('/opportunities', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), validate(createOpportunitySchema), OpportunityController.createOpportunity)
router.patch('/opportunities/:id', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), validate(updateOpportunitySchema), OpportunityController.updateOpportunity)
router.patch('/opportunities/:id/approve', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), OpportunityController.approveOpportunity)
router.patch('/opportunities/:id/reject', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), validate(rejectOpportunitySchema), OpportunityController.rejectOpportunity)
router.delete('/opportunities/:id', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.adminSoftDeleteOpportunity)
router.patch('/opportunities/:id/restore', authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), AdminController.adminRestoreOpportunity)
router.delete('/opportunities/:id/hard', authorize('SUPER_ADMIN'), AdminController.adminHardDeleteOpportunity)

export default router
