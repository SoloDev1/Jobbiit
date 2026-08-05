import { z } from 'zod';

export const DocumentTypeEnum = z.enum([
  'RESUME',
  'COVER_LETTER',
  'SOP',
  'PERSONAL_STATEMENT',
  'SCHOLARSHIP_ESSAY',
  'MOTIVATION_LETTER',
  'GRANT_PROPOSAL',
  'RECOMMENDATION_LETTER',
  'PROFESSIONAL_EMAIL',
  'LINKEDIN_SUMMARY',
]);

export const GenerateDocumentSchema = z.object({
  documentType: DocumentTypeEnum,
  formData: z.record(z.any()),
  targetOpportunityText: z.string().optional().default(''),
});

export const SectionAiSchema = z.object({
  sectionId: z.string().min(1, 'sectionId is required'),
  action: z.enum(['improve', 'rewrite', 'shorten', 'expand', 'ats_optimize']),
  targetOpportunityText: z.string().optional().default(''),
});

export const RevertAiSchema = z.object({
  sectionId: z.string().min(1, 'sectionId is required'),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().optional(),
  sections: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        content: z.union([z.string(), z.array(z.string())]),
        isHidden: z.boolean().optional(),
      })
    )
    .optional(),
  settings: z.record(z.any()).optional(),
  templateId: z.string().optional(),
});

export type GenerateDocumentInput = z.infer<typeof GenerateDocumentSchema>;
export type SectionAiInput = z.infer<typeof SectionAiSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
