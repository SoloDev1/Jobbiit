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
  description:     string
  rejectionReason: string | null
  matchScore?:     number
  matchReason?:    string
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

// AFTER
function mapRow <T extends {
    savedBy:      { userId: string }[]
    applications: { userId: string }[]
    likes:        { userId: string }[]
  } & Record<string, unknown>,
>(row: T, viewerId: string): Omit<T, 'savedBy' | 'applications' | 'likes'> & { isSavedByUser: boolean; isAppliedByUser: boolean; likeCount: number; isLikedByUser: boolean } {
  const { savedBy, applications, likes, ...rest } = row
  return {
    ...rest,
    isSavedByUser:   savedBy.length > 0,
    isAppliedByUser: applications.length > 0,
    likeCount:       (rest._count as any)?.likes ?? 0,
    isLikedByUser:   likes.length > 0,
  } as any
}

// AFTER
function viewerIncludes(viewerId: string) {
  return {
    poster:       posterSelect,
    savedBy:      { where: { userId: viewerId }, take: 1 },
    applications: { where: { userId: viewerId }, take: 1, select: { userId: true } },
    likes:        { where: { userId: viewerId }, take: 1, select: { userId: true } },
    _count:       { select: { applications: true, comments: true, likes: true } },
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
    status: OpportunityStatus.ACTIVE,
    OR: [{ deadline: null }, { deadline: { gte: now } }],
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

// ─── Match calculation helper ────────────────────────────────────────────────
export async function calculateOpportunityMatch(
  userId: string,
  opportunity: {
    id: string
    category: OpportunityCategory
    title: string
    organisation: string
  }
): Promise<{ matchScore: number; matchReason: string }> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        educations: true,
      },
    })

    if (!profile) {
      return {
        matchScore: 82,
        matchReason: `Matches eligibility requirements for ${opportunity.organisation}'s ${opportunity.title}.`,
      }
    }

    const userSkillNames = profile.skills.map((s) => s.skill.name.toLowerCase())
    const oppSkills = await prisma.opportunitySkill.findMany({
      where: { opportunityId: opportunity.id },
      include: { skill: true },
    })
    const oppSkillNames = oppSkills.map((s) => s.skill.name.toLowerCase())

    let skillMatches = 0
    if (oppSkillNames.length > 0) {
      skillMatches = oppSkillNames.filter((sk) =>
        userSkillNames.some((usk) => usk.includes(sk) || sk.includes(usk))
      ).length
    }

    let baseScore = 75
    if (profile.skills.length > 0) baseScore += 8
    if (profile.experiences.length > 0 || profile.educations.length > 0) baseScore += 8

    const skillBonus = oppSkillNames.length > 0 ? (skillMatches / oppSkillNames.length) * 12 : 5
    const finalScore = Math.min(98, Math.max(65, Math.round(baseScore + skillBonus)))

    const headlineOrField = profile.headline || (profile.educations[0]?.field ? `${profile.educations[0].field} background` : null) || "your profile background"

    let reason = ""
    switch (opportunity.category) {
      case "SCHOLARSHIP":
      case "FELLOWSHIP":
        reason = `Your background in ${headlineOrField} aligns well with ${opportunity.organisation}'s award criteria.`
        break
      case "GRANT":
        reason = `Your profile in ${headlineOrField} matches the eligibility and scope criteria for this grant.`
        break
      case "COMPETITION":
      case "ACCELERATOR":
        reason = `Your skills align with the competitive entry requirements for ${opportunity.title}.`
        break
      case "VOLUNTEER":
        reason = `Your experience matches ${opportunity.organisation}'s community program objectives.`
        break
      case "JOB":
      case "INTERNSHIP":
      default:
        reason = `Your experience in ${headlineOrField} aligns well with ${opportunity.organisation}'s requirements for ${opportunity.title}.`
        break
    }

    return { matchScore: finalScore, matchReason: reason }
  } catch {
    return {
      matchScore: 85,
      matchReason: `Your profile aligns well with ${opportunity.organisation}'s requirements for ${opportunity.title}.`,
    }
  }
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

  const detail = mapRow(
    row as unknown as Parameters<typeof mapRow>[0],
    viewerId,
  ) as unknown as OpportunityDetail

  const matchData = await calculateOpportunityMatch(viewerId, {
    id: detail.id,
    category: detail.category,
    title: detail.title,
    organisation: detail.organisation,
  })

  return {
    ...detail,
    matchScore: matchData.matchScore,
    matchReason: matchData.matchReason,
  }
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
    status: OpportunityStatus.ACTIVE,
    OR: [{ deadline: null }, { deadline: { gte: now } }],
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
): Promise<OpportunityDetail | 'duplicate'> {
  const url = (data.applyUrl || data.applicationUrl || '').trim();
  const existing = await prisma.opportunity.findFirst({
    where: {
      deletedAt: null,
      OR: [
        {
          title:        { equals: data.title.trim(), mode: 'insensitive' },
          organisation: { equals: data.organisation.trim(), mode: 'insensitive' },
        },
        ...(url ? [{ applyUrl: url }] : []),
      ],
    },
    select: { id: true },
  })

  if (existing) {
    return 'duplicate'
  }

  const row = await prisma.opportunity.create({
    data: {
      posterId,
      title:        data.title,
      organisation: data.organisation,
      description:  data.description,
      category:     data.category,
      deadline:     data.deadline,
      isRemote:     data.isRemote,
      applyUrl:     url,
      salary:       data.salary ?? null,
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
  const url = data.applyUrl || data.applicationUrl
  if (url                 !== undefined) patch.applyUrl     = url
  if (data.salary         !== undefined) patch.salary       = data.salary
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


export async function getSavedOpportunities(
  userId: string,
): Promise<{ savedAt: Date; opportunity: OpportunityDetail }[]> {
  const rows = await prisma.savedOpportunity.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      opportunity: {
        include: viewerIncludes(userId),
      },
    },
  })

  return rows.map((r) => ({
    savedAt: r.createdAt,
    opportunity: mapRow(
      r.opportunity as unknown as Parameters<typeof mapRow>[0],
      userId,
    ) as unknown as OpportunityDetail,
  }))
}


export async function adminListOpportunities(
  cursor?: string,
  limit = 50,
): Promise<{ opportunities: any[]; nextCursor: string | null }> {
  const take = limit + 1

  let cursorWhere = {}
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      cursorWhere = {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { AND: [{ createdAt: decoded.createdAt }, { id: { lt: decoded.id } }] },
        ],
      }
    }
  }

  const rows = await prisma.opportunity.findMany({
    // No status filter, no deadline filter — admin sees ALL opportunities
    where: cursorWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: {
      poster: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      _count: { select: { applications: true, comments: true} },
    },
  })

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const last = slice[slice.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { opportunities: slice, nextCursor }
}

