import type { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/apiResponse'
import * as ReportModel from '../models/Report'
import * as UserModel from '../models/User'
import * as PostModel from '../models/Post'
import * as AuditLogModel from '../models/AuditLog'
import {
  pendingReportsQuerySchema,
  type ResolveReportInput,
} from '../schemas/report.schema'
import type {
  AdminManualPushInput,
  AdminInAppNotificationInput,
  BanUserInput,
  ChangeRoleInput,
  AdminListUsersQuery,
  AdminListPostsQuery,
  AdminCreatePostInput,
  AdminListAuditLogsQuery,
} from '../schemas/admin.schema'
import {
  adminListUsersQuerySchema,
  adminListPostsQuerySchema,
  adminListAuditLogsQuerySchema,
} from '../schemas/admin.schema'
import * as PushService from '../services/push.service'
import * as NotificationModel from '../models/Notification'

const uuidParam = z.string().uuid()

function actorId(req: Request): string {
  return req.user!.id
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(_req: Request, res: Response): Promise<void> {
  const stats = await ReportModel.getAdminStats()
  sendSuccess(res, stats, 'Stats')
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getPendingReports(req: Request, res: Response): Promise<void> {
  const parsed = pendingReportsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { cursor, limit } = parsed.data
  if (cursor && ReportModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { reports, nextCursor } = await ReportModel.getPendingReports(cursor, limit)
  sendSuccess(res, { reports, nextCursor }, 'Pending reports')
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid report id', 400, 'INVALID_ID')
    return
  }

  const { action } = req.body as ResolveReportInput
  const result = await ReportModel.resolveReport(idParsed.data, actorId(req), action)

  if (result === 'not_found') {
    sendError(res, 'Report not found or already handled', 404, 'NOT_FOUND')
    return
  }

  logger.info({ reportId: idParsed.data, resolverId: actorId(req) }, 'Report resolved')
  sendSuccess(res, { id: idParsed.data }, 'Report resolved')
}

export async function dismissReport(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid report id', 400, 'INVALID_ID')
    return
  }

  const result = await ReportModel.dismissReport(idParsed.data, actorId(req))

  if (result === 'not_found') {
    sendError(res, 'Report not found or already handled', 404, 'NOT_FOUND')
    return
  }

  logger.info({ reportId: idParsed.data, resolverId: actorId(req) }, 'Report dismissed')
  sendSuccess(res, { id: idParsed.data }, 'Report dismissed')
}

// ─── Push / in-app notifications ─────────────────────────────────────────────

export async function sendManualPush(req: Request, res: Response): Promise<void> {
  const { title, body, userIds, data } = req.body as AdminManualPushInput

  await PushService.sendPushToUsers(userIds, title, body, data)

  logger.info(
    { actorId: actorId(req), recipientCount: userIds.length, title },
    'Admin manual push dispatched',
  )

  sendSuccess(
    res,
    { recipientUserCount: userIds.length },
    'Push sent to registered devices for the given users',
  )
}

export async function sendInAppNotification(req: Request, res: Response): Promise<void> {
  const { title, body, userIds, sendPush, entityId } = req.body as AdminInAppNotificationInput

  const message = `${title}\n\n${body}`.trim()

  const created = await Promise.all(
    userIds.map((recipientId) =>
      NotificationModel.createNotification(
        recipientId,
        'SYSTEM',
        message,
        entityId,
        actorId(req),
      ),
    ),
  )

  if (sendPush) {
    await PushService.sendPushToUsers(userIds, title, body, {
      kind: 'SYSTEM',
      entityId: entityId ?? null,
    })
  }

  logger.info(
    { actorId: actorId(req), recipientCount: userIds.length, sendPush: !!sendPush, entityId },
    'Admin in-app notification dispatched',
  )

  sendSuccess(
    res,
    { recipientUserCount: userIds.length, notificationIds: created.map((c) => c.id) },
    'In-app notifications created',
  )
}

// ─── User management ──────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<void> {
  const parsed = adminListUsersQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { cursor, limit, search, role, isBanned } = parsed.data as AdminListUsersQuery

  const { users, nextCursor, total } = await UserModel.listUsers(
    cursor,
    limit,
    search,
    role,
    isBanned,
  )

  sendSuccess(res, { users, nextCursor, total }, 'Users')
}

export async function getUserDetail(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_ID')
    return
  }

  const user = await UserModel.getUserDetail(idParsed.data)
  if (!user) {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, user, 'User detail')
}

