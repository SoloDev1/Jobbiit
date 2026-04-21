import { z } from 'zod'

export const createProfileSchema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName:  z.string().trim().min(1),
    headline:  z.string().trim().min(1),
    bio:       z.string().trim().optional(),
    location:  z.string().trim().optional(),
    website:   z.union([z.string().trim().url(), z.literal('')]).optional(),
  })
  .strict()

export const updateProfileSchema = createProfileSchema.partial().strict()

export const addExperienceSchema = z
  .object({
    title:       z.string().trim().min(1),
    company:     z.string().trim().min(1),
    startDate:   z.coerce.date(),
    endDate: z.preprocess(
      (v) => (v === null || v === '' ? undefined : v),
      z.coerce.date().optional(),
    ),
    current:     z.boolean(),
    description: z.string().trim().optional(),
  })
  .strict()
  .refine(
    (d) => (d.current ? d.endDate === undefined : d.endDate !== undefined),
    {
      message:
        'When current is true, endDate must be omitted; when false, endDate is required',
      path: ['endDate'],
    },
  )

export const addEducationSchema = z
  .object({
    institution: z.string().trim().min(1),
    degree:      z.string().trim().min(1),
    field:       z.string().trim().min(1),
    startYear:   z.number().int().min(1900).max(2100),
    endYear:     z.number().int().min(1900).max(2100).optional(),
  })
  .strict()
  .refine(
    (d) => d.endYear === undefined || d.endYear >= d.startYear,
    { message: 'endYear must be >= startYear', path: ['endYear'] },
  )

export const addSkillsSchema = z
  .object({
    skills: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(20),
  })
  .strict()

export type CreateProfileInput  = z.infer<typeof createProfileSchema>
export type UpdateProfileInput  = z.infer<typeof updateProfileSchema>
export type AddExperienceInput  = z.infer<typeof addExperienceSchema>
export type AddEducationInput   = z.infer<typeof addEducationSchema>
export type AddSkillsInput      = z.infer<typeof addSkillsSchema>
