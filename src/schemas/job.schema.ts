import { z } from 'zod'
import { JobType } from '@prisma/client'

const jobTypeEnum = z.nativeEnum(JobType)

const jobFields = z.object({
  title:       z.string().trim().min(1).max(200),
  company:     z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  type:        jobTypeEnum,
  location:    z.string().trim().min(1).max(200).optional(),
  isRemote:    z.boolean().default(false),
  salaryMin:   z.number().int().positive().optional(),
  salaryMax:   z.number().int().positive().optional(),
  currency:    z.string().trim().length(3).default('USD'),
})

export const createJobSchema = jobFields
  .strict()
  .refine(
    (d) =>
      d.salaryMin === undefined ||
      d.salaryMax === undefined ||
      d.salaryMax >= d.salaryMin,
    { message: 'salaryMax must be >= salaryMin', path: ['salaryMax'] },
  )

export const updateJobSchema = jobFields.partial().strict()

export const applyJobSchema = z
  .object({
    coverLetter: z.string().trim().max(2000).optional(),
    resumeUrl:   z.union([z.string().trim().url(), z.literal('')]).optional(),
  })
  .strict()

export const jobsQuerySchema = z.object({
  type:     jobTypeEnum.optional(),
  isRemote: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search:   z.string().trim().optional(),
  cursor:   z.string().optional(),
  limit:    z.coerce.number().int().positive().max(50).default(20),
})

export type CreateJobInput = z.infer<typeof createJobSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>
export type ApplyJobInput  = z.infer<typeof applyJobSchema>
export type JobsQuery      = z.infer<typeof jobsQuerySchema>
