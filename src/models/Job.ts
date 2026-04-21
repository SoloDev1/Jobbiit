import { prisma } from '../config/db'
import { JobStatus, JobType } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { CreateJobInput, UpdateJobInput, ApplyJobInput } from '../schemas/job.schema'

// ─── Salary serialisation ─────────────────────────────────────────────────────
// The Prisma model stores salary as a single nullable JSON string.

interface SalaryInfo {
  min?:      number
  max?:      number
  currency:  string
}

function encodeSalary(
  min:      number | undefined,
  max:      number | undefined,
  currency: string,
): string | null {
  if (min === undefined && max === undefined) return null
  const info: SalaryInfo = { currency }
  if (min !== undefined) info.min = min
  if (max !== undefined) info.max = max
  return JSON.stringify(info)
}

function parseSalary(raw: string | null): SalaryInfo | null {
  if (!raw) return null
  try { return JSON.parse(raw) as SalaryInfo } catch { return null }
}

// ─── Shared includes ──────────────────────────────────────────────────────────

const posterInclude = {
  select: {
    id:      true,
    profile: {
      select: {
        firstName: true,
        lastName:  true,
        headline:  true,
        avatarUrl: true,
      },
    },
  },
} satisfies Prisma.UserDefaultArgs

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobSummary = {
  id:           string
  posterId:     string
  title:        string
  company:      string
  location:     string | null
  isRemote:     boolean
  type:         JobType
  status:       JobStatus
  salary:       SalaryInfo | null
  createdAt:    Date
  updatedAt:    Date
  poster:       { id: string; profile: { firstName: string; lastName: string; headline: string | null; avatarUrl: string | null } | null }
  _count:       { applications: number }
  isSavedByUser: boolean
}

export type JobDetail = JobSummary & {
  description:  string
  requirements: string | null
}

export type ApplicationRow = {
  id:          string
  jobId:       string
  applicantId: string
  status:      string
  coverLetter: string | null
  resumeUrl:   string | null
  createdAt:   Date
  updatedAt:   Date
  applicant:   { id: string; profile: { firstName: string; lastName: string; headline: string | null; avatarUrl: string | null } | null }
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

function mapJob<T extends { salary: string | null; savedBy: { userId: string }[] } & Record<string, unknown>>(
  row: T,
  viewerId: string,
): Omit<T, 'salary' | 'savedBy'> & { salary: SalaryInfo | null; isSavedByUser: boolean } {
  const { salary, savedBy, ...rest } = row
  return { ...rest, salary: parseSalary(salary as string | null), isSavedByUser: savedBy.length > 0 } as Omit<T, 'salary' | 'savedBy'> & { salary: SalaryInfo | null; isSavedByUser: boolean }
}

// ─── getJobs ──────────────────────────────────────────────────────────────────

export async function getJobs(
  viewerId: string,
  opts: {
    type?:     JobType
    isRemote?: boolean
    search?:   string
    cursor?:   string
    limit:     number
  },
): Promise<{ jobs: JobSummary[]; nextCursor: string | null }> {
  const take = opts.limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (opts.cursor) {
    const d = decodeCursor(opts.cursor)
    if (!d) return { jobs: [], nextCursor: null }
    cursorDecoded = d
  }

  const where: Prisma.JobWhereInput = {
    status:   JobStatus.OPEN,
    ...(opts.type     ? { type: opts.type }         : {}),
    ...(opts.isRemote !== undefined ? { isRemote: opts.isRemote } : {}),
    ...(opts.search
      ? {
          OR: [
            { title:   { contains: opts.search, mode: 'insensitive' } },
            { company: { contains: opts.search, mode: 'insensitive' } },
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

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: {
      poster: posterInclude,
      savedBy: { where: { userId: viewerId }, take: 1 },
      _count:  { select: { applications: true } },
    },
  })

  const hasMore = rows.length > take - 1
  const slice   = hasMore ? rows.slice(0, opts.limit) : rows
  const jobs    = slice.map((r) => mapJob(r as unknown as Parameters<typeof mapJob>[0], viewerId)) as unknown as JobSummary[]

  const last = slice[slice.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { jobs, nextCursor }
}

// ─── createJob ────────────────────────────────────────────────────────────────

export async function createJob(userId: string, data: CreateJobInput): Promise<JobDetail> {
  const salary = encodeSalary(data.salaryMin, data.salaryMax, data.currency)
  const row = await prisma.job.create({
    data: {
      posterId:    userId,
      title:       data.title,
      company:     data.company,
      description: data.description,
      type:        data.type,
      location:    data.location ?? null,
      isRemote:    data.isRemote,
      salary,
    },
    include: {
      poster: posterInclude,
      savedBy: { where: { userId }, take: 1 },
      _count:  { select: { applications: true } },
    },
  })
  return mapJob(row as unknown as Parameters<typeof mapJob>[0], userId) as unknown as JobDetail
}

// ─── getJobById ───────────────────────────────────────────────────────────────

export async function getJobById(jobId: string, viewerId: string): Promise<JobDetail | null> {
  const row = await prisma.job.findUnique({
    where:   { id: jobId },
    include: {
      poster: posterInclude,
      savedBy: { where: { userId: viewerId }, take: 1 },
      _count:  { select: { applications: true } },
    },
  })
  if (!row) return null
  return mapJob(row as unknown as Parameters<typeof mapJob>[0], viewerId) as unknown as JobDetail
}

// ─── updateJob ────────────────────────────────────────────────────────────────

export async function updateJob(
  jobId:  string,
  userId: string,
  data:   UpdateJobInput,
): Promise<JobDetail | null | 'forbidden'> {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { posterId: true },
  })
  if (!job) return null
  if (job.posterId !== userId) return 'forbidden'

  const patch: Prisma.JobUpdateInput = {}
  if (data.title       !== undefined) patch.title       = data.title
  if (data.company     !== undefined) patch.company     = data.company
  if (data.description !== undefined) patch.description = data.description
  if (data.type        !== undefined) patch.type        = data.type
  if (data.location    !== undefined) patch.location    = data.location
  if (data.isRemote    !== undefined) patch.isRemote    = data.isRemote
  if (
    data.salaryMin !== undefined ||
    data.salaryMax !== undefined ||
    data.currency  !== undefined
  ) {
    patch.salary = encodeSalary(data.salaryMin, data.salaryMax, data.currency ?? 'USD')
  }

  const row = await prisma.job.update({
    where:   { id: jobId },
    data:    patch,
    include: {
      poster: posterInclude,
      savedBy: { where: { userId }, take: 1 },
      _count:  { select: { applications: true } },
    },
  })
  return mapJob(row as unknown as Parameters<typeof mapJob>[0], userId) as unknown as JobDetail
}

// ─── closeJob ─────────────────────────────────────────────────────────────────

export async function closeJob(
  jobId:  string,
  userId: string,
): Promise<'closed' | 'not_found' | 'forbidden'> {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { posterId: true, status: true },
  })
  if (!job) return 'not_found'
  if (job.posterId !== userId) return 'forbidden'

  await prisma.job.update({
    where: { id: jobId },
    data:  { status: JobStatus.CLOSED },
  })
  return 'closed'
}

