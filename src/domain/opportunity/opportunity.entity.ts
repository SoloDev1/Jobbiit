/**
 * OpporHub OS — Opportunity Domain Entity & Requirement Spec
 */

import { z } from 'zod';

export const OpportunityRequirementsSchema = z.object({
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()).default([]),
  minimumYearsExperience: z.number().optional(),
  educationRequirement: z.string().optional(),
  keyPhrases: z.array(z.string()).default([]),
});

export const OpportunityEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  opportunityType: z.enum(['job', 'scholarship', 'grant', 'internship', 'freelance']),
  description: z.string(),
  requirements: OpportunityRequirementsSchema,
  salaryRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().default('USD'),
    })
    .optional(),
  url: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type OpportunityEntity = z.infer<typeof OpportunityEntitySchema>;
