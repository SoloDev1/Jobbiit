import { prisma } from '../config/db'
import { ReportStatus, ReportReason, ReportType } from '@prisma/client'
import type { Prisma, Report } from '@prisma/client'
import type { CreateReportInput } from '../schemas/report.schema'

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

function targetFilter(
  type: ReportType,
  targetId: string,
): Prisma.ReportWhereInput {
  switch (type) {
    case ReportType.POST:
      return { postId: targetId }
    case ReportType.COMMENT:
      return { commentId: targetId }
    case ReportType.USER:
      return { reportedUserId: targetId }
    case ReportType.JOB:
      return { jobId: targetId }
    case ReportType.OPPORTUNITY:
      return { opportunityId: targetId }
  }
}

function targetCreateData(
  type: ReportType,
  targetId: string,
): Pick<
  Prisma.ReportCreateInput,
  'post' | 'comment' | 'reportedUser' | 'job' | 'opportunity'
> {
  switch (type) {
    case ReportType.POST:
      return { post: { connect: { id: targetId } } }
    case ReportType.COMMENT:
      return { comment: { connect: { id: targetId } } }
    case ReportType.USER:
      return { reportedUser: { connect: { id: targetId } } }
    case ReportType.JOB:
      return { job: { connect: { id: targetId } } }
    case ReportType.OPPORTUNITY:
      return { opportunity: { connect: { id: targetId } } }
  }
}

export async function createReport(
  reporterId: string,
  data: CreateReportInput,
): Promise<{ id: string } | 'duplicate'> {
  const dup = await prisma.report.findFirst({
    where: {
      filerId: reporterId,
      status:  ReportStatus.PENDING,
      type:    data.type,
      ...targetFilter(data.type, data.targetId),
    },
    select: { id: true },
  })
  if (dup) return 'duplicate'

  const detailsText = data.details
    ? `${data.reason.trim()}\n\n---\n\n${data.details.trim()}`
    : data.reason.trim()

  const row = await prisma.report.create({
    data: {
      filer:   { connect: { id: reporterId } },
      type:    data.type,
      reason:  ReportReason.OTHER,
      details: detailsText,
      ...targetCreateData(data.type, data.targetId),
    },
    select: { id: true },
  })
  return row
}

export async function getMyReports(userId: string): Promise<Report[]> {
  return prisma.report.findMany({
    where:   { filerId: userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPendingReports(
  cursor?: string,
  limit = 20,
): Promise<{ reports: Report[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (cursor) {
    const d = decodeCursor(cursor)
    if (!d) return { reports: [], nextCursor: null }
    cursorDecoded = d
  }

  const where: Prisma.ReportWhereInput = {
    status: ReportStatus.PENDING,
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

  const rows = await prisma.report.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  })

  const hasMore = rows.length > limit
  const slice   = hasMore ? rows.slice(0, limit) : rows
  const last    = slice[slice.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { reports: slice, nextCursor }
}

export async function resolveReport(
  id: string,
  resolverId: string,
  action: string,
): Promise<'ok' | 'not_found'> {
  const existing = await prisma.report.findUnique({
    where:  { id },
    select: { id: true, status: true },
  })
  if (!existing || existing.status !== ReportStatus.PENDING) return 'not_found'

  await prisma.report.update({
    where: { id },
    data: {
      status:         ReportStatus.RESOLVED,
      resolvedAt:     new Date(),
      resolutionNote: action,
      resolvedBy:     { connect: { id: resolverId } },
    },
  })
  return 'ok'
}

export async function dismissReport(
  id: string,
  resolverId: string,
): Promise<'ok' | 'not_found'> {
  const existing = await prisma.report.findUnique({
    where:  { id },
    select: { id: true, status: true },
  })
  if (!existing || existing.status !== ReportStatus.PENDING) return 'not_found'

  await prisma.report.update({
    where: { id },
    data: {
      status:     ReportStatus.DISMISSED,
      resolvedAt: new Date(),
      resolvedBy: { connect: { id: resolverId } },
    },
  })
  return 'ok'
}

export type AdminStats = {
  users:           number
  posts:           number
  jobs:            number
  opportunities:   number
  pendingReports:  number
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    users,
    posts,
    jobs,
    opportunities,
    pendingReports,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.post.count({ where: { isDeleted: false } }),
    prisma.job.count(),
    prisma.opportunity.count(),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
  ])

  return {
    users,
    posts,
    jobs,
    opportunities,
    pendingReports,
  }
}
