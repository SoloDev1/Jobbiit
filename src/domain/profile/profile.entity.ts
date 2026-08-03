/**
 * OpporHub OS — Profile Domain Entity & Skill Graph Value Object
 */

import { z } from 'zod';
import { EducationSchema, PersonalDetailsSchema, WorkExperienceSchema } from '../document/document.entity';

export const SkillProficiencySchema = z.object({
  name: z.string(),
  category: z.string().default('general'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  verified: z.boolean().default(false),
});

export const ProfileEntitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  personal: PersonalDetailsSchema,
  headline: z.string().optional(),
  bio: z.string().optional(),
  skillsGraph: z.array(SkillProficiencySchema).default([]),
  experience: z.array(WorkExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  targetRoles: z.array(z.string()).default([]),
  targetIndustries: z.array(z.string()).default([]),
  preferences: z
    .object({
      preferredTemplate: z.string().default('apple'),
      preferredAccentColor: z.string().default('#ea580c'),
      language: z.string().default('en'),
    })
    .default({}),
  updatedAt: z.date().default(() => new Date()),
});

export type ProfileEntity = z.infer<typeof ProfileEntitySchema>;
