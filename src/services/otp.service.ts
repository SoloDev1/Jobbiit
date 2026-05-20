import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

const OTP_TTL_MS = 10 * 60 * 1000

export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_TTL_MS)
}

/** Cryptographically secure 6-digit numeric OTP (100000–999999). */
export function generateSixDigitOtp(): string {
  return String(randomInt(100_000, 1_000_000))
}

export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

export function otpMatches(storedHash: string, submitted: string): boolean {
  const a = Buffer.from(storedHash, 'hex')
  const b = Buffer.from(hashOtp(submitted), 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function isOtpExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() < Date.now()
}
