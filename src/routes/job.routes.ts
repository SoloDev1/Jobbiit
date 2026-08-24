import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import {
  readTierLimiter,
  writeTierLimiter,
  criticalMutationLimiter,
} from '../middleware/rateLimiter'
import {
  createJobSchema,
  updateJobSchema,
  applyJobSchema,
} from '../schemas/job.schema'
import * as JobController from '../controllers/job.controller'

const router = Router()

router.use(authenticate)

// ─── Static / prefix paths first to avoid /:id capture ───────────────────────
router.get('/saved',       readTierLimiter, JobController.getSavedJobs)
router.post('/save/:id',   writeTierLimiter, JobController.toggleSaveJob)

// ─── Collection & creation ────────────────────────────────────────────────────
router.get('/',  readTierLimiter, JobController.getJobs)
router.post('/', criticalMutationLimiter, validate(createJobSchema), JobController.createJob)

// ─── Resource routes ──────────────────────────────────────────────────────────
router.get('/:id',                  readTierLimiter, JobController.getJobById)
router.patch('/:id',                criticalMutationLimiter, validate(updateJobSchema), JobController.updateJob)
router.delete('/:id',               criticalMutationLimiter, JobController.closeJob)
router.post('/:id/apply',           criticalMutationLimiter, validate(applyJobSchema),  JobController.applyToJob)
router.get('/:id/applications',     readTierLimiter, JobController.getApplications)
router.post('/:id/skills',          writeTierLimiter, JobController.attachJobSkills)
router.delete('/:id/skills/:skillId', writeTierLimiter, JobController.detachJobSkill)

// Social interaction routes 
router.post('/:id/like',                        writeTierLimiter, JobController.toggleJobLike)
router.get('/:id/comments',                     readTierLimiter, JobController.getJobComments)
router.post('/:id/comments',                    writeTierLimiter, JobController.addJobComment)
router.delete('/:id/comments/:commentId',       writeTierLimiter, JobController.deleteJobComment)

export default router
