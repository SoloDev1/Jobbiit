import { OAuth2Client } from 'google-auth-library'
import appleSignin from 'apple-signin-auth'
import { env } from '../config/env'

const googleClient = new OAuth2Client(env.GOOGLE_WEB_CLIENT_ID)

export interface OAuthIdentity {
  provider: 'google' | 'apple'
  subject:  string        // provider's stable user ID
  email:    string | null
}

export async function verifyGoogleToken(idToken: string): Promise<OAuthIdentity> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    // Accept tokens from both iOS and Android client IDs
    audience: [env.GOOGLE_IOS_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID, env.GOOGLE_WEB_CLIENT_ID],
  })
  const payload = ticket.getPayload()
  if (!payload?.sub) throw new Error('Invalid Google token')

  return {
    provider: 'google',
    subject:  payload.sub,
    email:    payload.email ?? null,
  }
}

export async function verifyAppleToken(idToken: string): Promise<OAuthIdentity> {
  const payload = await appleSignin.verifyIdToken(idToken, {
    audience:        env.APPLE_CLIENT_ID,   // your app's bundle ID
    ignoreExpiration: false,
  })
  if (!payload.sub) throw new Error('Invalid Apple token')

  return {
    provider: 'apple',
    subject:  payload.sub,
    email:    payload.email ?? null,        // Apple only sends email on first sign-in
  }
}