import { asc, type Column, desc, type SQL } from 'drizzle-orm'
import { z } from 'zod'

/** Base URL search params every server-driven table understands. */
export const tableSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  perPage: z.number().int().min(5).max(200).optional().catch(undefined),
  sort: z.string().optional().catch(undefined),
  q: z.string().trim().max(200).optional().catch(undefined),
})
export type TableSearch = z.infer<typeof tableSearchSchema>

/** Multi-select facet param, e.g. `?status=["pending","approved"]`. */
export const facet = <T extends readonly [string, ...string[]]>(values: T) =>
  z.array(z.enum(values)).optional().catch(undefined)

export const DEFAULT_PER_PAGE = 20

export function pageArgs(search: TableSearch) {
  const perPage = search.perPage ?? DEFAULT_PER_PAGE
  const page = search.page ?? 1
  return { limit: perPage, offset: (page - 1) * perPage, page, perPage }
}

/** Parses `field.asc|desc` against an allow-list of sortable columns. */
export function orderByFrom(
  sort: string | undefined,
  columns: Record<string, Column | SQL>,
  fallback: SQL,
): SQL[] {
  if (!sort) return [fallback]
  const [field, dir] = sort.split('.')
  const col = field ? columns[field] : undefined
  if (!col) return [fallback]
  return [dir === 'asc' ? asc(col) : desc(col), fallback]
}

export type Paginated<T> = { rows: T[]; total: number; page: number; perPage: number; pageCount: number }

export function paginated<T>(rows: T[], total: number, page: number, perPage: number): Paginated<T> {
  return { rows, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) }
}
