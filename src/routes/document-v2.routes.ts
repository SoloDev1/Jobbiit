/**
 * OpporHub OS — Resource-Oriented Document V2 Express Routes
 * Mounted at /api/v2/documents/*
 */

import { Router } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validate } from '../middleware/validate';
import {
  createDocumentV2,
  editDocumentSectionV2,
  switchTemplateV2,
  tailorDocumentV2,
  getDocumentV2,
  listDocumentsV2,
  exportDocumentV2,
} from '../controllers/document-v2.controller';

const router = Router();

const docGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip ?? '') || '',
  message: {
    success: false,
    message: 'Rate limit exceeded. You can only generate 5 documents per hour.',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const createDocumentSchema = z.object({
  userId: z.string().optional(),
  docType: z.enum(['cv', 'cover_letter', 'sop', 'grant', 'scholarship', 'visa', 'portfolio']),
  userPrompt: z.string().optional(),
  opportunityId: z.string().optional(),
});

const editDocumentSectionSchema = z.object({
  userId: z.string().optional(),
  sectionKey: z.enum(['personal', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications']),
  sectionData: z.any(),
  aiAction: z.enum(['improve', 'shorten', 'expand', 'ats_optimize']).optional(),
});

const switchTemplateSchema = z.object({
  templateId: z.enum(['apple', 'minimal', 'executive', 'corporate', 'creative', 'academic', 'ats']),
});

const tailorDocumentSchema = z.object({
  userId: z.string().optional(),
  opportunityId: z.string().min(1, 'Opportunity ID is required'),
});

const exportDocumentSchema = z.object({
  format: z.enum(['pdf', 'json']).default('json'),
});

router.post('/', docGenerationLimiter, validate(createDocumentSchema), createDocumentV2);
router.get('/', listDocumentsV2);
router.get('/:id', getDocumentV2);
router.patch('/:id/sections', validate(editDocumentSectionSchema), editDocumentSectionV2);
router.post('/:id/template', validate(switchTemplateSchema), switchTemplateV2);
router.post('/:id/tailor', docGenerationLimiter, validate(tailorDocumentSchema), tailorDocumentV2);
router.post('/:id/export', validate(exportDocumentSchema), exportDocumentV2);

export default router;
