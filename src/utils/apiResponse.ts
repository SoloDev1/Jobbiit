import type { Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import type { PaginationMeta } from './pagination'

export interface ApiSuccess<T> {
  success: true
  message: string
  data:    T
  meta?:   PaginationMeta | Record<string, unknown>
}

export interface ApiError {
  success: false
  message: string
  code?:   string
  errors?: unknown
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  status: number = StatusCodes.OK,
  meta?: PaginationMeta | Record<string, unknown>,
): Response<ApiSuccess<T>> {
  const body: ApiSuccess<T> = { success: true, message, data }
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Created',
): Response<ApiSuccess<T>> {
  return sendSuccess(res, data, message, StatusCodes.CREATED)
}

export function sendNoContent(res: Response): Response {
  return res.status(StatusCodes.NO_CONTENT).send()
}

export function sendError(
  res: Response,
  message: string,
  status: number = StatusCodes.BAD_REQUEST,
  code?: string,
  errors?: unknown,
): Response<ApiError> {
  const body: ApiError = { success: false, message }
  if (code)   body.code   = code
  if (errors) body.errors = errors
  return res.status(status).json(body)
}
