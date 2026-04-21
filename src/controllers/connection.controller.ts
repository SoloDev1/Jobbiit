import type { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNoContent,
} from '../utils/apiResponse'
import * as ConnectionModel from '../models/Connection'
import * as notificationService from '../services/notification.service'

const uuidParam = z.string().uuid()

function userId(req: Request): string {
  return req.user!.id
}

// ─── sendRequest ──────────────────────────────────────────────────────────────

export async function sendRequest(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.userId)
  if (!parsed.success) {
    sendError(res, 'Invalid user id', 400, 'INVALID_ID')
    return
  }

  const result = await ConnectionModel.sendRequest(userId(req), parsed.data)

  if (!result.ok) {
    if (result.reason === 'self') {
      sendError(res, 'Cannot connect to yourself', 400, 'SELF_CONNECTION')
      return
    }
    sendError(res, 'Connection already exists', 409, 'CONFLICT')
    return
  }

  logger.info(
    { requesterId: userId(req), receiverId: parsed.data, connectionId: result.row.id },
    'Connection request sent',
  )

  notificationService.createNotification(
    parsed.data,
    'NEW_CONNECTION_REQUEST',
    'You have a new connection request',
    result.row.id,
    userId(req),
  )

  sendCreated(res, result.row, 'Connection request sent')
}

// ─── acceptConnection ─────────────────────────────────────────────────────────

export async function acceptConnection(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.connectionId)
  if (!parsed.success) {
    sendError(res, 'Invalid connection id', 400, 'INVALID_ID')
    return
  }

  const result = await ConnectionModel.acceptConnection(parsed.data, userId(req))

  if (result === null) {
    sendError(res, 'Connection request not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ connectionId: parsed.data, userId: userId(req) }, 'Connection accepted')

  notificationService.createNotification(
    result.senderId,
    'CONNECTION_ACCEPTED',
    'Your connection request was accepted',
    parsed.data,
    userId(req),
  )

  sendSuccess(res, result, 'Connection accepted')
}

// ─── declineConnection ────────────────────────────────────────────────────────

export async function declineConnection(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.connectionId)
  if (!parsed.success) {
    sendError(res, 'Invalid connection id', 400, 'INVALID_ID')
    return
  }

  const result = await ConnectionModel.declineConnection(parsed.data, userId(req))

  if (result === null) {
    sendError(res, 'Connection request not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ connectionId: parsed.data, userId: userId(req) }, 'Connection declined')

  sendSuccess(res, result, 'Connection declined')
}

// ─── removeConnection ─────────────────────────────────────────────────────────

export async function removeConnection(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.connectionId)
  if (!parsed.success) {
    sendError(res, 'Invalid connection id', 400, 'INVALID_ID')
    return
  }

  const result = await ConnectionModel.removeConnection(parsed.data, userId(req))

  if (result === 'not_found') {
    sendError(res, 'Connection not found', 404, 'NOT_FOUND')
    return
  }
  if (result === 'forbidden') {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  logger.info({ connectionId: parsed.data, userId: userId(req) }, 'Connection removed')

  sendNoContent(res)
}

// ─── getConnections ───────────────────────────────────────────────────────────

export async function getConnections(req: Request, res: Response): Promise<void> {
  const connections = await ConnectionModel.getConnections(userId(req))
  sendSuccess(res, connections, 'Connections loaded')
}

// ─── getPendingRequests ───────────────────────────────────────────────────────

export async function getPendingRequests(req: Request, res: Response): Promise<void> {
  const requests = await ConnectionModel.getPendingRequests(userId(req))
  sendSuccess(res, requests, 'Pending requests loaded')
}

// ─── getSuggestions ───────────────────────────────────────────────────────────

export async function getSuggestions(req: Request, res: Response): Promise<void> {
  const limitParsed = z.coerce.number().int().positive().max(50).default(10).safeParse(
    req.query.limit,
  )
  const limit = limitParsed.success ? limitParsed.data : 10

  const suggestions = await ConnectionModel.getSuggestions(userId(req), limit)
  sendSuccess(res, suggestions, 'Suggestions loaded')
}
