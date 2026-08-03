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
import { profileRepository } from '../repositories/profile.repository'
import * as UploadService from '../services/upload.service'
import * as CvParserService from '../services/cvParser.service'
import { prisma } from '../config/db'
import { uploadDocument, deleteDocument } from '../modules/document-generator/services/storage.service'
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

// controllers/profile.controller.ts

export async function getProfile(req: Request, res: Response): Promise<void> {
  // If req.params.userId is missing (as it is in the /me route),
  // fallback to the authenticated user's ID.
  const idToFetch = req.params.userId || req.user?.id;

  if (!idToFetch) {
    sendError(res, 'User identity not found', 400, 'MISSING_ID');
    return;
  }

  const parsed = uuidParam.safeParse(idToFetch);
  if (!parsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_USER_ID');
    return;
  }

  const profile = await profileRepository.findByUserId(parsed.data);
  if (!profile) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND');
    return;
  }

  sendSuccess(res, profile, 'Profile loaded');
}

// ─── createProfile ────────────────────────────────────────────────────────────

export async function createProfile(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateProfileInput

  const existing = await profileRepository.findIdByUserId(userId(req))
  if (existing) {
    sendError(res, 'Profile already exists', 409, 'CONFLICT')
    return
  }

  const profile = await profileRepository.create(userId(req), data)
  logger.info({ userId: userId(req), profileId: profile.id }, 'Profile created')

  sendCreated(res, profile, 'Profile created successfully')
}

// ─── updateProfile ─────────────────────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const data = req.body as UpdateProfileInput

  const profile = await profileRepository.update(userId(req), data)
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

  const profileId = await profileRepository.findIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const created = await profileRepository.addExperience(profileId, data)
  sendCreated(res, created, 'Experience added')
}

// ─── deleteExperience ───────────────────────────────────────────────────────────

export async function deleteExperience(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid id', 400, 'INVALID_ID')
    return
  }

  const profileId = await profileRepository.findIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const ok = await profileRepository.deleteExperience(parsed.data, profileId)
  if (!ok) {
    sendError(res, 'Experience not found', 404, 'NOT_FOUND')
    return
  }

  sendNoContent(res)
}

// ─── addEducation ─────────────────────────────────────────────────────────────

export async function addEducation(req: Request, res: Response): Promise<void> {
  try {
    const profileId = await profileRepository.findIdByUserId(userId(req))
    if (!profileId) {
      sendError(res, 'Profile not found', 404, 'NOT_FOUND')
      return
    }

    const created = await profileRepository.addEducation(profileId, req.body as AddEducationInput)
    sendCreated(res, created, 'Education added')
  } catch (err) {
    sendError(res, 'Failed to add education', 500, 'INTERNAL_ERROR')
  }
}

// ─── deleteEducation ───────────────────────────────────────────────────────────

export async function deleteEducation(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid id', 400, 'INVALID_ID')
    return
  }

  const profileId = await profileRepository.findIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  const ok = await profileRepository.deleteEducation(parsed.data, profileId)
  if (!ok) {
    sendError(res, 'Education not found', 404, 'NOT_FOUND')
    return
  }

  sendNoContent(res)
}

// ─── addSkills ─────────────────────────────────────────────────────────────────

export async function addSkills(req: Request, res: Response): Promise<void> {
  const { skills } = req.body as AddSkillsInput

  const profileId = await profileRepository.findIdByUserId(userId(req))
  if (!profileId) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND')
    return
  }

  await profileRepository.setSkills(profileId, skills)
  const profile = await profileRepository.findByUserId(userId(req))
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

  if (!(await profileRepository.findIdByUserId(userId(req)))) {
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

  const updated = await profileRepository.updateAvatarUrl(userId(req), url)

  logger.info({ userId: userId(req) }, 'Avatar uploaded')

  sendSuccess(res, { avatarUrl: updated.avatarUrl }, 'Avatar updated successfully')
}

export async function uploadBanner(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) {
    sendError(res, 'Image file is required', 400, 'FILE_REQUIRED')
    return
  }

  if (!(await profileRepository.findIdByUserId(userId(req)))) {
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

  const updated = await profileRepository.updateBannerUrl(userId(req), url)

  logger.info({ userId: userId(req) }, 'Banner uploaded')

  sendSuccess(res, { bannerUrl: updated.bannerUrl }, 'Banner updated successfully')
}

// ─── uploadAndParseCv ───────────────────────────────────────────────────────────

export async function uploadAndParseCv(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) {
    sendError(res, 'No CV file uploaded', 400, 'FILE_REQUIRED')
    return
  }

  try {
    // 1. Extract raw text locally using mammoth / pdf-parse
    const rawText = await CvParserService.extractTextFromBuffer(file.buffer, file.mimetype)

    // Sanity check on the text content size
    if (rawText.trim().length < 200) {
      sendError(res, 'Extracted text is too short. Please upload a structured PDF or Word document', 400, 'TEXT_TOO_SHORT')
      return
    }

    // Delete existing CV from R2 if one was previously uploaded
    const existing = await prisma.profile.findUnique({
      where: { userId: userId(req) },
      select: { cvKey: true },
    })
    if (existing?.cvKey) {
      try {
        await deleteDocument(existing.cvKey)
      } catch (delErr) {
        logger.error({ delErr, cvKey: existing.cvKey }, 'Failed to delete old CV from R2')
      }
    }

    // 2. Upload original CV to Cloudflare R2
    const fileExt = file.originalname.split('.').pop() || 'pdf'
    const cvKey = `cvs/${userId(req)}-${randomUUID()}.${fileExt}`
    const cvUrl = await uploadDocument(file.buffer, cvKey, file.mimetype)

    // 3. Save CV info to Profile
    await profileRepository.updateCv(userId(req), cvUrl, cvKey, file.originalname, rawText)

    // 4. Format with OpenAI structured output
    const structuredData = await CvParserService.parseResumeText(rawText)

    // 5. Return JSON response to client (including cvUrl & cvName)
    sendSuccess(
      res,
      {
        ...structuredData,
        cvUrl,
        cvName: file.originalname,
      },
      'CV parsed and saved successfully',
    )
  } catch (err: any) {
    logger.error({ err, userId: userId(req) }, 'CV parsing failed')
    sendError(res, err.message || 'Error processing CV file', 500, 'PARSING_ERROR')
  }
}
