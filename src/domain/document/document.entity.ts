/**
 * OpporHub OS — Universal Document Domain Entity (v1, v2)
 * Schema contract for Resumes, Cover Letters, SOPs, Grants, and Scholarships.
 */

import { z } from 'zod';

export const StylingSchema = z.object({
  primaryColor: z.string().default('#ea580c'), // OpporLink Brand Orange
  accentColor: z.string().default('#f97316'),  // Warm Orange Highlight
  fontFamily: z.string().default('Inter'),
  headerStyle: z.enum(['banner', 'clean', 'compact']).default('banner'),
});

export const WorkExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()),
});

export const EducationSchema = z.object({
  school: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
});

export const PersonalDetailsSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
});

export const HealthScoreSchema = z.object({
  overallScore: z.number().min(0).max(100),
  formattingScore: z.number().min(0).max(100),
  impactScore: z.number().min(0).max(100),
  atsMatchScore: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
});

export const DocumentDomainEntitySchema = z.object({
  schemaVersion: z.enum(['v1', 'v2']).default('v2'),
  id: z.string(),
  userId: z.string(),
  opportunityId: z.string().optional(),
  docType: z.enum(['cv', 'cover_letter', 'sop', 'grant', 'scholarship', 'visa', 'portfolio']),
  title: z.string(),
  templateId: z.enum(['apple', 'minimal', 'executive', 'corporate', 'creative', 'academic', 'ats']).default('apple'),
  styling: StylingSchema,
  content: z.object({
    personal: PersonalDetailsSchema,
    summary: z.string().optional(),
    experience: z.array(WorkExperienceSchema).default([]),
    education: z.array(EducationSchema).default([]),
    skills: z.array(z.string()).default([]),
    projects: z.array(ProjectSchema).default([]),
    certifications: z.array(z.string()).default([]),
  }),
  healthScore: HealthScoreSchema.optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DocumentDomainEntity = z.infer<typeof DocumentDomainEntitySchema>;
