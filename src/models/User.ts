import { prisma } from '../config/db'
import type { Role, Prisma } from '@prisma/client'
import * as AuditLogModel from './AuditLog'

// ─── Shapes returned by each query ───────────────────────────────────────────
// passwordHash is NEVER included in these public types.

export interface PublicUser {
  id:       string
  email:    string
  role:     Role
  isActive: boolean
  isBanned: boolean
}

export interface PublicUserWithTimestamp extends PublicUser {
  createdAt:               Date
  onboardingCompletedAt:   Date | null
}

export interface UserWithPassword extends PublicUser {
  passwordHash: string
}

export interface UserWithPasswordAndOnboarding extends UserWithPassword {
  onboardingCompletedAt: Date | null
}

// ─── Admin user list shape ────────────────────────────────────────────────────

export interface AdminUserListItem {
  id:                   string
  email:                string
  role:                 Role
  isActive:             boolean
  isBanned:             boolean
  banReason:            string | null
  createdAt:            Date
  onboardingCompletedAt: Date | null
  profile: {
    firstName: string
    lastName:  string
    headline:  string | null
    avatarUrl: string | null
  } | null
}

export interface AdminUserDetail extends AdminUserListItem {
  _count: {
    posts:       number
    sentConnections:     number
    receivedConnections: number
    jobsPosted:  number
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * General-purpose lookup. Does NOT return passwordHash.
 * Use everywhere except authentication.
 */
export async function findByEmail(email: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true, role: true, isActive: true, isBanned: true },
  })
}

/**
 * Auth-only lookup. Returns passwordHash for bcrypt comparison.
 * Only call this from auth service / login flow.
 */
export async function findByEmailWithPassword(
  email: string,
): Promise<UserWithPasswordAndOnboarding | null> {
  return prisma.user.findUnique({
    where:  { email },
    select: {
      id:                     true,
      email:                  true,
      passwordHash:           true,
      role:                   true,
      isActive:               true,
      isBanned:               true,
      onboardingCompletedAt:  true,
    },
  })
}

/**
 * Fetch a user by primary key. Does NOT return passwordHash.
 * Used by the authenticate middleware and controllers.
 */
export async function findById(
  id: string,
): Promise<PublicUserWithTimestamp | null> {
  return prisma.user.findUnique({
    where:  { id },
    select: {
      id:                     true,
      email:                  true,
      role:                   true,
      isActive:               true,
      isBanned:               true,
      createdAt:              true,
      onboardingCompletedAt:  true,
    },
  })
}

/**
 * Create a new user. Returns the public record — never passwordHash.
 */
export async function createUser(
  email:        string,
  passwordHash: string,
): Promise<PublicUserWithTimestamp> {
  return prisma.user.create({
    data:   { email, passwordHash },
    select: {
      id:                     true,
      email:                  true,
      role:                   true,
      isActive:               true,
      isBanned:               true,
      createdAt:              true,
      onboardingCompletedAt:  true,
    },
  })
}

/**
 * Marks onboarding complete. Idempotent: returns existing timestamp if already set.
 */
export async function completeOnboarding(userId: string): Promise<Date | null> {
  const existing = await prisma.user.findUnique({
    where:  { id: userId },
    select: { onboardingCompletedAt: true },
  })
  if (!existing) return null
  if (existing.onboardingCompletedAt) return existing.onboardingCompletedAt

  const updated = await prisma.user.update({
    where:  { id: userId },
    data:   { onboardingCompletedAt: new Date() },
    select: { onboardingCompletedAt: true },
  })
  return updated.onboardingCompletedAt
}

/**
 * Auth-only. Used for account deletion after password confirmation.
 */
export async function findByIdWithPassword(
  id: string,
): Promise<UserWithPasswordAndOnboarding | null> {
  return prisma.user.findUnique({
    where:  { id },
    select: {
      id:                     true,
      email:                  true,
      passwordHash:           true,
      role:                   true,
      isActive:               true,
      isBanned:               true,
      onboardingCompletedAt:  true,
    },
  })
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash },
  })
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } })
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function encodeUserCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url')
}

