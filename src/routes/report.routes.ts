import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate }     from '../middleware/validate'
import { createReportSchema } from '../schemas/report.schema'
import * as ReportController from '../controllers/report.controller'

const router = Router()

router.get('/mine', authenticate, ReportController.getMyReports)
router.post('/', authenticate, validate(createReportSchema), ReportController.fileReport)

export default router
