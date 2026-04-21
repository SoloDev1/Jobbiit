import { z } from 'zod'

export const DEFAULT_PAGE  = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT     = 100

export const paginationQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface PaginationParams {
  page:  number
  limit: number
  skip:  number
  take:  number
}

export interface PaginationMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
  hasNext:    boolean
  hasPrev:    boolean
}

export function parsePagination(query: unknown): PaginationParams {
  const { page, limit } = paginationQuerySchema.parse(query ?? {})
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  }
}

export function buildPaginationMeta(
  total: number,
  params: Pick<PaginationParams, 'page' | 'limit'>,
): PaginationMeta {
  const totalPages = params.limit > 0 ? Math.ceil(total / params.limit) : 0
  return {
    page:       params.page,
    limit:      params.limit,
    total,
    totalPages,
    hasNext:    params.page < totalPages,
    hasPrev:    params.page > 1,
  }
}

export interface Paginated<T> {
  items: T[]
  meta:  PaginationMeta
}

export function paginate<T>(
  items: T[],
  total: number,
  params: Pick<PaginationParams, 'page' | 'limit'>,
): Paginated<T> {
  return { items, meta: buildPaginationMeta(total, params) }
}
