import type { Request } from 'express'
import { prisma } from '../config/db'
import { Prisma, AuditLogStatus } from '@prisma/client'
import type { AuditAction } from '@prisma/client'
import { logger } from '../config/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogActionOptions {
  /** Override for actorId. If omitted, taken from req.user.id when present. */
  actorId?:     string | null
  targetId?:    string | null
  entityId?:    string | null
  entityType?:  string | null
  metadata?:    Prisma.InputJsonValue
  status?:      AuditLogStatus
  errorMessage?: string | null

  /** Override request context capture (rarely needed). */
  ipAddress?:   string | null
  userAgent?:   string | null
  requestId?:   string | null
  method?:      string | null
  path?:        string | null
}

// ─── Request context extraction ───────────────────────────────────────────────

function extractRequestContext(req: Request | null | undefined): {
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  method:    string | null
  path:      string | null
  actorId:   string | null
} {
  if (!req) {
    return {
      ipAddress: null,
      userAgent: null,
      requestId: null,
      method:    null,
      path:      null,
      actorId:   null,
    }
  }

  const ua = req.get?.('user-agent') ?? null
  const trimmedUa =
    typeof ua === 'string' && ua.length > 500 ? ua.slice(0, 500) : ua

  return {
    ipAddress: req.ip ?? null,
    userAgent: trimmedUa,
    requestId: req.requestId ?? null,
    method:    req.method ?? null,
    path:      req.originalUrl?.split('?')[0] ?? req.path ?? null,
    actorId:   req.user?.id ?? null,
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Legacy positional API kept for existing callers (User.ts, admin.controller.ts).
 * For new code prefer {@link audit}.
 */
export async function logAction(
  actorId: string | null,
  action:  AuditAction,
  opts: LogActionOptions = {},
): Promise<void> {
  await writeAuditLog(null, action, { ...opts, actorId: opts.actorId ?? actorId })
}

/**
 * Preferred entry point. Captures IP, user-agent, request ID, method, path
 * and actor (req.user.id) from the request, with overrides via `opts`.
 *
 * Always safe — never throws; failures are logged so audit issues can't break
 * user-facing requests.
 */
export async function audit(
  req: Request | null | undefined,
  action: AuditAction,
  opts: LogActionOptions = {},
): Promise<void> {
  await writeAuditLog(req ?? null, action, opts)
}

async function writeAuditLog(
  req: Request | null,
  action: AuditAction,
  opts: LogActionOptions,
): Promise<void> {
  const ctx = extractRequestContext(req)

  try {
    await prisma.auditLog.create({
      data: {
        actorId:      opts.actorId      ?? ctx.actorId,
        targetId:     opts.targetId     ?? null,
        action,
        entityId:     opts.entityId     ?? null,
        entityType:   opts.entityType   ?? null,
        metadata:     opts.metadata     ?? Prisma.JsonNull,
        status:       opts.status       ?? AuditLogStatus.SUCCESS,
        errorMessage: opts.errorMessage ?? null,
        ipAddress:    opts.ipAddress    ?? ctx.ipAddress,
        userAgent:    opts.userAgent    ?? ctx.userAgent,
        requestId:    opts.requestId    ?? ctx.requestId,
        method:       opts.method       ?? ctx.method,
        path:         opts.path         ?? ctx.path,
      },
    })
  } catch (err) {
    logger.error(
      { err, action, requestId: ctx.requestId },
      'Failed to write audit log',
    )
  }
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

type UserSummary = {
  email:   string | null
  profile: { firstName: string; lastName: string } | null
} | null

export type AuditLogEntry = {
  id:           string
  actorId:      string | null
  targetId:     string | null
  action:       AuditAction
  entityId:     string | null
  entityType:   string | null
  metadata:     Prisma.JsonValue
  status:       AuditLogStatus
  errorMessage: string | null
  ipAddress:    string | null
  userAgent:    string | null
  requestId:    string | null
  method:       string | null
  path:         string | null
  createdAt:    Date
  actor:        UserSummary
  target:       UserSummary
}

export interface ListAuditLogsFilters {
  actorId?:    string
  action?:     AuditAction
  entityId?:   string
  entityType?: string
  status?:     AuditLogStatus
  from?:       Date
  to?:         Date
  /** Free-text search across requestId, ipAddress, actor.email and errorMessage. */
  search?:     string
}

export async function listAuditLogs(
  cursor:  string | undefined,
  limit:   number,
  filters: ListAuditLogsFilters = {},
): Promise<{ logs: AuditLogEntry[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (cursor) {
    const d = decodeCursor(cursor)
    if (!d) return { logs: [], nextCursor: null }
    cursorDecoded = d
  }

  const { actorId, action, entityId, entityType, status, from, to, search } = filters

  const createdAtRange: Prisma.DateTimeFilter | undefined =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to   ? { lte: to }   : {}),
        }
      : undefined

  const searchClause: Prisma.AuditLogWhereInput | undefined = search
    ? {
        OR: [
          { requestId:    { contains: search, mode: 'insensitive' } },
          { ipAddress:    { contains: search, mode: 'insensitive' } },
          { errorMessage: { contains: search, mode: 'insensitive' } },
          { actor: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }
    : undefined

  const where: Prisma.AuditLogWhereInput = {
    ...(actorId    ? { actorId }    : {}),
    ...(action     ? { action }     : {}),
    ...(entityId   ? { entityId }   : {}),
    ...(entityType ? { entityType } : {}),
    ...(status     ? { status }     : {}),
    ...(createdAtRange ? { createdAt: createdAtRange } : {}),
    ...(searchClause ?? {}),
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

  const userSummary = {
    select: {
      email:   true,
      profile: { select: { firstName: true, lastName: true } },
    },
  } as const

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: {
      actor:  userSummary,
      target: userSummary,
    },
  })

  const hasMore    = rows.length > limit
  const slice      = hasMore ? rows.slice(0, limit) : rows
  const last       = slice[slice.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { logs: slice as AuditLogEntry[], nextCursor }
}
