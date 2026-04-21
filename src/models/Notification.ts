import { prisma } from '../config/db'
import type { Notification, NotificationType } from '@prisma/client'
import type { Prisma } from '@prisma/client'

export type { Notification }

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const sep = raw.indexOf('|')
    if (sep <= 0) return null
    const t  = raw.slice(0, sep)
    const id = raw.slice(sep + 1)
    if (!id) return null
    const createdAt = new Date(t)
    if (Number.isNaN(createdAt.getTime())) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

export async function createNotification(
  recipientId: string,
  type:        NotificationType,
  message:     string | null | undefined,
  entityId?:   string,
  triggerId?:  string,
): Promise<{ id: string }> {
  const row = await prisma.notification.create({
    data: {
      recipientId,
      type,
      message:   message ?? null,
      entityId:  entityId ?? null,
      triggerId: triggerId ?? null,
    },
    select: { id: true },
  })
  return row
}

export async function getNotifications(
  recipientId: string,
  cursor?:     string,
  limit = 20,
): Promise<{ notifications: Notification[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (cursor) {
    const d = decodeCursor(cursor)
    if (!d) return { notifications: [], nextCursor: null }
    cursorDecoded = d
  }

  const where: Prisma.NotificationWhereInput = {
    recipientId,
    ...(cursorDecoded
      ? {
          OR: [
            { createdAt: { lt: cursorDecoded.createdAt } },
            {
              AND: [
                { createdAt: cursorDecoded.createdAt },
                { id: { lt: cursorDecoded.id } },
              ],
            },
          ],
        }
      : {}),
  }

  const rows = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  })

  const hasMore = rows.length > limit
  const slice   = hasMore ? rows.slice(0, limit) : rows
  const last    = slice[slice.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { notifications: slice, nextCursor }
}

export async function markAsRead(
  notificationId: string,
  recipientId:    string,
): Promise<'updated' | 'not_found' | 'forbidden'> {
  const n = await prisma.notification.findUnique({
    where:  { id: notificationId },
    select: { recipientId: true },
  })
  if (!n) return 'not_found'
  if (n.recipientId !== recipientId) return 'forbidden'

  await prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true },
  })
  return 'updated'
}

export async function markAllAsRead(recipientId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { recipientId, isRead: false },
    data:  { isRead: true },
  })
  return result.count
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId, isRead: false },
  })
}
