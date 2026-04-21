import { z } from 'zod'

function isExpoPushTokenFormat(s: string): boolean {
  return (
    s.startsWith('ExponentPushToken[') ||
    s.startsWith('ExpoPushToken[')
  )
}

export const registerTokenSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict()
  .refine((d) => isExpoPushTokenFormat(d.token), {
    message: 'Token must be an Expo push token (ExponentPushToken[...] or ExpoPushToken[...])',
    path:    ['token'],
  })

export type RegisterTokenInput = z.infer<typeof registerTokenSchema>
