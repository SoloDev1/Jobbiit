import { prisma } from '../config/db'
import { Prisma } from '@prisma/client'
import type { AuditAction } from '@prisma/client'

// ─── Write ────────────────────────────────────────────────────────────────────

export async function logAction(
  actorId: string,
  action:  AuditAction,
  opts: {
    targetId?:   string
    entityId?:   string
    entityType?: string
    metadata?:   Prisma.InputJsonValue
  } = {},
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetId:   opts.targetId   ?? null,
      entityId:   opts.entityId   ?? null,
      entityType: opts.entityType ?? null,
      metadata:   opts.metadata   ?? Prisma.JsonNull,
    },
  })
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

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

// ─── Read ─────────────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id:         string
  actorId:    string
  targetId:   string | null
  action:     AuditAction
  entityId:   string | null
  entityType: string | null
  metadata:   Prisma.JsonValue
  createdAt:  Date
  actor: {
    email:   string
    profile: { firstName: string; lastName: string } | null
  }
}

export async function listAuditLogs(
  cursor?:  string,
  limit:    number = 20,
  actorId?: string,
  action?:  AuditAction,
): Promise<{ logs: AuditLogEntry[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (cursor) {
    const d = decodeCursor(cursor)
    if (!d) return { logs: [], nextCursor: null }
    cursorDecoded = d
  }

  const where: Prisma.AuditLogWhereInput = {
    ...(actorId ? { actorId } : {}),
    ...(action  ? { action }  : {}),
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

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: {
      actor: {
        select: {
          email:   true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  const hasMore    = rows.length > limit
  const slice      = hasMore ? rows.slice(0, limit) : rows
  const last       = slice[slice.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { logs: slice as AuditLogEntry[], nextCursor }
}
