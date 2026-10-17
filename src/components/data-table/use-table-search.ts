import { useCallback } from 'react'
import type { SearchPatch } from './types'

type Navigate = (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace?: boolean; resetScroll?: boolean }) => unknown

/**
 * Merges a patch into URL search params. Any change other than `page` resets
 * paging to 1; `undefined` / empty arrays remove the key.
 */
export function useTableSearch(navigate: Navigate) {
  return useCallback(
    (patch: SearchPatch) => {
      navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => {
          const next: Record<string, unknown> = { ...prev, ...patch }
          if (!('page' in patch)) delete next.page
          for (const [k, v] of Object.entries(next)) {
            if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete next[k]
          }
          return next
        },
      })
    },
    [navigate],
  )
}
