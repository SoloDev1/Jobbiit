import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '../config/db'

function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

const TTL_MS = 60 * 60 * 1000

/**
 * Replaces any existing reset tokens for the user, stores a new hashed token, returns raw secret once.
 */
export async function createForUser(userId: string): Promise<{ raw: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString('base64url')
  const tokenHash = sha256(raw)
  const expiresAt = new Date(Date.now() + TTL_MS)

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ])

  return { raw, expiresAt }
}

/**
 * Validates token, deletes row (single-use), returns userId or null if invalid/expired.
 */
export async function consumeAndGetUserId(raw: string): Promise<string | null> {
  const tokenHash = sha256(raw)
  const row = await prisma.passwordResetToken.findUnique({
    where:  { tokenHash },
    select: { userId: true, expiresAt: true },
  })
  if (!row) return null

  await prisma.passwordResetToken.deleteMany({ where: { tokenHash } })

  if (row.expiresAt.getTime() < Date.now()) return null
  return row.userId
}
