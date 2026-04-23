import { z } from 'zod'

/** Admin-initiated Expo push to a bounded list of user IDs (must have registered a device token). */
export const adminManualPushSchema = z
  .object({
    title:   z.string().trim().min(1).max(120),
    body:    z.string().trim().min(1).max(500),
    userIds: z.array(z.string().uuid()).min(1).max(500),
    data:    z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type AdminManualPushInput = z.infer<typeof adminManualPushSchema>
