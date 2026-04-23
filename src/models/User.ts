import { prisma } from '../config/db'
import type { Role } from '@prisma/client'

// ─── Shapes returned by each query ───────────────────────────────────────────
// passwordHash is NEVER included in these public types.

export interface PublicUser {
  id:       string
  email:    string
  role:     Role
  isActive: boolean
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

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * General-purpose lookup. Does NOT return passwordHash.
 * Use everywhere except authentication.
 */
export async function findByEmail(email: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true, role: true, isActive: true },
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
