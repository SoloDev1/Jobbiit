import bcrypt from 'bcrypt'
import { env } from '../config/env'

const BCRYPT_MAX_BYTES = 72

/**
 * A pre-computed dummy hash used in login when the user email is not found.
 * Calling bcrypt.compare against this hash keeps response time constant
 * regardless of whether the account exists — preventing timing attacks that
 * would otherwise reveal account existence.
 *
 * Computed once at module load so every login attempt pays the same cost.
 */
export const DUMMY_HASH: string = bcrypt.hashSync('dummy-constant-password', 12)

/**
 * Hash a plaintext password with bcrypt.
 * Throws if the password exceeds 72 bytes — bcrypt silently truncates beyond
 * that limit, which would allow two distinct passwords to hash identically.
 * The Zod schema should catch this first, but we enforce it here as a second
 * line of defence.
 */
export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
    throw new Error('Password exceeds maximum allowed length')
  }
  return bcrypt.hash(password, env.BCRYPT_ROUNDS)
}

/**
 * Timing-safe password verification.
 * MUST be called even when the user account does not exist (pass DUMMY_HASH)
 * so the response time is indistinguishable between "wrong email" and
 * "wrong password" scenarios.
 */
export async function verifyPassword(
  plain: string,
  hash:  string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
