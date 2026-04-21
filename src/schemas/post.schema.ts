import { z } from 'zod'

export const createPostSchema = z
  .object({
    content: z.string().trim().min(1).max(3000),
    mediaUrls: z.array(z.string().url()).max(4).optional(),
  })
  .strict()

export const createCommentSchema = z
  .object({
    content: z.string().trim().min(1).max(1000),
  })
  .strict()

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().positive().max(50).default(20),
})

export type CreatePostInput    = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type FeedQuery          = z.infer<typeof feedQuerySchema>
