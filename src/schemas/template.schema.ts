import { z } from 'zod';

export const createTemplateSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['cv', 'cover_letter', 'grant', 'scholarship']),
    style: z.string().min(1, 'Style is required'),
    category: z.string().min(1, 'Category is required'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').default('#0066cc'),
    bestFor: z.string().optional(),
    features: z.array(z.string()).default([]),
    prefill: z.any().optional(),
    thumbnailUrl: z.string().url('Must be a valid URL').optional().nullable(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })
  .strict();

export const updateTemplateSchema = createTemplateSchema.partial().strict();

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
