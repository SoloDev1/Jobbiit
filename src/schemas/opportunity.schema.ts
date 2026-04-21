import { z } from 'zod'
import { OpportunityCategory } from '@prisma/client'

const categoryEnum = z.nativeEnum(OpportunityCategory)

const opportunityFields = z.object({
  title:          z.string().trim().min(1).max(300),
  organisation:   z.string().trim().min(1).max(200),
  description:    z.string().trim().min(1).max(10_000),
  category:       categoryEnum,
  deadline:       z.coerce.date(),
  isRemote:       z.boolean().default(false),
  applicationUrl: z.string().trim().url(),
  logoUrl:        z.string().trim().url().optional(),
  location:       z.string().trim().max(200).optional(),
})

export const createOpportunitySchema = opportunityFields.strict()

export const updateOpportunitySchema = opportunityFields.partial().strict()

export const applyOpportunitySchema = z
  .object({
    coverNote: z.string().trim().max(2000).optional(),
  })
  .strict()

export const rejectOpportunitySchema = z
  .object({
    reason: z.string().trim().min(1),
  })
  .strict()

export const opportunitiesQuerySchema = z.object({
  category: categoryEnum.optional(),
  isRemote: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search:   z.string().trim().optional(),
  cursor:   z.string().optional(),
  limit:    z.coerce.number().int().positive().max(50).default(20),
})

export type CreateOpportunityInput   = z.infer<typeof createOpportunitySchema>
export type UpdateOpportunityInput   = z.infer<typeof updateOpportunitySchema>
export type ApplyOpportunityInput    = z.infer<typeof applyOpportunitySchema>
export type RejectOpportunityInput   = z.infer<typeof rejectOpportunitySchema>
export type OpportunitiesQuery       = z.infer<typeof opportunitiesQuerySchema>
