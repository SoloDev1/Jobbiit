import type { Request, Response } from 'express';
import { prisma } from '../../../config/db';
import { logger } from '../../../config/logger';
import { sendCreated, sendError, sendSuccess } from '../../../utils/apiResponse';
import { enhanceContent, analyzeCvScore } from '../services/ai.service';
import { documentQueue } from '../document-generator.queue';
import { CVEnhancedData } from '../document-generator.types';
import { z } from 'zod';

const aiCvCreateSchema = z.object({
  targetRole: z.string().optional(),
  jobDescription: z.string().optional(),
  mode: z.enum(['ATS_OPTIMIZED', 'DESIGN_FOCUSED', 'STARTUP_STYLE', 'INTERNATIONAL']).optional().default('ATS_OPTIMIZED'),
  templateId: z.string().optional().default('default'),
  format: z.enum(['PDF', 'DOCX', 'BOTH']).optional().default('BOTH'),
  customSummary: z.string().optional(),
});

/**
 * POST /api/v1/cv/ai-create (or /api/documents/cv/ai-create)
 * Aggregates user profile + chat context + optional Job Description to generate a tailored CV.
 */
export async function createAiCv(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const validation = aiCvCreateSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', validation.error.flatten().fieldErrors);
    return;
  }

  const { targetRole, jobDescription, mode, templateId, format, customSummary } = validation.data;

  // 1. Fetch user profile with educations, experiences, skills
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          experiences: { orderBy: { startDate: 'desc' } },
          educations: { orderBy: { startDate: 'desc' } },
          skills: { include: { skill: true } },
        },
      },
    },
  });

  if (!user || !user.profile) {
    sendError(res, 'User profile not found. Please complete your profile first.', 400, 'PROFILE_NOT_FOUND');
    return;
  }

  const profile = user.profile;

  // 2. Prepare CV Data Input
  const rawCvData = {
    type: 'cv' as const,
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
    email: user.email || '',
    phone: profile.phone || '',
    location: profile.location || '',
    summary: customSummary || profile.bio || profile.headline || '',
    experience: profile.experiences.map((exp) => ({
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
      endDate: exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present',
      description: exp.description || '',
    })),
    education: profile.educations.map((edu) => ({
      school: edu.school,
      degree: edu.degree || '',
      field: edu.field || '',
      startDate: edu.startDate ? new Date(edu.startDate).getFullYear().toString() : '',
      endDate: edu.endDate ? new Date(edu.endDate).getFullYear().toString() : '',
    })),
    skills: profile.skills.map((s) => s.skill.name),
    jobDescription,
    mode,
    targetRole,
  };

  // 3. AI Enhancement via OpenAI GPT-4o
  const enhancedData = (await enhanceContent('cv', rawCvData)) as CVEnhancedData;

  // 4. Calculate instant CV Score
  const scoreResult = await analyzeCvScore(rawCvData, jobDescription);

  // Determine Version Tag (e.g., "CV v3 - Senior Frontend Engineer")
  const existingCount = await prisma.generatedDocument.count({
    where: { userId, type: 'CV' },
  });
  const versionTag = `CV v${existingCount + 1}${targetRole ? ` - ${targetRole}` : ''}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // 5. Create GeneratedDocument DB Record
  const doc = await prisma.generatedDocument.create({
    data: {
      userId,
      type: 'CV',
      format: format as any,
      status: 'PROCESSING',
      metadata: {
        versionTag,
        targetRole: targetRole || profile.headline || 'Professional',
        mode,
        templateId,
        jobDescriptionSnippet: jobDescription ? jobDescription.slice(0, 150) + '...' : null,
        scoreResult: scoreResult as any,
        cvInputData: rawCvData as any,
        enhancedData: enhancedData as any,
      },
      expiresAt,
    },
  });

  // 6. Push job to BullMQ queue for DOCX/PDF rendering
  const job = await documentQueue.add('generate-document', {
    documentId: doc.id,
    userId,
    type: 'cv',
    format: format.toLowerCase() as any,
    data: {
      ...rawCvData,
      summary: enhancedData?.summary || rawCvData.summary,
      experience: enhancedData?.experience || rawCvData.experience,
      skills: enhancedData?.skills || rawCvData.skills,
      templateId,
    } as any,
  });

  logger.info({ documentId: doc.id, jobId: job.id, userId }, 'AI CV generation job queued successfully in Jobbiit');

  sendCreated(res, {
    jobId: doc.id,
    documentId: doc.id,
    versionTag,
    status: 'queued',
    scoreResult,
    templateId,
    enhancedSummary: enhancedData?.summary,
  }, 'AI CV generation job successfully queued');
}

/**
 * GET /api/v1/cv/versions
 * Gets all CV versions generated by the user.
 */
export async function getCvVersions(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const versions = await prisma.generatedDocument.findMany({
    where: { userId, type: 'CV' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      pdfUrl: true,
      docxUrl: true,
      metadata: true,
      createdAt: true,
    },
  });

  sendSuccess(res, versions, 'User CV versions retrieved');
}

/**
 * POST /api/v1/cv/score
 * Evaluates current user CV data against an optional job description.
 */
export async function scoreCv(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { jobDescription } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          experiences: true,
          educations: true,
          skills: { include: { skill: true } },
        },
      },
    },
  });

  if (!user || !user.profile) {
    sendError(res, 'Profile not found', 404, 'NOT_FOUND');
    return;
  }

  const scoreResult = await analyzeCvScore(user.profile, jobDescription);
  sendSuccess(res, scoreResult, 'CV score evaluated successfully');
}

/**
 * GET /api/v1/cv/share/:id
 * Public endpoint to fetch shareable CV metadata.
 */
export async function getPublicCv(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id },
    select: {
      id: true,
      pdfUrl: true,
      metadata: true,
      createdAt: true,
    },
  });

  if (!doc || !doc.pdfUrl) {
    sendError(res, 'CV document not found or unavailable', 404, 'NOT_FOUND');
    return;
  }

  sendSuccess(res, doc, 'Public CV retrieved');
}
