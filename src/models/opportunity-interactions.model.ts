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

export type OpportunityCommentWithAuthor = {
  id:            string
  opportunityId: string
  authorId:      string
  content:       string
  isDeleted:     boolean
  deletedById:   string | null
  createdAt:     Date
  updatedAt:     Date
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

// ─── toggleOpportunityLike ────────────────────────────────────────────────────

export async function toggleOpportunityLike(
  opportunityId: string,
  userId:        string,
): Promise<{ liked: boolean; count: number; posterId: string } | null> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { id: true, posterId: true },
  })
  if (!opp) return null

  const existing = await prisma.opportunityLike.findUnique({
    where: { userId_opportunityId: { userId, opportunityId } },
  })

  if (existing) {
    await prisma.opportunityLike.delete({
      where: { userId_opportunityId: { userId, opportunityId } },
    })
  } else {
    await prisma.opportunityLike.create({ data: { userId, opportunityId } })
  }

  const count = await prisma.opportunityLike.count({ where: { opportunityId } })
  const liked = !existing
  return { liked, count, posterId: opp.posterId }
}

// ─── getOpportunityLikeCount ──────────────────────────────────────────────────

export async function getOpportunityLikeCount(opportunityId: string): Promise<number> {
  return prisma.opportunityLike.count({ where: { opportunityId } })
}

// ─── addOpportunityComment ────────────────────────────────────────────────────

export async function addOpportunityComment(
  opportunityId: string,
  userId:        string,
  content:       string,
): Promise<OpportunityCommentWithAuthor | null> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { id: true },
  })
  if (!opp) return null

  const comment = await prisma.opportunityComment.create({
    data: { opportunityId, authorId: userId, content },
    include: { author: { select: authorSelect } },
  })
  return comment as OpportunityCommentWithAuthor
}

// ─── getOpportunityComments ───────────────────────────────────────────────────

export async function getOpportunityComments(
  opportunityId: string,
  cursor?:       string,
  limit          = 20,
): Promise<{ comments: OpportunityCommentWithAuthor[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorId: string | undefined
  if (cursor) cursorId = cursor

  const rows = await prisma.opportunityComment.findMany({
    where: {
      opportunityId,
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

  return { comments: slice as OpportunityCommentWithAuthor[], nextCursor }
}

// ─── deleteOpportunityComment ─────────────────────────────────────────────────

export async function deleteOpportunityComment(
  commentId:     string,
  opportunityId: string,
  userId:        string,
  opts:          { allowAdmin: boolean },
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const comment = await prisma.opportunityComment.findUnique({
    where:  { id: commentId },
    select: { authorId: true, isDeleted: true, opportunityId: true },
  })
  if (!comment || comment.isDeleted) return 'not_found'
  if (comment.opportunityId !== opportunityId) return 'not_found'

  const isOwner = comment.authorId === userId
  if (!isOwner && !opts.allowAdmin) return 'forbidden'

  await prisma.opportunityComment.delete({
  where: { id: commentId },
})
  return 'deleted'
}