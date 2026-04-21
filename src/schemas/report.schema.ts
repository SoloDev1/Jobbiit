import { z } from 'zod'
import { ReportType } from '@prisma/client'

const reportTypeSchema = z.nativeEnum(ReportType)

export const createReportSchema = z
  .object({
    type:     reportTypeSchema,
    targetId: z.string().uuid(),
    reason:   z.string().trim().min(10).max(500),
    details:  z.string().trim().max(2000).optional(),
  })
  .strict()

export const resolveReportSchema = z
  .object({
    action: z.string().trim().min(1),
  })
  .strict()

export const pendingReportsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().positive().max(50).default(20),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
export type ResolveReportInput = z.infer<typeof resolveReportSchema>
