import { z } from 'zod'
import { Role, AuditAction } from '@prisma/client'

// ─── Push / in-app ────────────────────────────────────────────────────────────

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

/**
 * Admin-created in-app notifications (stored in DB) with optional push fan-out.
 * Note: DB Notification only stores `message`, so we embed title + body there.
 */
export const adminInAppNotificationSchema = z
  .object({
    title:      z.string().trim().min(1).max(120),
    body:       z.string().trim().min(1).max(500),
    userIds:    z.array(z.string().uuid()).min(1).max(500),
    sendPush:   z.boolean().optional().default(false),
    entityId:   z.string().optional(),
  })
  .strict()

export type AdminInAppNotificationInput = z.infer<typeof adminInAppNotificationSchema>

// ─── User management ──────────────────────────────────────────────────────────

export const banUserSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict()

export type BanUserInput = z.infer<typeof banUserSchema>

export const changeRoleSchema = z
  .object({
    role: z.nativeEnum(Role),
  })
  .strict()

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>

export const adminListUsersQuerySchema = z.object({
  cursor:   z.string().optional(),
  limit:    z.coerce.number().int().positive().max(100).default(20),
  search:   z.string().trim().optional(),
  role:     z.nativeEnum(Role).optional(),
  isBanned: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>

// ─── Post management ──────────────────────────────────────────────────────────

export const adminListPostsQuerySchema = z.object({
  cursor:         z.string().optional(),
  limit:          z.coerce.number().int().positive().max(100).default(20),
  includeDeleted: z.enum(['true', 'false']).transform((v) => v === 'true').default(true),
})

export type AdminListPostsQuery = z.infer<typeof adminListPostsQuerySchema>

export const adminCreatePostSchema = z
  .object({
    content:   z.string().trim().min(1).max(3000),
    mediaUrls: z.array(z.string().url()).max(4).optional(),
    authorId:  z.string().uuid().optional(),
  })
  .strict()

export type AdminCreatePostInput = z.infer<typeof adminCreatePostSchema>

// ─── Audit logs ───────────────────────────────────────────────────────────────

export const adminListAuditLogsQuerySchema = z.object({
  cursor:  z.string().optional(),
  limit:   z.coerce.number().int().positive().max(100).default(20),
  actorId: z.string().uuid().optional(),
  action:  z.nativeEnum(AuditAction).optional(),
})

export type AdminListAuditLogsQuery = z.infer<typeof adminListAuditLogsQuerySchema>
