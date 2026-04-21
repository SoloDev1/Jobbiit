import type { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'
import {
  sendSuccess,
  sendCreated,
  sendError,
} from '../utils/apiResponse'
import * as OppModel from '../models/Opportunity'
import {
  opportunitiesQuerySchema,
  type CreateOpportunityInput,
  type UpdateOpportunityInput,
  type ApplyOpportunityInput,
  type RejectOpportunityInput,
} from '../schemas/opportunity.schema'

const uuidParam = z.string().uuid()

function userId(req: Request): string {
  return req.user!.id
}

// ─── getOpportunities ─────────────────────────────────────────────────────────

export async function getOpportunities(req: Request, res: Response): Promise<void> {
  const parsed = opportunitiesQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { category, isRemote, search, cursor, limit } = parsed.data
  if (cursor && OppModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { opportunities, nextCursor } = await OppModel.getOpportunities(userId(req), {
    category,
    isRemote,
    search,
    cursor,
    limit,
  })

  sendSuccess(res, { opportunities, nextCursor }, 'Opportunities loaded')
}

// ─── getOpportunityById ───────────────────────────────────────────────────────

export async function getOpportunityById(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const opp = await OppModel.getOpportunityById(parsed.data, userId(req))
  if (!opp) {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, opp, 'Opportunity loaded')
}

// ─── toggleSave ───────────────────────────────────────────────────────────────

export async function toggleSave(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const result = await OppModel.toggleSave(userId(req), parsed.data)
  if (result === 'not_found') {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, result, result.saved ? 'Opportunity saved' : 'Opportunity unsaved')
}

// ─── applyToOpportunity ───────────────────────────────────────────────────────

export async function applyToOpportunity(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const data   = req.body as ApplyOpportunityInput
  const result = await OppModel.applyToOpportunity(parsed.data, userId(req), data)

  if (result === 'not_found') {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'expired') {
    sendError(res, 'This opportunity is no longer accepting applications', 409, 'OPPORTUNITY_EXPIRED')
    return
  }
  if (result === 'duplicate') {
    sendError(res, 'Already applied to this opportunity', 409, 'ALREADY_APPLIED')
    return
  }

  logger.info({ userId: userId(req), opportunityId: parsed.data }, 'Opportunity application submitted')
  sendCreated(res, result, 'Application submitted')
}

// ─── getRecommended ───────────────────────────────────────────────────────────

export async function getRecommended(req: Request, res: Response): Promise<void> {
  const limit = z.coerce.number().int().positive().max(50).default(10).catch(10).parse(
    req.query.limit,
  )

  const recommendations = await OppModel.getRecommended(userId(req), limit)
  sendSuccess(res, recommendations, 'Recommendations loaded')
}

// ─── Admin / mod controllers ──────────────────────────────────────────────────

export async function createOpportunity(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateOpportunityInput

  const opp = await OppModel.createOpportunity(userId(req), data)
  logger.info({ userId: userId(req), opportunityId: opp.id }, 'Opportunity created')

  sendCreated(res, opp, 'Opportunity created')
}

export async function updateOpportunity(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const data   = req.body as UpdateOpportunityInput
  const result = await OppModel.updateOpportunity(parsed.data, data)

  if (!result) {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  logger.info({ userId: userId(req), opportunityId: parsed.data }, 'Opportunity updated')
  sendSuccess(res, result, 'Opportunity updated')
}

export async function approveOpportunity(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const result = await OppModel.approveOpportunity(parsed.data)
  if (!result) {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  logger.info({ userId: userId(req), opportunityId: parsed.data }, 'Opportunity approved')
  sendSuccess(res, result, 'Opportunity approved and published')
}

export async function rejectOpportunity(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const { reason } = req.body as RejectOpportunityInput
  const result     = await OppModel.rejectOpportunity(parsed.data, reason)

  if (!result) {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  logger.info({ userId: userId(req), opportunityId: parsed.data }, 'Opportunity rejected')
  sendSuccess(res, result, 'Opportunity rejected')
}
