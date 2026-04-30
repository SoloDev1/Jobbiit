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
    platform: z.enum(['IOS', 'ANDROID']),
  })
  .strict()
  .refine((d) => isExpoPushTokenFormat(d.token), {
    message: 'Token must be an Expo push token',
    path: ['token'],
  })

  
export type RegisterTokenInput = z.infer<typeof registerTokenSchema>
