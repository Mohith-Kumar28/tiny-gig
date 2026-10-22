import { inArray, isNull, or, type SQL, type SQLWrapper } from 'drizzle-orm'
import { z } from 'zod'

/** Filter value for "work with no client tag". */
export const NO_CLIENT = 'none'

/** Search param for client filters: a list of client ids, plus NO_CLIENT. */
export const clientFacet = z.array(z.string().max(40)).max(50).optional().catch(undefined)

/** Single client column (gig, submission): match any picked client, or untagged. */
export function clientWhere(column: SQLWrapper, ids: string[] | undefined): SQL | undefined {
  if (!ids?.length) return undefined
  const real = ids.filter((id) => id !== NO_CLIENT)
  const parts: SQL[] = []
  if (real.length) parts.push(inArray(column as never, real))
  if (ids.includes(NO_CLIENT)) parts.push(isNull(column as never))
  return parts.length === 1 ? parts[0] : or(...parts)
}