// ─── applyToJob ───────────────────────────────────────────────────────────────

export async function applyToJob(
  jobId:  string,
  userId: string,
  data:   ApplyJobInput,
): Promise<{ id: string } | 'not_found' | 'duplicate' | 'closed'> {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { status: true },
  })
  if (!job) return 'not_found'
  if (job.status !== JobStatus.OPEN) return 'closed'

  const existing = await prisma.application.findUnique({
    where:  { jobId_applicantId: { jobId, applicantId: userId } },
    select: { id: true },
  })
  if (existing) return 'duplicate'

  const app = await prisma.application.create({
    data: {
      jobId,
      applicantId: userId,
      coverLetter: data.coverLetter ?? null,
      resumeUrl:   data.resumeUrl && data.resumeUrl !== '' ? data.resumeUrl : null,
    },
    select: { id: true },
  })
  return app
}

// ─── getApplications ──────────────────────────────────────────────────────────

export async function getApplications(
  jobId:  string,
  userId: string,
): Promise<ApplicationRow[] | 'not_found' | 'forbidden'> {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { posterId: true },
  })
  if (!job) return 'not_found'
  if (job.posterId !== userId) return 'forbidden'

  const rows = await prisma.application.findMany({
    where:   { jobId },
    orderBy: { createdAt: 'desc' },
    include: {
      applicant: {
        select: {
          id:      true,
          profile: {
            select: {
              firstName: true,
              lastName:  true,
              headline:  true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })
  return rows as unknown as ApplicationRow[]
}

// ─── toggleSaveJob ────────────────────────────────────────────────────────────

export async function toggleSaveJob(
  userId: string,
  jobId:  string,
): Promise<{ saved: boolean } | 'not_found'> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } })
  if (!job) return 'not_found'

  const existing = await prisma.savedJob.findUnique({
    where: { userId_jobId: { userId, jobId } },
  })

  if (existing) {
    await prisma.savedJob.delete({ where: { userId_jobId: { userId, jobId } } })
    return { saved: false }
  }

  await prisma.savedJob.create({ data: { userId, jobId } })
  return { saved: true }
}

// ─── getSavedJobs ─────────────────────────────────────────────────────────────

export async function getSavedJobs(userId: string): Promise<{ savedAt: Date; job: JobDetail }[]> {
  const rows = await prisma.savedJob.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      job: {
        include: {
          poster: posterInclude,
          savedBy: { where: { userId }, take: 1 },
          _count:  { select: { applications: true } },
        },
      },
    },
  })

  return rows.map((r) => ({
    savedAt: r.createdAt,
    job:     mapJob(r.job as unknown as Parameters<typeof mapJob>[0], userId) as unknown as JobDetail,
  }))
}
