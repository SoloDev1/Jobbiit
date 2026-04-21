import { z } from 'zod'

export const respondSchema = z
  .object({
    connectionId: z.string().uuid(),
  })
  .strict()

export type RespondInput = z.infer<typeof respondSchema>
