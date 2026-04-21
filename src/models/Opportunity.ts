import { prisma } from '../config/db'
import { OpportunityStatus, OpportunityCategory } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  ApplyOpportunityInput,
} from '../schemas/opportunity.schema'

// ─── Shared includes ──────────────────────────────────────────────────────────

const posterSelect = {
  select: {
    id:      true,
    profile: {
      select: {
        firstName: true,
        lastName:  true,
        avatarUrl: true,
      },
    },
  },
} satisfies Prisma.UserDefaultArgs

// ─── Types ────────────────────────────────────────────────────────────────────

export type OpportunitySummary = {
  id:              string
  posterId:        string
  title:           string
  organisation:    string
  logoUrl:         string | null
  category:        OpportunityCategory
  location:        string | null
  isRemote:        boolean
  deadline:        Date
  applyUrl:        string
  status:          OpportunityStatus
  createdAt:       Date
  updatedAt:       Date
  poster:          { id: string; profile: { firstName: string; lastName: string; avatarUrl: string | null } | null }
  _count:          { applications: number }
  isSavedByUser:   boolean
  isAppliedByUser: boolean
}

export type OpportunityDetail = OpportunitySummary & {
  description:    string
  rejectionReason: string | null
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

function mapRow<
  T extends {
    savedBy:      { userId: string }[]
    applications: { userId: string }[]
  } & Record<string, unknown>,
>(row: T, viewerId: string): Omit<T, 'savedBy' | 'applications'> & { isSavedByUser: boolean; isAppliedByUser: boolean } {
  const { savedBy, applications, ...rest } = row
  return {
    ...rest,
    isSavedByUser:   savedBy.length > 0,
    isAppliedByUser: applications.length > 0,
  } as Omit<T, 'savedBy' | 'applications'> & { isSavedByUser: boolean; isAppliedByUser: boolean }
}

function viewerIncludes(viewerId: string) {
  return {
    poster:       posterSelect,
    savedBy:      { where: { userId: viewerId }, take: 1 },
    applications: { where: { userId: viewerId }, take: 1, select: { userId: true } },
    _count:       { select: { applications: true } },
  } as const
}

// ─── getOpportunities ─────────────────────────────────────────────────────────

export async function getOpportunities(
  viewerId: string,
  opts: {
    category?: OpportunityCategory
    isRemote?: boolean
    search?:   string
    cursor?:   string
    limit:     number
  },
): Promise<{ opportunities: OpportunitySummary[]; nextCursor: string | null }> {
  const take = opts.limit + 1
  const now  = new Date()

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (opts.cursor) {
    const d = decodeCursor(opts.cursor)
    if (!d) return { opportunities: [], nextCursor: null }
    cursorDecoded = d
  }

  const where: Prisma.OpportunityWhereInput = {
    status:   OpportunityStatus.ACTIVE,
    deadline: { gte: now },
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.isRemote !== undefined ? { isRemote: opts.isRemote } : {}),
    ...(opts.search
      ? {
          OR: [
            { title:        { contains: opts.search, mode: 'insensitive' } },
            { organisation: { contains: opts.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(cursorDecoded
      ? {
          OR: [
            { createdAt: { lt: cursorDecoded.createdAt } },
            { AND: [{ createdAt: cursorDecoded.createdAt }, { id: { lt: cursorDecoded.id } }] },
          ],
        }
      : {}),
  }

  const rows = await prisma.opportunity.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: viewerIncludes(viewerId),
  })

  const hasMore = rows.length > opts.limit
  const slice   = hasMore ? rows.slice(0, opts.limit) : rows
  const opportunities = slice.map((r) =>
    mapRow(r as unknown as Parameters<typeof mapRow>[0], viewerId),
  ) as unknown as OpportunitySummary[]

  const last = slice[slice.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { opportunities, nextCursor }
}

// ─── getOpportunityById ───────────────────────────────────────────────────────

export async function getOpportunityById(
  id:       string,
  viewerId: string,
): Promise<OpportunityDetail | null> {
  const row = await prisma.opportunity.findUnique({
    where:   { id },
    include: viewerIncludes(viewerId),
  })
  if (!row) return null
  return mapRow(
    row as unknown as Parameters<typeof mapRow>[0],
    viewerId,
  ) as unknown as OpportunityDetail
}

// ─── toggleSave ───────────────────────────────────────────────────────────────

export async function toggleSave(
  userId:        string,
  opportunityId: string,
): Promise<{ saved: boolean } | 'not_found'> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { id: true },
  })
  if (!opp) return 'not_found'

  const existing = await prisma.savedOpportunity.findUnique({
    where: { userId_opportunityId: { userId, opportunityId } },
  })

  if (existing) {
    await prisma.savedOpportunity.delete({
      where: { userId_opportunityId: { userId, opportunityId } },
    })
    return { saved: false }
  }

  await prisma.savedOpportunity.create({ data: { userId, opportunityId } })
  return { saved: true }
}

// ─── applyToOpportunity ───────────────────────────────────────────────────────

export async function applyToOpportunity(
  opportunityId: string,
  userId:        string,
  data:          ApplyOpportunityInput,
): Promise<{ id: string } | 'not_found' | 'duplicate' | 'expired'> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { status: true, deadline: true },
  })
  if (!opp) return 'not_found'
  if (opp.status !== OpportunityStatus.ACTIVE || opp.deadline < new Date()) {
    return 'expired'
  }

  const existing = await prisma.opportunityApplication.findUnique({
    where: { userId_opportunityId: { userId, opportunityId } },
  })
  if (existing) return 'duplicate'

  const app = await prisma.opportunityApplication.create({
    data: { userId, opportunityId, coverNote: data.coverNote ?? null },
    select: { id: true },
  })
  return app
}

