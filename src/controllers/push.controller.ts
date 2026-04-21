import type { Request, Response } from 'express'
import { sendSuccess } from '../utils/apiResponse'
import * as PushTokenModel from '../models/PushToken'
import type { RegisterTokenInput } from '../schemas/push.schema'

function userId(req: Request): string {
  return req.user!.id
}

export async function registerToken(req: Request, res: Response): Promise<void> {
  const { token } = req.body as RegisterTokenInput
  await PushTokenModel.upsertToken(userId(req), token)
  sendSuccess(res, { registered: true }, 'Push token registered')
}

export async function unregisterToken(req: Request, res: Response): Promise<void> {
  await PushTokenModel.deleteToken(userId(req))
  sendSuccess(res, { unregistered: true }, 'Push token removed')
}
