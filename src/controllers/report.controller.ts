import type { Request, Response } from 'express'
import { logger } from '../config/logger'
import { sendCreated, sendError, sendSuccess } from '../utils/apiResponse'
import * as ReportModel from '../models/Report'
import type { CreateReportInput } from '../schemas/report.schema'

function userId(req: Request): string {
  return req.user!.id
}

export async function fileReport(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateReportInput

  const result = await ReportModel.createReport(userId(req), data)

  if (result === 'duplicate') {
    sendError(res, 'You already have a pending report for this item', 409, 'DUPLICATE_REPORT')
    return
  }

  logger.info({ reporterId: userId(req), reportId: result.id }, 'Report filed')

  sendCreated(res, { id: result.id }, 'Report submitted')
}

export async function getMyReports(req: Request, res: Response): Promise<void> {
  const reports = await ReportModel.getMyReports(userId(req))
  sendSuccess(res, reports, 'Your reports')
}
