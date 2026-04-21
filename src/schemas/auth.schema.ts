import { z } from 'zod'

// One regex validates all password rules at once.
// The error message is intentionally generic — revealing which individual
// rule failed would help attackers enumerate the policy.
const PASSWORD_REQUIREMENTS =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address'),

    password: z
      .string()
      .min(8,  'Password does not meet requirements')
      // bcrypt silently truncates at 72 bytes — enforce the limit explicitly
      .max(72, 'Password does not meet requirements')
      .refine((val) => PASSWORD_REQUIREMENTS.test(val), {
        message: 'Password does not meet requirements',
      }),
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

export type SignupInput  = z.infer<typeof signupSchema>
export type LoginInput   = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
