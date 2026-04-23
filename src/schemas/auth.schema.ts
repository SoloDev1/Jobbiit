import { z } from 'zod'

// One regex validates all password rules at once.
// The error message is intentionally generic — revealing which individual
// rule failed would help attackers enumerate the policy.
const PASSWORD_REQUIREMENTS =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

const signupPasswordField = z
  .string()
  .min(8,  'Password does not meet requirements')
  .max(72, 'Password does not meet requirements')
  .refine((val) => PASSWORD_REQUIREMENTS.test(val), {
    message: 'Password does not meet requirements',
  })

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address'),

    password: signupPasswordField,
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

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
  })
  .strict()

export type SignupInput  = z.infer<typeof signupSchema>
export type LoginInput   = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
