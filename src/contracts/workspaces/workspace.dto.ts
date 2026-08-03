/**
 * OpporHub OS — Shared Workspace DTO Contract
 * Single source of truth for complete Workspace payload returned to UI clients.
 */

import { z } from 'zod';
import { DocumentDomainEntitySchema } from '../../domain/document/document.entity';

export const WorkspaceLifecycleStatusSchema = z.enum([
  'DRAFT',
  'ANALYZING',
  'READY',
  'EDITING',
  'TAILORING',
  'REVIEWING',
  'SUBMITTED',
  'ARCHIVED',
]);

export type WorkspaceLifecycleStatus = z.infer<typeof WorkspaceLifecycleStatusSchema>;

export const WorkspaceDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  status: WorkspaceLifecycleStatusSchema,
  opportunity: z.any().nullable(),
  intelligence: z.object({
    matchScore: z.number(),
    skillGap: z.object({
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      skillCoveragePercent: z.number(),
      learningRoadmap: z.array(z.string()),
    }),
    resumeHealthScore: z.number(),
    estimatedSuccessRate: z.number(),
    recommendedActions: z.array(z.string()),
  }).nullable(),
  preferences: z.object({
    preferredTemplate: z.string(),
    preferredAccentColor: z.string(),
    preferredJobType: z.string(),
  }),
  documents: z.array(DocumentDomainEntitySchema),
  timeline: z.array(z.object({
    id: z.string(),
    title: z.string(),
    timestamp: z.date(),
  })),
  activity: z.array(z.object({
    id: z.string(),
    description: z.string(),
    timestamp: z.date(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WorkspaceDto = z.infer<typeof WorkspaceDtoSchema>;
