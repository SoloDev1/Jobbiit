import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  sendSuccess,
  sendError,
} from '../utils/apiResponse'
import * as NotificationModel from '../models/Notification'

const uuidParam = z.string().uuid()

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().positive().max(50).default(20),
})

function userId(req: Request): string {
  return req.user!.id
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { cursor, limit } = parsed.data
  if (cursor && NotificationModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { notifications, nextCursor } = await NotificationModel.getNotifications(
    userId(req),
    cursor,
    limit,
  )

  sendSuccess(res, { notifications, nextCursor }, 'Notifications loaded')
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id)
  if (!parsed.success) {
    sendError(res, 'Invalid notification id', 400, 'INVALID_ID')
    return
  }

  const result = await NotificationModel.markAsRead(parsed.data, userId(req))

  if (result === 'not_found') {
    sendError(res, 'Notification not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  sendSuccess(res, { id: parsed.data }, 'Notification marked as read')
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const count = await NotificationModel.markAllAsRead(userId(req))
  sendSuccess(res, { count }, 'All notifications marked as read')
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const count = await NotificationModel.getUnreadCount(userId(req))
  sendSuccess(res, { count }, 'Unread count')
}
