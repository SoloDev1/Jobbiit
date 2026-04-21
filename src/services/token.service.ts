import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'node:crypto'
import { env } from '../config/env'
import * as RefreshTokenModel from '../models/RefreshToken'

// ─── Payload shapes ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub:  string
  role: string
  type: 'access'
  jti:  string
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub:  string
  type: 'refresh'
  jti:  string
  iat?: number
  exp?: number
}

export interface GeneratedRefreshToken {
  rawToken:    string
  hashedToken: string
  expiresAt:   Date
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Parse a duration string like '30d', '15m', '1h' into milliseconds.
 * Used to compute the expiresAt Date that we store in the DB alongside
 * the hashed token — the DB record is our revocation source of truth.
 */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/)
  if (!match) {
    throw new Error(`Unparseable JWT duration: "${duration}"`)
  }
  const value = parseInt(match[1], 10)
  const units: Record<string, number> = {
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000,
  }
  return value * units[match[2]]
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

/**
 * Issue a short-lived access token.
 * Includes jti (JWT ID) so individual tokens can be revoked in future.
 * Signs with JWT_ACCESS_SECRET — a different secret from refresh tokens.
 */
export function signAccess(userId: string, role: string): string {
  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    sub:  userId,
    role,
    type: 'access',
    jti:  randomUUID(),
  }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

/**
 * Issue a long-lived refresh token.
 * Signs with JWT_REFRESH_SECRET — deliberately separate from access tokens
 * so a leaked access secret cannot be used to forge refresh tokens.
 */
export function signRefresh(userId: string): string {
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    sub:  userId,
    type: 'refresh',
    jti:  randomUUID(),
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * Verify an access token.
 * Throws JsonWebTokenError / TokenExpiredError on failure — callers must catch.
 * Explicitly rejects tokens signed for the refresh endpoint (type guard).
 */
export function verifyAccess(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as AccessTokenPayload

  if (payload.type !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid token type')
  }
  return payload
}

/**
 * Verify a refresh token.
 * Explicitly rejects tokens signed for the access endpoint (type guard).
 * Using a separate secret means access tokens are cryptographically
 * ineligible as refresh tokens even if type check were bypassed.
 */
export function verifyRefresh(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  }) as RefreshTokenPayload

  if (payload.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token type')
  }
  return payload
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Generate a new refresh token for a user.
 * Returns the raw token (to send to client), the SHA-256 hash (for DB),
 * and the expiry Date (so the DB record mirrors JWT expiry).
 */
export function generateRefreshToken(userId: string): GeneratedRefreshToken {
  const rawToken    = signRefresh(userId)
  const hashedToken = sha256(rawToken)
  const expiresAt   = new Date(
    Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  )
  return { rawToken, hashedToken, expiresAt }
}

/**
 * Generate and persist a new refresh token.
 * Returns the raw token so the controller can send it to the client.
 * The DB only ever stores the hash.
 */
export async function storeRefresh(userId: string): Promise<string> {
  const { rawToken, expiresAt } = generateRefreshToken(userId)
  await RefreshTokenModel.storeToken(rawToken, userId, expiresAt)
  return rawToken
}

/**
 * Rotate a refresh token: delete the old one, issue and store a new one.
 * Returns the new raw token to send to the client.
 */
export async function rotateRefresh(
  oldRawToken: string,
  userId:      string,
): Promise<string> {
  await RefreshTokenModel.deleteToken(oldRawToken)
  const { rawToken, expiresAt } = generateRefreshToken(userId)
  await RefreshTokenModel.storeToken(rawToken, userId, expiresAt)
  return rawToken
}

/**
 * Confirm a raw refresh token exists in the DB and has not expired.
 * Returns the stored record or null — null signals token reuse or expiry.
 */
export async function validateStoredRefresh(
  rawToken: string,
): Promise<RefreshTokenModel.StoredToken | null> {
  const record = await RefreshTokenModel.findToken(rawToken)
  if (!record) return null
  if (record.expiresAt <= new Date()) return null
  return record
}
