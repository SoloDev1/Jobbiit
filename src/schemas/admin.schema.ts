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
