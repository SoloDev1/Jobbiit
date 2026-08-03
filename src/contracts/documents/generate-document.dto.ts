/**
 * OpporHub OS — Shared Document Generation DTO Contract
 * Single source of truth for document generation request and response payloads.
 */

import { z } from 'zod';
import { DocumentDomainEntitySchema } from '../../domain/document/document.entity';

export const GenerateDocumentRequestSchema = z.object({
  userId: z.string(),
  docType: z.string(),
  userPrompt: z.string(),
  opportunityId: z.string().optional(),
  existingDocumentJson: z.any().optional(),
});

export type GenerateDocumentRequestDto = z.infer<typeof GenerateDocumentRequestSchema>;

export const GenerateDocumentResponseSchema = z.object({
  document: DocumentDomainEntitySchema,
  atsMatch: z.object({
    overallScore: z.number(),
    keywordScore: z.number(),
    skillCoverageScore: z.number(),
    actionVerbScore: z.number(),
    matchedKeywords: z.array(z.string()),
    missingKeywords: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  savedDocId: z.string().optional(),
});

export type GenerateDocumentResponseDto = z.infer<typeof GenerateDocumentResponseSchema>;