// ─── getRecommended ───────────────────────────────────────────────────────────

export async function getRecommended(
  userId: string,
  limit = 10,
): Promise<OpportunitySummary[]> {
  const now = new Date()

  // Get skill IDs from user's profile for skill-matched recommendations.
  const profileSkills = await prisma.profileSkill.findMany({
    where:  { profile: { userId } },
    select: { skillId: true },
  })
  const skillIds = profileSkills.map((ps) => ps.skillId)

  const where: Prisma.OpportunityWhereInput = {
    status:   OpportunityStatus.ACTIVE,
    deadline: { gte: now },
    ...(skillIds.length > 0
      ? { skills: { some: { skillId: { in: skillIds } } } }
      : {}),
  }

  const rows = await prisma.opportunity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take:    limit,
    include: viewerIncludes(userId),
  })

  return rows.map((r) =>
    mapRow(r as unknown as Parameters<typeof mapRow>[0], userId),
  ) as unknown as OpportunitySummary[]
}

// ─── Admin / mod model functions ──────────────────────────────────────────────

export async function createOpportunity(
  posterId: string,
  data:     CreateOpportunityInput,
): Promise<OpportunityDetail> {
  const row = await prisma.opportunity.create({
    data: {
      posterId,
      title:        data.title,
      organisation: data.organisation,
      description:  data.description,
      category:     data.category,
      deadline:     data.deadline,
      isRemote:     data.isRemote,
      applyUrl:     data.applicationUrl,
      logoUrl:      data.logoUrl ?? null,
      location:     data.location ?? null,
      status:       OpportunityStatus.PENDING_REVIEW,
    },
    include: viewerIncludes(posterId),
  })
  return mapRow(
    row as unknown as Parameters<typeof mapRow>[0],
    posterId,
  ) as unknown as OpportunityDetail
}

export async function updateOpportunity(
  id:     string,
  data:   UpdateOpportunityInput,
): Promise<OpportunityDetail | null> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id },
    select: { id: true, posterId: true },
  })
  if (!opp) return null

  const patch: Prisma.OpportunityUpdateInput = {}
  if (data.title          !== undefined) patch.title        = data.title
  if (data.organisation   !== undefined) patch.organisation = data.organisation
  if (data.description    !== undefined) patch.description  = data.description
  if (data.category       !== undefined) patch.category     = data.category
  if (data.deadline       !== undefined) patch.deadline     = data.deadline
  if (data.isRemote       !== undefined) patch.isRemote     = data.isRemote
  if (data.applicationUrl !== undefined) patch.applyUrl     = data.applicationUrl
  if (data.logoUrl        !== undefined) patch.logoUrl      = data.logoUrl
  if (data.location       !== undefined) patch.location     = data.location

  const row = await prisma.opportunity.update({
    where:   { id },
    data:    patch,
    include: viewerIncludes(opp.posterId),
  })
  return mapRow(
    row as unknown as Parameters<typeof mapRow>[0],
    opp.posterId,
  ) as unknown as OpportunityDetail
}

export async function approveOpportunity(id: string): Promise<OpportunityDetail | null> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id },
    select: { id: true, posterId: true },
  })
  if (!opp) return null

  const row = await prisma.opportunity.update({
    where: { id },
    data:  { status: OpportunityStatus.ACTIVE },
    include: viewerIncludes(opp.posterId),
  })
  return mapRow(
    row as unknown as Parameters<typeof mapRow>[0],
    opp.posterId,
  ) as unknown as OpportunityDetail
}

export async function rejectOpportunity(
  id:     string,
  reason: string,
): Promise<OpportunityDetail | null> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id },
    select: { id: true, posterId: true },
  })
  if (!opp) return null

  const row = await prisma.opportunity.update({
    where: { id },
    data:  {
      status:          OpportunityStatus.REJECTED,
      rejectionReason: reason,
    },
    include: viewerIncludes(opp.posterId),
  })
  return mapRow(
    row as unknown as Parameters<typeof mapRow>[0],
    opp.posterId,
  ) as unknown as OpportunityDetail
}
