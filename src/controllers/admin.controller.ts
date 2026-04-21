import type { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'
import { sendSuccess, sendError } from '../utils/apiResponse'
import * as ReportModel from '../models/Report'
import {
  pendingReportsQuerySchema,
  type ResolveReportInput,
} from '../schemas/report.schema'

const uuidParam = z.string().uuid()

function userId(req: Request): string {
  return req.user!.id
}

export async function getPendingReports(req: Request, res: Response): Promise<void> {
  const parsed = pendingReportsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { cursor, limit } = parsed.data
  if (cursor && ReportModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { reports, nextCursor } = await ReportModel.getPendingReports(cursor, limit)

  sendSuccess(res, { reports, nextCursor }, 'Pending reports')
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid report id', 400, 'INVALID_ID')
    return
  }

  const { action } = req.body as ResolveReportInput

  const result = await ReportModel.resolveReport(idParsed.data, userId(req), action)

  if (result === 'not_found') {
    sendError(res, 'Report not found or already handled', 404, 'NOT_FOUND')
    return
  }

  logger.info({ reportId: idParsed.data, resolverId: userId(req) }, 'Report resolved')

  sendSuccess(res, { id: idParsed.data }, 'Report resolved')
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid report id', 400, 'INVALID_ID')
    return
  }

  const result = await ReportModel.dismissReport(idParsed.data, userId(req))

  if (result === 'not_found') {
    sendError(res, 'Report not found or already handled', 404, 'NOT_FOUND')
    return
  }

  logger.info({ reportId: idParsed.data, resolverId: userId(req) }, 'Report dismissed')

  sendSuccess(res, { id: idParsed.data }, 'Report dismissed')
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  const stats = await ReportModel.getAdminStats()
  sendSuccess(res, stats, 'Stats')
}
