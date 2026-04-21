import type { Request, Response } from 'express'
import { z } from 'zod'
import type { Role } from '@prisma/client'
import { logger } from '../config/logger'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNoContent,
} from '../utils/apiResponse'
import * as PostModel from '../models/Post'
import { notifyNewPost, createNotification } from '../services/notification.service'
import {
  feedQuerySchema,
  type CreatePostInput,
  type CreateCommentInput,
} from '../schemas/post.schema'

const uuidParam = z.string().uuid()

function userId(req: Request): string {
  return req.user!.id
}

function canModerate(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

// ─── getFeed ─────────────────────────────────────────────────────────────────

export async function getFeed(req: Request, res: Response): Promise<void> {
  const parsed = feedQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(
      res,
      'Validation failed',
      422,
      'VALIDATION_ERROR',
      parsed.error.flatten(),
    )
    return
  }

  const { cursor, limit } = parsed.data
  if (cursor && PostModel.decodeCursor(cursor) === null) {
    sendError(res, 'Invalid cursor', 400, 'INVALID_CURSOR')
    return
  }

  const { posts, nextCursor } = await PostModel.getFeed(userId(req), cursor, limit)

  sendSuccess(res, { posts, nextCursor }, 'Feed loaded')
}

// ─── createPost ──────────────────────────────────────────────────────────────

export async function createPost(req: Request, res: Response): Promise<void> {
  const { content, mediaUrls } = req.body as CreatePostInput
  const urls = mediaUrls ?? []

  const post = await PostModel.createPost(userId(req), content, urls)

  void notifyNewPost(post.id, userId(req)).catch((err: unknown) => {
    logger.error({ err }, 'notifyNewPost failed')
  })

  logger.info({ userId: userId(req), postId: post.id }, 'Post created')

  sendCreated(res, post, 'Post created')
}

// ─── getPostById ─────────────────────────────────────────────────────────────

export async function getPostById(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid post id', 400, 'INVALID_ID')
    return
  }

  const post = await PostModel.getPostById(idParsed.data, userId(req))
  if (!post) {
    sendError(res, 'Post not found', 404, 'NOT_FOUND')
    return
  }

  sendSuccess(res, post, 'Post loaded')
}

// ─── deletePost ──────────────────────────────────────────────────────────────

export async function deletePost(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid post id', 400, 'INVALID_ID')
    return
  }

  const result = await PostModel.softDeletePost(idParsed.data, userId(req), {
    allowAdmin: canModerate(req.user!.role),
  })

  if (result === 'not_found') {
    sendError(res, 'Post not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ userId: userId(req), postId: idParsed.data }, 'Post soft-deleted')

  sendNoContent(res)
}

// ─── toggleLike ──────────────────────────────────────────────────────────────

export async function toggleLike(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid post id', 400, 'INVALID_ID')
    return
  }

  const out = await PostModel.toggleLike(idParsed.data, userId(req))
  if (!out) {
    sendError(res, 'Post not found', 404, 'NOT_FOUND')
    return
  }

  const uid = userId(req)
  if (out.liked && out.authorId !== uid) {
    createNotification(
      out.authorId,
      'POST_LIKED',
      'Someone liked your post',
      idParsed.data,
      uid,
    )
  }

  sendSuccess(res, { liked: out.liked, count: out.count }, 'Like updated')
}

// ─── addComment ───────────────────────────────────────────────────────────────

export async function addComment(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id)
  if (!idParsed.success) {
    sendError(res, 'Invalid post id', 400, 'INVALID_ID')
    return
  }

  const { content } = req.body as CreateCommentInput

  const comment = await PostModel.addComment(idParsed.data, userId(req), content)
  if (!comment) {
    sendError(res, 'Post not found', 404, 'NOT_FOUND')
    return
  }

  sendCreated(res, comment, 'Comment added')
}

// ─── deleteComment ────────────────────────────────────────────────────────────

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const postParsed = uuidParam.safeParse(req.params.postId)
  const commentParsed = uuidParam.safeParse(req.params.commentId)
  if (!postParsed.success || !commentParsed.success) {
    sendError(res, 'Invalid id', 400, 'INVALID_ID')
    return
  }

  const ok = await PostModel.deleteComment(
    commentParsed.data,
    postParsed.data,
    userId(req),
  )
  if (!ok) {
    sendError(res, 'Comment not found', 404, 'NOT_FOUND')
    return
  }

  sendNoContent(res)
}
