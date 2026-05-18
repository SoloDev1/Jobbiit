import { prisma } from '../config/db'
import type { Prisma } from '@prisma/client'

// ─── Shared author select ─────────────────────────────────────────────────────

const authorSelect = {
  id: true,
  profile: {
    select: {
      firstName: true,
      lastName:  true,
      headline:  true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.UserSelect

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobCommentWithAuthor = {
  id:          string
  jobId:       string
  authorId:    string
  content:     string
  isDeleted:   boolean
  deletedById: string | null
  createdAt:   Date
  updatedAt:   Date
  author: {
    id: string
    profile: {
      firstName: string
      lastName:  string
      headline:  string | null
      avatarUrl: string | null
    } | null
  }
}

// ─── toggleJobLike ────────────────────────────────────────────────────────────

export async function toggleJobLike(
  jobId:  string,
  userId: string,
): Promise<{ liked: boolean; count: number; posterId: string } | null> {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { id: true, posterId: true },
  })
  if (!job) return null

  const existing = await prisma.jobLike.findUnique({
    where: { userId_jobId: { userId, jobId } },
  })

  if (existing) {
    await prisma.jobLike.delete({ where: { userId_jobId: { userId, jobId } } })
  } else {
    await prisma.jobLike.create({ data: { userId, jobId } })
  }

  const count = await prisma.jobLike.count({ where: { jobId } })
  const liked = !existing
  return { liked, count, posterId: job.posterId }
}

// ─── getJobLikeCount ──────────────────────────────────────────────────────────

export async function getJobLikeCount(jobId: string): Promise<number> {
  return prisma.jobLike.count({ where: { jobId } })
}

// ─── addJobComment ────────────────────────────────────────────────────────────

export async function addJobComment(
  jobId:   string,
  userId:  string,
  content: string,
): Promise<JobCommentWithAuthor | null> {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { id: true },
  })
  if (!job) return null

  const comment = await prisma.jobComment.create({
    data: { jobId, authorId: userId, content },
    include: { author: { select: authorSelect } },
  })
  return comment as JobCommentWithAuthor
}

// ─── getJobComments ───────────────────────────────────────────────────────────

export async function getJobComments(
  jobId:  string,
  cursor?: string,
  limit   = 20,
): Promise<{ comments: JobCommentWithAuthor[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorId: string | undefined
  if (cursor) cursorId = cursor

  const rows = await prisma.jobComment.findMany({
    where: {
      jobId,
      isDeleted: false,
      ...(cursorId ? { id: { lt: cursorId } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take,
    include: { author: { select: authorSelect } },
  })

  const hasMore    = rows.length > limit
  const slice      = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? slice[slice.length - 1].id : null

  return { comments: slice as JobCommentWithAuthor[], nextCursor }
}

// ─── deleteJobComment ─────────────────────────────────────────────────────────

export async function deleteJobComment(
  commentId: string,
  jobId:     string,
  userId:    string,
  opts:      { allowAdmin: boolean },
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const comment = await prisma.jobComment.findUnique({
    where:  { id: commentId },
    select: { authorId: true, isDeleted: true, jobId: true },
  })
  if (!comment || comment.isDeleted) return 'not_found'
  if (comment.jobId !== jobId) return 'not_found'

  const isOwner = comment.authorId === userId
  if (!isOwner && !opts.allowAdmin) return 'forbidden'

  await prisma.jobComment.delete({
    where: { id: commentId },
    data:  { isDeleted: true, deletedById: userId },
  })
  return 'deleted'
}