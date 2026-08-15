import { z } from 'zod'

// One regex validates all password rules at once.
// The error message is intentionally generic — revealing which individual
// rule failed would help attackers enumerate the policy.
const signupPasswordField = z
  .string()
  .min(8,  'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters')

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address'),

    password: signupPasswordField,
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address'),

    // No min/max on login password — different length errors would confirm
    // account existence by leaking which validation path ran.
    password: z.string(),
  })
  .strict()

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict()

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  })
  .strict()

export const resetPasswordSchema = z
  .object({
    token:    z.string().min(1, 'Token is required'),
    password: signupPasswordField,
  })
  .strict()

export const forgotPasswordOtpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  })
  .strict()

export const verifyOtpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
    new_password: signupPasswordField,
  })
  .strict()

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
  })
  .strict()

export const oauthSigninSchema = z.object({
  provider:  z.enum(['google', 'apple']),
  idToken:   z.string().min(1),
  firstName: z.string().trim().max(50).optional(),
  lastName:  z.string().trim().max(50).optional(),
}).strict()


export type SignupInput  = z.infer<typeof signupSchema>
export type LoginInput   = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ForgotPasswordOtpInput = z.infer<typeof forgotPasswordOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
