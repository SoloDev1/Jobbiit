import type { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { logger } from '../config/logger'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNoContent,
} from '../utils/apiResponse'
import * as ProfileModel from '../models/Profile'
import * as UploadService from '../services/upload.service'
import type {
  CreateProfileInput,
  UpdateProfileInput,
  AddExperienceInput,
  AddEducationInput,
  AddSkillsInput,
} from '../schemas/profile.schema'

const uuidParam = z.string().uuid()

function userId(req: Request): string {
  return req.user!.id
}

// ─── getProfile ───────────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.userId)
  if (!parsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_USER_ID')
    return
  }

  const profile = await ProfileModel.getProfileByUserId(parsed.data)
  if (!profile) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, profile, 'Profile loaded')
}

// ─── createProfile ────────────────────────────────────────────────────────────

export async function createProfile(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateProfileInput

  const existing = await ProfileModel.getProfileIdByUserId(userId(req))
  if (existing) {
    sendError(res, 'Profile already exists', 409, 'CONFLICT')
    return
  }

  const profile = await ProfileModel.createProfile(userId(req), data)
  logger.info({ userId: userId(req), profileId: profile.id }, 'Profile created')

  sendCreated(res, profile, 'Profile created successfully')
}

// ─── updateProfile ─────────────────────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const data = req.body as UpdateProfileInput

  const profile = await ProfileModel.updateProfile(userId(req), data)
  if (!profile) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  logger.info({ userId: userId(req) }, 'Profile updated')

  sendSuccess(res, profile, 'Profile updated successfully')
}

// ─── addExperience ────────────────────────────────────────────────────────────

export async function addExperience(req: Request, res: Response): Promise<void> {
  const data = req.body as AddExperienceInput

  const profileId = await ProfileModel.getProfileIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const created = await ProfileModel.addExperience(profileId, data)
  sendCreated(res, created, 'Experience added')
}

// ─── deleteExperience ───────────────────────────────────────────────────────────

export async function deleteExperience(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid id', 400, 'INVALID_ID')
    return
  }

  const profileId = await ProfileModel.getProfileIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const ok = await ProfileModel.deleteExperience(parsed.data, profileId)
  if (!ok) {
    sendError(res, 'Experience not found', 404, 'NOT_FOUND')
    return
  }

  sendNoContent(res)
}

// ─── addEducation ─────────────────────────────────────────────────────────────

export async function addEducation(req: Request, res: Response): Promise<void> {
  const data = req.body as AddEducationInput

  const profileId = await ProfileModel.getProfileIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const created = await ProfileModel.addEducation(profileId, data)
  sendCreated(res, created, 'Education added')
}

// ─── deleteEducation ───────────────────────────────────────────────────────────

export async function deleteEducation(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid id', 400, 'INVALID_ID')
    return
  }

  const profileId = await ProfileModel.getProfileIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const ok = await ProfileModel.deleteEducation(parsed.data, profileId)
  if (!ok) {
    sendError(res, 'Education not found', 404, 'NOT_FOUND')
    return
  }

  sendNoContent(res)
}

// ─── addSkills ─────────────────────────────────────────────────────────────────

export async function addSkills(req: Request, res: Response): Promise<void> {
  const { skills } = req.body as AddSkillsInput

  const profileId = await ProfileModel.getProfileIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  await ProfileModel.addSkills(profileId, skills)
  const profile = await ProfileModel.getProfileByUserId(userId(req))
  if (!profile) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }
  sendSuccess(res, profile, 'Skills updated successfully')
}

// ─── uploadAvatar / uploadBanner ───────────────────────────────────────────────

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) {
    sendError(res, 'Image file is required', 400, 'FILE_REQUIRED')
    return
  }

  if (!(await ProfileModel.getProfileIdByUserId(userId(req)))) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const publicId = `${userId(req)}-${randomUUID()}`
  const url = await UploadService.uploadImage(
    file.buffer,
    'opporlink/avatars',
    publicId,
    file.mimetype,
  )

  const updated = await ProfileModel.updateAvatarUrl(userId(req), url)

  logger.info({ userId: userId(req) }, 'Avatar uploaded')

  sendSuccess(res, { avatarUrl: updated.avatarUrl }, 'Avatar updated successfully')
}

export async function uploadBanner(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) {
    sendError(res, 'Image file is required', 400, 'FILE_REQUIRED')
    return
  }

  if (!(await ProfileModel.getProfileIdByUserId(userId(req)))) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const publicId = `${userId(req)}-${randomUUID()}`
  const url = await UploadService.uploadImage(
    file.buffer,
    'opporlink/banners',
    publicId,
    file.mimetype,
  )

  const updated = await ProfileModel.updateBannerUrl(userId(req), url)

  logger.info({ userId: userId(req) }, 'Banner uploaded')

  sendSuccess(res, { bannerUrl: updated.bannerUrl }, 'Banner updated successfully')
}