function decodeUserCursor(cursor: string): { createdAt: Date; id: string } | null {
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

const adminUserSelect = {
  id:                    true,
  email:                 true,
  role:                  true,
  isActive:              true,
  isBanned:              true,
  banReason:             true,
  createdAt:             true,
  onboardingCompletedAt: true,
  profile: {
    select: {
      firstName: true,
      lastName:  true,
      headline:  true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.UserSelect

// ─── Admin: list users ────────────────────────────────────────────────────────

export async function listUsers(
  cursor?:   string,
  limit:     number = 20,
  search?:   string,
  role?:     Role,
  isBanned?: boolean,
): Promise<{ users: AdminUserListItem[]; nextCursor: string | null; total: number }> {
  const take = limit + 1

  let cursorDecoded: { createdAt: Date; id: string } | undefined
  if (cursor) {
    const d = decodeUserCursor(cursor)
    if (!d) return { users: [], nextCursor: null, total: 0 }
    cursorDecoded = d
  }

  const where: Prisma.UserWhereInput = {
    ...(role     !== undefined ? { role }     : {}),
    ...(isBanned !== undefined ? { isBanned } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { profile: { firstName: { contains: search, mode: 'insensitive' } } },
            { profile: { lastName:  { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
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

  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select:  adminUserSelect,
    }),
    prisma.user.count({ where: { ...(role !== undefined ? { role } : {}), ...(isBanned !== undefined ? { isBanned } : {}) } }),
  ])

  const hasMore    = rows.length > limit
  const slice      = hasMore ? rows.slice(0, limit) : rows
  const last       = slice[slice.length - 1]
  const nextCursor = hasMore && last ? encodeUserCursor(last.createdAt, last.id) : null

  return { users: slice as AdminUserListItem[], nextCursor, total }
}

// ─── Admin: get user detail ───────────────────────────────────────────────────

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: {
      ...adminUserSelect,
      _count: {
        select: {
          posts:               { where: { isDeleted: false } },
          sentConnections:     { where: { status: 'ACCEPTED' } },
          receivedConnections: { where: { status: 'ACCEPTED' } },
          jobsPosted:          true,
        },
      },
    },
  })
  if (!user) return null
  return user as AdminUserDetail
}

// ─── Admin: ban user ──────────────────────────────────────────────────────────

export async function banUser(
  targetId: string,
  reason:   string,
  actorId:  string,
): Promise<'ok' | 'not_found' | 'already_banned'> {
  const existing = await prisma.user.findUnique({
    where:  { id: targetId },
    select: { id: true, isBanned: true },
  })
  if (!existing) return 'not_found'
  if (existing.isBanned) return 'already_banned'

  await prisma.user.update({
    where: { id: targetId },
    data:  { isBanned: true, banReason: reason },
  })

  await AuditLogModel.logAction(actorId, 'BAN_USER', {
    targetId,
    metadata: { reason },
  })

  return 'ok'
}

// ─── Admin: unban user ────────────────────────────────────────────────────────

export async function unbanUser(
  targetId: string,
  actorId:  string,
): Promise<'ok' | 'not_found' | 'not_banned'> {
  const existing = await prisma.user.findUnique({
    where:  { id: targetId },
    select: { id: true, isBanned: true },
  })
  if (!existing) return 'not_found'
  if (!existing.isBanned) return 'not_banned'

  await prisma.user.update({
    where: { id: targetId },
    data:  { isBanned: false, banReason: null },
  })

  await AuditLogModel.logAction(actorId, 'UNBAN_USER', { targetId })

  return 'ok'
}

// ─── Admin: change role ───────────────────────────────────────────────────────

export async function changeRole(
  targetId: string,
  role:     Role,
  actorId:  string,
): Promise<'ok' | 'not_found' | 'no_change'> {
  const existing = await prisma.user.findUnique({
    where:  { id: targetId },
    select: { id: true, role: true },
  })
  if (!existing) return 'not_found'
  if (existing.role === role) return 'no_change'

  await prisma.user.update({
    where: { id: targetId },
    data:  { role },
  })

  await AuditLogModel.logAction(actorId, 'CHANGE_ROLE', {
    targetId,
    metadata: { from: existing.role, to: role },
  })

  return 'ok'
}
