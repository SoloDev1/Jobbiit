import { OAuth2Client } from 'google-auth-library'
import appleSignin from 'apple-signin-auth'
import { env } from '../config/env'

const googleClient = new OAuth2Client(env.GOOGLE_WEB_CLIENT_ID)

export interface OAuthIdentity {
  provider:  'google' | 'apple'
  subject:   string
  email:     string | null
  firstName: string | null  // ← add
  lastName:  string | null  // ← add
}

export async function verifyGoogleToken(idToken: string): Promise<OAuthIdentity> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: [env.GOOGLE_IOS_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID, env.GOOGLE_WEB_CLIENT_ID],
  })
  const payload = ticket.getPayload()
  if (!payload?.sub) throw new Error('Invalid Google token')

  return {
    provider:  'google',
    subject:   payload.sub,
    email:     payload.email ?? null,
    firstName: payload.given_name ?? null,   // ← Google provides these
    lastName:  payload.family_name ?? null,
  }
}

export async function verifyAppleToken(idToken: string): Promise<OAuthIdentity> {
  const payload = await appleSignin.verifyIdToken(idToken, {
    audience:         env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  })
  if (!payload.sub) throw new Error('Invalid Apple token')

  return {
    provider:  'apple',
    subject:   payload.sub,
    email:     payload.email ?? null,
    firstName: null,  // Apple name comes from the native credential, not the token
    lastName:  null,  // passed separately from the app via req.body
  }
}