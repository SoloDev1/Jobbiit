import type { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNoContent,
} from '../utils/apiResponse'
import * as OppModel from '../models/Opportunity'
import * as OppInteractions from '../models/opportunity-interactions.model'
import * as notificationService from '../services/notification.service'
import { audit } from '../models/AuditLog'
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

  if (result.saved) {
    await audit(req, 'OPPORTUNITY_SAVED', {
      entityId:   parsed.data,
      entityType: 'Opportunity',
    })
  }

  sendSuccess(res, result, result.saved ? 'Opportunity saved' : 'Opportunity unsaved')
}

// ─── getSavedOpportunities ───────────────────────────────────────────────────

export async function getSavedOpportunities(req: Request, res: Response): Promise<void> {
  const saved = await OppModel.getSavedOpportunities(userId(req))
  sendSuccess(res, saved, 'Saved opportunities loaded')
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

  await audit(req, 'OPPORTUNITY_APPLIED', {
    entityId:   parsed.data,
    entityType: 'Opportunity',
    metadata:   { mode: 'direct_apply' },
  })

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

  await audit(req, 'CREATE_OPPORTUNITY', {
    entityId:   opp.id,
    entityType: 'Opportunity',
    metadata:   { title: opp.title, category: opp.category },
  })

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

  await audit(req, 'UPDATE_OPPORTUNITY', {
    entityId:   parsed.data,
    entityType: 'Opportunity',
    metadata:   { fields: Object.keys(data) },
  })

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

  notificationService.notifyOpportunityApproved(result.id, result.title, result.posterId, userId(req))
  logger.info({ userId: userId(req), opportunityId: parsed.data }, 'Opportunity approved')

  await audit(req, 'APPROVE_OPPORTUNITY', {
    entityId:   parsed.data,
    entityType: 'Opportunity',
    targetId:   result.posterId,
  })

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

  await audit(req, 'REJECT_OPPORTUNITY', {
    entityId:   parsed.data,
    entityType: 'Opportunity',
    metadata:   { reason },
  })

  sendSuccess(res, result, 'Opportunity rejected')
}

// ─── toggleOpportunityLike ────────────────────────────────────────────────────

export async function toggleOpportunityLike(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const result = await OppInteractions.toggleOpportunityLike(parsed.data, userId(req))
  if (!result) {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, { liked: result.liked, count: result.count }, result.liked ? 'Opportunity liked' : 'Opportunity unliked')
}

// ─── getOpportunityComments ───────────────────────────────────────────────────

const commentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().positive().max(50).default(20),
})

export async function getOpportunityComments(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const { cursor, limit } = commentsQuerySchema.catch({ limit: 20 }).parse(req.query)

  const result = await OppInteractions.getOpportunityComments(idParsed.data, cursor, limit)
  sendSuccess(res, result, 'Comments loaded')
}

// ─── addOpportunityComment ────────────────────────────────────────────────────

const commentBodySchema = z.object({
  content: z.string().trim().min(1).max(1000),
})

export async function addOpportunityComment(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid opportunity id', 400, 'INVALID_ID')
    return
  }

  const parsed = commentBodySchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const result = await OppInteractions.addOpportunityComment(idParsed.data, userId(req), parsed.data.content)
  if (!result) {
    sendError(res, 'Opportunity not found', 404, 'NOT_FOUND')
    return
  }

  logger.info({ userId: userId(req), opportunityId: idParsed.data }, 'Opportunity comment added')
  sendCreated(res, result, 'Comment added')
}

// ─── deleteOpportunityComment ─────────────────────────────────────────────────

export async function deleteOpportunityComment(req: Request, res: Response): Promise<void> {
  const idParsed        = uuidParam.safeParse(req.params.id)
  const commentIdParsed = uuidParam.safeParse(req.params.commentId)
  if (!idParsed.success || !commentIdParsed.success) {
    sendError(res, 'Invalid id', 400, 'INVALID_ID')
    return
  }

  const result = await OppInteractions.deleteOpportunityComment(
    commentIdParsed.data,
    idParsed.data,
    userId(req),
    { allowAdmin: false },
  )

  if (result === 'not_found') {
    sendError(res, 'Comment not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ userId: userId(req), opportunityId: idParsed.data, commentId: commentIdParsed.data }, 'Opportunity comment deleted')
  sendNoContent(res)
}