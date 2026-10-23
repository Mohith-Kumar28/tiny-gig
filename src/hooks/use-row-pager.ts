import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

export type RowPager = {
  /** 0-based position of the open row, or -1 when it isn't on this page. */
  index: number
  total: number
  hasPrev: boolean
  hasNext: boolean
  prev: () => void
  next: () => void
  /** After acting on a row: open the next one, or close the sheet at the end of the list. */
  advance: () => void
}

/**
 * Previous / next through the rows of a table from the sheet that shows one of them, so repeat
 * work (approve, review, mark paid) never needs close → click the next row → wait.
 *
 * Remembers the last position: when acting on a row removes it from the list (an approved
 * applicant leaves "Pending"), "next" is whatever slid into its place.
 */
export function useRowPager<T>(
  rows: readonly T[] | undefined,
  getId: (row: T) => string,
  openId: string | null,
  open: (row: T | null) => void,
): RowPager {
  const list = rows ?? []
  const found = openId ? list.findIndex((r) => getId(r) === openId) : -1
  const last = useRef(-1)
  if (found >= 0) last.current = found
  const gone = openId !== null && found < 0
  const index = found
  const go = (i: number) => {
    const row = list[i]
    if (row) open(row)
  }
  const nextIndex = gone ? last.current : index + 1
  return {
    index,
    total: list.length,
    hasPrev: (gone ? last.current : index) > 0,
    hasNext: nextIndex >= 0 && nextIndex < list.length,
    prev: () => go((gone ? last.current : index) - 1),
    next: () => go(nextIndex),
    advance: () => open(list[nextIndex] ?? null),
  }
}

/**
 * Previous / next on a detail page (a gig, a worker) through the list the admin came from,
 * read from the React Query cache, so the same filters and sort apply. Also returns that
 * list's search so "Back" lands on the filtered list, not the default one.
 */
export function useCachedListPager<T>(
  listKey: readonly unknown[],
  id: string,
  getId: (row: T) => string,
  go: (id: string) => void,
): { pager?: RowPager; search?: Record<string, unknown> } {
  const qc = useQueryClient()
  const hit = qc
    .getQueryCache()
    .findAll({ queryKey: listKey })
    .filter((q) => {
      const rows = (q.state.data as { rows?: T[] } | undefined)?.rows
      return Array.isArray(rows) && rows.some((r) => getId(r) === id)
    })
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]
  const rows = (hit?.state.data as { rows?: T[] } | undefined)?.rows
  const pager = useRowPager(rows, getId, id, (r) => r && go(getId(r)))
  if (!hit) return {}
  const search = hit.queryKey[listKey.length] as Record<string, unknown> | undefined
  return { pager, search: search && typeof search === 'object' ? search : undefined }
}
