import { logger } from '../config/logger'
import * as PushToken from '../models/PushToken'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE    = 100

type ExpoMessage = {
  to:       string
  title:    string
  body:     string
  data:     Record<string, unknown>
  sound:    string
  badge:    number
  priority: string
}

async function postToExpo(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return

  const res = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: {
      Accept:         'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    parsed = text
  }

  if (!res.ok) {
    logger.error({ status: res.status, body: parsed }, 'Expo push API error')
    return
  }

  logger.info({ messageCount: messages.length, response: parsed }, 'Expo push sent')
}

/**
 * Send a single push. Never throws — failures are logged only.
 */
export async function sendPushToUser(
  userId: string,
  title:  string,
  body:   string,
  data?:  Record<string, unknown>,
): Promise<void> {
  try {
    const token = await PushToken.getTokenByUserId(userId)
    if (!token) return

    const message: ExpoMessage = {
      to:       token,
      title,
      body,
      data:     data ?? {},
      sound:    'default',
      badge:    1,
      priority: 'high',
    }

    await postToExpo([message])
  } catch (err) {
    logger.error({ err, userId }, 'sendPushToUser failed')
  }
}

/**
 * Bulk send. Never throws.
 */
export async function sendPushToUsers(
  userIds: string[],
  title:   string,
  body:    string,
  data?:   Record<string, unknown>,
): Promise<void> {
  try {
    const tokens = await PushToken.getTokensByUserIds(userIds)
    if (tokens.length === 0) return

    const payload = data ?? {}

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const chunk = tokens.slice(i, i + BATCH_SIZE)
      const messages: ExpoMessage[] = chunk.map((to) => ({
        to,
        title,
        body,
        data:     payload,
        sound:    'default',
        badge:    1,
        priority: 'high',
      }))
      await postToExpo(messages)
    }
  } catch (err) {
    logger.error({ err, userIds }, 'sendPushToUsers failed')
  }
}