export async function banUser(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_ID')
    return
  }

  const { reason } = req.body as BanUserInput

  if (idParsed.data === actorId(req)) {
    sendError(res, 'Cannot ban yourself', 400, 'SELF_BAN')
    return
  }

  const result = await UserModel.banUser(idParsed.data, reason, actorId(req))

  if (result === 'not_found') {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'already_banned') {
    sendError(res, 'User is already banned', 409, 'ALREADY_BANNED')
    return
  }

  logger.info({ targetId: idParsed.data, actorId: actorId(req), reason }, 'User banned')
  sendSuccess(res, { id: idParsed.data }, 'User banned')
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_ID')
    return
  }

  const result = await UserModel.unbanUser(idParsed.data, actorId(req))

  if (result === 'not_found') {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'not_banned') {
    sendError(res, 'User is not banned', 409, 'NOT_BANNED')
    return
  }

  logger.info({ targetId: idParsed.data, actorId: actorId(req) }, 'User unbanned')
  sendSuccess(res, { id: idParsed.data }, 'User unbanned')
}

export async function changeUserRole(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_ID')
    return
  }

  if (idParsed.data === actorId(req)) {
    sendError(res, 'Cannot change your own role', 400, 'SELF_ROLE_CHANGE')
    return
  }

  const { role } = req.body as ChangeRoleInput

  const result = await UserModel.changeRole(idParsed.data, role, actorId(req))

  if (result === 'not_found') {
    sendError(res, 'User not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'no_change') {
    sendError(res, 'User already has that role', 409, 'NO_CHANGE')
    return
  }

  logger.info({ targetId: idParsed.data, actorId: actorId(req), role }, 'User role changed')
  sendSuccess(res, { id: idParsed.data, role }, 'Role updated')
}

// ─── Post management ──────────────────────────────────────────────────────────

export async function adminListPosts(req: Request, res: Response): Promise<void> {
  const parsed = adminListPostsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { cursor, limit, includeDeleted } = parsed.data as AdminListPostsQuery

  const { posts, nextCursor } = await PostModel.adminListPosts(cursor, limit, includeDeleted)
  sendSuccess(res, { posts, nextCursor }, 'Posts')
}

export async function adminCreatePost(req: Request, res: Response): Promise<void> {
  const { content, mediaUrls, authorId } = req.body as AdminCreatePostInput
  const urls     = mediaUrls ?? []
  const posterId = authorId ?? actorId(req)

  const post = await PostModel.createPost(posterId, content, urls)

  logger.info({ actorId: actorId(req), postId: post.id, posterId }, 'Admin created post')
  sendCreated(res, post, 'Post created')
}

export async function adminDeletePost(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid post id', 400, 'INVALID_ID')
    return
  }

  const result = await PostModel.softDeletePost(idParsed.data, actorId(req), { allowAdmin: true })

  if (result === 'not_found') {
    sendError(res, 'Post not found', 404, 'NOT_FOUND')
    return
  }

  await AuditLogModel.logAction(actorId(req), 'DELETE_POST', {
    entityId:   idParsed.data,
    entityType: 'Post',
  })

  logger.info({ actorId: actorId(req), postId: idParsed.data }, 'Admin soft-deleted post')
  sendNoContent(res)
}

export async function adminRestorePost(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid post id', 400, 'INVALID_ID')
    return
  }

  const result = await PostModel.restorePost(idParsed.data, actorId(req))

  if (result === 'not_found') {
    sendError(res, 'Post not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'not_deleted') {
    sendError(res, 'Post is not deleted', 409, 'NOT_DELETED')
    return
  }

  logger.info({ actorId: actorId(req), postId: idParsed.data }, 'Admin restored post')
  sendSuccess(res, { id: idParsed.data }, 'Post restored')
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const parsed = adminListAuditLogsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten())
    return
  }

  const { cursor, limit, actorId: filterActorId, action } = parsed.data as AdminListAuditLogsQuery

  if (cursor && AuditLogModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { logs, nextCursor } = await AuditLogModel.listAuditLogs(
    cursor,
    limit,
    filterActorId,
    action,
  )

  sendSuccess(res, { logs, nextCursor }, 'Audit logs')
}