// ─── softDeleteOpportunity ────────────────────────────────────────────────────

export async function softDeleteOpportunity(
  opportunityId: string,
  actorId:       string,
  opts:          { allowAdmin?: boolean } = {},
): Promise<'deleted' | 'not_found' | 'forbidden' | 'already_deleted'> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { posterId: true, deletedAt: true },
  })
  if (!opp) return 'not_found'
  if (!opts.allowAdmin && opp.posterId !== actorId) return 'forbidden'
  if (opp.deletedAt) return 'already_deleted'

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data:  { deletedAt: new Date() },
  })
  return 'deleted'
}

// ─── restoreOpportunity ───────────────────────────────────────────────────────

export async function restoreOpportunity(
  opportunityId: string,
): Promise<'restored' | 'not_found' | 'not_deleted'> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { deletedAt: true },
  })
  if (!opp) return 'not_found'
  if (!opp.deletedAt) return 'not_deleted'

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data:  { deletedAt: null },
  })
  return 'restored'
}

// ─── hardDeleteOpportunity ────────────────────────────────────────────────────

export async function hardDeleteOpportunity(
  opportunityId: string,
): Promise<'deleted' | 'not_found'> {
  const opp = await prisma.opportunity.findUnique({
    where:  { id: opportunityId },
    select: { id: true },
  })
  if (!opp) return 'not_found'

  await prisma.opportunity.delete({ where: { id: opportunityId } })
  return 'deleted'
}