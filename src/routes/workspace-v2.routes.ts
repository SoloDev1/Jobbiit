/**
 * OpporHub OS — Workspace V2 Express Routes
 * Mounted at /api/v2/workspaces/*
 */

import { Router } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validate } from '../middleware/validate';
import {
  createWorkspaceV2,
  getWorkspaceV2,
  listWorkspacesV2,
  generateWorkspaceDocumentV2,
} from '../controllers/workspace-v2.controller';

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

const createWorkspaceSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  rawOpportunityText: z.string().optional(),
});

const generateWorkspaceDocumentSchema = z.object({
  docType: z.enum(['cv', 'cover_letter', 'sop', 'grant', 'scholarship', 'visa', 'portfolio']),
  userPrompt: z.string().optional(),
  templateId: z.enum(['apple', 'minimal', 'executive', 'corporate', 'creative', 'academic', 'ats']).optional(),
});

router.post('/', validate(createWorkspaceSchema), createWorkspaceV2);
router.get('/', listWorkspacesV2);
router.get('/:id', getWorkspaceV2);
router.post('/:id/generate', docGenerationLimiter, validate(generateWorkspaceDocumentSchema), generateWorkspaceDocumentV2);

export default router;
