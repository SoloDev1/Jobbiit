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
  createdAt: Date
}

export interface UserWithPassword extends PublicUser {
  passwordHash: string
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
): Promise<UserWithPassword | null> {
  return prisma.user.findUnique({
    where:  { email },
    select: {
      id:           true,
      email:        true,
      passwordHash: true,
      role:         true,
      isActive:     true,
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
      id:        true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
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
      id:        true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
    },
  })
}
