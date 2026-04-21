import { prisma } from '../config/db'
import type { Prisma } from '@prisma/client'
import { ConnectionStatus } from '@prisma/client'

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

export type FeedPost = {
  id:          string
  authorId:    string
  content:     string
  mediaUrls:   string[]
  isDeleted:   boolean
  deletedById: string | null
  createdAt:   Date
  updatedAt:   Date
  author:      {
    id: string
    profile: {
      firstName: string
      lastName:  string
      headline:  string | null
      avatarUrl: string | null
    } | null
  }
  isLikedByUser: boolean
  _count:        { likes: number; comments: number }
}

export type PostDetail = Omit<FeedPost, '_count'> & {
  comments: CommentWithAuthor[]
  _count:   { likes: number; comments: number }
}

export type CommentWithAuthor = {
  id:        string
  postId:    string
  authorId:  string
  content:   string
  isDeleted: boolean
  createdAt: Date
  author:    {
    id: string
    profile: {
      firstName: string
      lastName:  string
      headline:  string | null
      avatarUrl: string | null
    } | null
  }
}

export async function getVisibleAuthorIds(userId: string): Promise<string[]> {
  const rows = await prisma.connection.findMany({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR:     [{ senderId: userId }, { receiverId: userId }],
    },
    select: { senderId: true, receiverId: true },
  })
  const others = new Set<string>()
  for (const r of rows) {
    others.add(r.senderId === userId ? r.receiverId : r.senderId)
  }
  others.add(userId)
  return [...others]
}

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

function mapFeedRow(
  row: {
    id: string
    authorId: string
    content: string
    mediaUrls: string[]
    isDeleted: boolean
    deletedById: string | null
    createdAt: Date
    updatedAt: Date
    author: FeedPost['author']
    likes: { userId: string }[]
    _count: { likes: number; comments: number }
  },
): FeedPost {
  const { likes, ...rest } = row
  return {
    ...rest,
    isLikedByUser: likes.length > 0,
    _count:        rest._count,
  }
}

export async function getFeed(
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const visibleIds = await getVisibleAuthorIds(userId)
  const take         = limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (cursor) {
    const d = decodeCursor(cursor)
    if (!d) return { posts: [], nextCursor: null }
    cursorDecoded = d
  }

  const where: Prisma.PostWhereInput = {
    isDeleted: false,
    authorId:  { in: visibleIds },
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

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: {
      author: { select: authorSelect },
      likes: {
        where: { userId },
        take:  1,
        select: { userId: true },
      },
      _count: {
        select: {
          likes:    true,
          comments: { where: { isDeleted: false } },
        },
      },
    },
  })

  const hasMore = rows.length > limit
  const slice   = hasMore ? rows.slice(0, limit) : rows
  const posts   = slice.map((r) =>
    mapFeedRow(
      r as unknown as Parameters<typeof mapFeedRow>[0],
    ),
  )

  const last = slice[slice.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { posts, nextCursor }
}

export async function createPost(
  userId: string,
  content: string,
  mediaUrls: string[],
): Promise<FeedPost> {
  const row = await prisma.post.create({
    data: {
      authorId:  userId,
      content,
      mediaUrls,
    },
    include: {
      author: { select: authorSelect },
      likes: {
        where: { userId },
        take:  1,
        select: { userId: true },
      },
      _count: {
        select: {
          likes:    true,
          comments: { where: { isDeleted: false } },
        },
      },
    },
  })
  return mapFeedRow(
    row as unknown as Parameters<typeof mapFeedRow>[0],
  )
}

export async function getPostById(
  postId: string,
  viewerId: string,
): Promise<PostDetail | null> {
  const visibleIds = await getVisibleAuthorIds(viewerId)
  const row = await prisma.post.findFirst({
    where: {
      id:        postId,
      isDeleted: false,
      authorId:  { in: visibleIds },
    },
    include: {
      author: { select: authorSelect },
      likes: {
        where: { userId: viewerId },
        take:  1,
        select: { userId: true },
      },
      comments: {
        where:   { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: authorSelect },
        },
      },
      _count: {
        select: {
          likes:    true,
          comments: { where: { isDeleted: false } },
        },
      },
    },
  })
  if (!row) return null

  const { likes, comments, ...rest } = row
  const base = mapFeedRow(
    { ...rest, likes, _count: row._count } as unknown as Parameters<
      typeof mapFeedRow
    >[0],
  )
  return {
    ...base,
    comments: comments as CommentWithAuthor[],
  }
}

export async function softDeletePost(
  postId: string,
  actorId: string,
  opts: { allowAdmin: boolean },
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const post = await prisma.post.findUnique({
    where:  { id: postId },
    select: { authorId: true, isDeleted: true },
  })
  if (!post || post.isDeleted) return 'not_found'
  const isOwner = post.authorId === actorId
  if (!isOwner && !opts.allowAdmin) return 'forbidden'

  await prisma.post.update({
    where: { id: postId },
    data:  { isDeleted: true, deletedById: actorId },
  })
  return 'deleted'
}

export async function toggleLike(
  postId: string,
  userId: string,
): Promise<{ liked: boolean; count: number; authorId: string } | null> {
  const visibleIds = await getVisibleAuthorIds(userId)
  const post = await prisma.post.findFirst({
    where: {
      id:        postId,
      isDeleted: false,
      authorId:  { in: visibleIds },
    },
    select: { id: true, authorId: true },
  })
  if (!post) return null

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await prisma.like.delete({
      where: { userId_postId: { userId, postId } },
    })
  } else {
    await prisma.like.create({ data: { userId, postId } })
  }

  const count = await prisma.like.count({ where: { postId } })
  const liked = !existing
  return { liked, count, authorId: post.authorId }
}

export async function addComment(
  postId: string,
  userId: string,
  content: string,
): Promise<CommentWithAuthor | null> {
  const visibleIds = await getVisibleAuthorIds(userId)
  const post = await prisma.post.findFirst({
    where: {
      id:        postId,
      isDeleted: false,
      authorId:  { in: visibleIds },
    },
    select: { id: true },
  })
  if (!post) return null

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: userId,
      content,
    },
    include: {
      author: { select: authorSelect },
    },
  })
  return comment as CommentWithAuthor
}

export async function deleteComment(
  commentId: string,
  postId: string,
  userId: string,
): Promise<boolean> {
  const comment = await prisma.comment.findUnique({
    where:  { id: commentId },
    select: { authorId: true, isDeleted: true, postId: true },
  })
  if (!comment || comment.isDeleted) return false
  if (comment.postId !== postId) return false
  if (comment.authorId !== userId) return false

  await prisma.comment.update({
    where: { id: commentId },
    data:  { isDeleted: true, deletedById: userId },
  })
  return true
}
