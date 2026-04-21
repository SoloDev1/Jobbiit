import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import {
  createJobSchema,
  updateJobSchema,
  applyJobSchema,
} from '../schemas/job.schema'
import * as JobController from '../controllers/job.controller'

const router = Router()

router.use(authenticate)

// ─── Static / prefix paths first to avoid /:id capture ───────────────────────
router.get('/saved',       JobController.getSavedJobs)
router.post('/save/:id',   JobController.toggleSaveJob)

// ─── Collection & creation ────────────────────────────────────────────────────
router.get('/',  JobController.getJobs)
router.post('/', validate(createJobSchema), JobController.createJob)

// ─── Resource routes ──────────────────────────────────────────────────────────
router.get('/:id',                 JobController.getJobById)
router.patch('/:id',               validate(updateJobSchema), JobController.updateJob)
router.delete('/:id',              JobController.closeJob)
router.post('/:id/apply',          validate(applyJobSchema),  JobController.applyToJob)
router.get('/:id/applications',    JobController.getApplications)

export default router
