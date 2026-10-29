import { getTableColumns, type Table } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from './client'

/**
 * D1 allows at most 100 bound parameters per statement. Anything sized by data (an id list, a row
 * per worker) goes through these helpers: split to fit, then sent to D1 together in one round trip.
 * tests/d1-param-limit.test.ts fails the build when a query skips them.
 */
export const D1_MAX_PARAMS = 100

/** Ids per `IN (...)` list, leaving room for the statement's other parameters. */
export const IN_CHUNK_SIZE = 90

type Stmt = BatchItem<'sqlite'>

/** Rows per multi-row INSERT into `table`, at most one bound parameter per column. */
export function rowsPerInsert(table: Table) {
  return Math.max(1, Math.floor(D1_MAX_PARAMS / Object.keys(getTableColumns(table)).length))
}

/** One statement per `size` items, all sent in one D1 batch (one round trip, atomic). Per-statement results. */
export async function inBatches<T, Q extends Stmt>(
  db: Db,
  items: readonly T[],
  size: number,
  build: (chunk: T[]) => Q,
): Promise<Q['_']['result'][]> {
  const stmts: Q[] = []
  for (let i = 0; i < items.length; i += size) stmts.push(build(items.slice(i, i + size)))
  if (!stmts.length) return []
  return db.batch(stmts as [Q, ...Q[]])
}

/** A lookup (or update/delete … returning) by a long id list. Rows from every chunk, flattened. */
export async function inChunks<Q extends Stmt>(
  db: Db,
  ids: readonly string[],
  build: (chunk: string[]) => Q,
): Promise<Q['_']['result']> {
  return (await inBatches(db, ids, IN_CHUNK_SIZE, build)).flat()
}

/** Multi-row insert sized to the table. */
export function insertMany<T, Q extends Stmt>(db: Db, table: Table, rows: readonly T[], build: (chunk: T[]) => Q) {
  return inBatches(db, rows, rowsPerInsert(table), build)
}
