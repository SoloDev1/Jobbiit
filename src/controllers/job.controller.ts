import type { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNoContent,
} from '../utils/apiResponse'
import * as JobModel from '../models/Job'
import {
  jobsQuerySchema,
  type CreateJobInput,
  type UpdateJobInput,
  type ApplyJobInput,
} from '../schemas/job.schema'

const uuidParam = z.string().uuid()

function userId(req: Request): string {
  return req.user!.id
}

// ─── getJobs ──────────────────────────────────────────────────────────────────

export async function getJobs(req: Request, res: Response): Promise<void> {
  const parsed = jobsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { type, isRemote, search, cursor, limit } = parsed.data
  if (cursor && JobModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { jobs, nextCursor } = await JobModel.getJobs(userId(req), {
    type,
    isRemote,
    search,
    cursor,
    limit,
  })

  sendSuccess(res, { jobs, nextCursor }, 'Jobs loaded')
}

// ─── createJob ────────────────────────────────────────────────────────────────

export async function createJob(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateJobInput

  const job = await JobModel.createJob(userId(req), data)
  logger.info({ userId: userId(req), jobId: job.id }, 'Job created')

  sendCreated(res, job, 'Job created')
}

// ─── getJobById ───────────────────────────────────────────────────────────────

export async function getJobById(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid job id', 400, 'INVALID_ID')
    return
  }

  const job = await JobModel.getJobById(parsed.data, userId(req))
  if (!job) {
    sendError(res, 'Job not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, job, 'Job loaded')
}

// ─── updateJob ────────────────────────────────────────────────────────────────

export async function updateJob(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid job id', 400, 'INVALID_ID')
    return
  }

  const data = req.body as UpdateJobInput
  const result = await JobModel.updateJob(parsed.data, userId(req), data)

  if (result === null) {
    sendError(res, 'Job not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ userId: userId(req), jobId: parsed.data }, 'Job updated')
  sendSuccess(res, result, 'Job updated')
}

// ─── closeJob ─────────────────────────────────────────────────────────────────

export async function closeJob(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid job id', 400, 'INVALID_ID')
    return
  }

  const result = await JobModel.closeJob(parsed.data, userId(req))

  if (result === 'not_found') {
    sendError(res, 'Job not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ userId: userId(req), jobId: parsed.data }, 'Job closed')
  sendNoContent(res)
}

// ─── applyToJob ───────────────────────────────────────────────────────────────

export async function applyToJob(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid job id', 400, 'INVALID_ID')
    return
  }

  const data   = req.body as ApplyJobInput
  const result = await JobModel.applyToJob(parsed.data, userId(req), data)

  if (result === 'not_found') {
    sendError(res, 'Job not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'closed') {
    sendError(res, 'Job is no longer accepting applications', 409, 'JOB_CLOSED')
    return
  }
  if (result === 'duplicate') {
    sendError(res, 'Already applied to this job', 409, 'ALREADY_APPLIED')
    return
  }

  logger.info({ userId: userId(req), jobId: parsed.data }, 'Job application submitted')
  sendCreated(res, result, 'Application submitted')
}

// ─── getApplications ──────────────────────────────────────────────────────────

export async function getApplications(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid job id', 400, 'INVALID_ID')
    return
  }

  const result = await JobModel.getApplications(parsed.data, userId(req))

  if (result === 'not_found') {
    sendError(res, 'Job not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  sendSuccess(res, result, 'Applications loaded')
}

// ─── toggleSaveJob ────────────────────────────────────────────────────────────

export async function toggleSaveJob(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid job id', 400, 'INVALID_ID')
    return
  }

  const result = await JobModel.toggleSaveJob(userId(req), parsed.data)

  if (result === 'not_found') {
    sendError(res, 'Job not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, result, result.saved ? 'Job saved' : 'Job unsaved')
}

// ─── getSavedJobs ─────────────────────────────────────────────────────────────

export async function getSavedJobs(req: Request, res: Response): Promise<void> {
  const saved = await JobModel.getSavedJobs(userId(req))
  sendSuccess(res, saved, 'Saved jobs loaded')
}
