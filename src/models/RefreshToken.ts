import { createHash } from 'node:crypto'
import { prisma } from '../config/db'

export interface StoredToken {
  id:        string
  userId:    string
  expiresAt: Date
}

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * All functions in this module hash the raw token before any DB operation.
 * A DB breach therefore never exposes tokens that can be replayed.
 */
function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Persist a refresh token. Stores only the SHA-256 hash — never the raw token.
 */
export async function storeToken(
  rawToken:  string,
  userId:    string,
  expiresAt: Date,
): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      token:     sha256(rawToken),
      userId,
      expiresAt,
    },
  })
}

/**
 * Look up a token record by raw token value.
 * Hashes the input before querying, so the raw token never touches the DB.
 */
export async function findToken(rawToken: string): Promise<StoredToken | null> {
  return prisma.refreshToken.findUnique({
    where:  { token: sha256(rawToken) },
    select: { id: true, userId: true, expiresAt: true },
  })
}

/**
 * Delete a single token by raw value.
 * Uses deleteMany so it silently succeeds when the token is not found.
 */
export async function deleteToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token: sha256(rawToken) },
  })
}

/**
 * Delete ALL refresh tokens for a user.
 * Called on reuse detection to invalidate every active session immediately.
 */
export async function deleteAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  })
}
