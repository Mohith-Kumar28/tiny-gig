import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/d1'
import { inArray } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import type { Db } from '@/db/client'
import { D1_MAX_PARAMS, inChunks, insertMany } from '@/db/in-chunks'
import * as schema from '@/db/schema'

/** A drizzle client whose batch records each statement's bound parameters instead of running it. */
function recordingDb() {
  const db = drizzle({} as D1Database, { schema }) as unknown as Db
  const params: number[] = []
  db.batch = (async (stmts: { toSQL(): { params: unknown[] } }[]) => {
    for (const s of stmts) params.push(s.toSQL().params.length)
    return stmts.map(() => [{}])
  }) as never
  return { db, params }
}

describe('batched D1 statements', () => {
  it('splits a 500-row notification insert into statements under the cap, sent as one batch', async () => {
    const { db, params } = recordingDb()
    const rows = Array.from({ length: 500 }, (_, i) => ({ userId: `u${i}`, title: 'New gig', body: 'b', href: '/w' }))
    await insertMany(db, schema.notification, rows, (chunk) => db.insert(schema.notification).values(chunk))
    expect(Math.max(...params)).toBeLessThanOrEqual(D1_MAX_PARAMS)
    expect(params.length).toBeGreaterThan(1)
  })

  it('keeps fully filled email-log rows under the cap', async () => {
    const { db, params } = recordingDb()
    const rows = Array.from({ length: 300 }, (_, i) => ({
      to: `w${i}@x.in`,
      template: 'newGig',
      subject: 's',
      status: 'sent' as const,
      providerId: 'p',
      error: 'e',
    }))
    await insertMany(db, schema.emailLog, rows, (chunk) => db.insert(schema.emailLog).values(chunk))
    expect(Math.max(...params)).toBeLessThanOrEqual(D1_MAX_PARAMS)
  })

  it('splits a long id lookup and returns rows from every chunk', async () => {
    const { db, params } = recordingDb()
    const ids = Array.from({ length: 250 }, (_, i) => `id${i}`)
    const rows = await inChunks(db, ids, (chunk) =>
      db.select().from(schema.workerProfile).where(inArray(schema.workerProfile.userId, chunk)),
    )
    expect(Math.max(...params)).toBeLessThanOrEqual(D1_MAX_PARAMS)
    expect(rows).toHaveLength(params.length)
  })

  it('runs nothing for an empty list', async () => {
    const { db, params } = recordingDb()
    expect(await inChunks(db, [], (chunk) => db.select().from(schema.user).where(inArray(schema.user.id, chunk)))).toEqual([])
    expect(params).toEqual([])
  })
})

/**
 * Guard: every `inArray(…)` and `.values(…)` in src must take a list with a fixed small size or sit
 * inside an in-chunks helper. Otherwise it works in dev and breaks once prod has 100+ rows to send
 * (the gig-publish outage, 2026-10-29). Anything else bounded needs a `// d1-bounded: why` line above.
 */
describe('no unbounded D1 statements in src', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []
    })

  /** Text of the call starting at `open` (the index of its `(`), through the matching `)`. */
  const callArgs = (src: string, open: number) => {
    let depth = 0
    for (let i = open; i < src.length; i++) {
      if (src[i] === '(') depth++
      else if (src[i] === ')' && --depth === 0) return src.slice(open + 1, i)
    }
    return src.slice(open + 1)
  }
  const insideHelper = (src: string, at: number) =>
    [...src.slice(0, at).matchAll(/\b(inChunks|inBatches|insertMany)\(/g)].some((m) => {
      const open = (m.index ?? 0) + m[0].length - 1
      return open + 1 + callArgs(src, open).length >= at
    })

  const marked = (src: string, at: number) => {
    const lines = src.slice(0, at).split('\n')
    return /\/\/ d1-bounded: \S/.test(lines.at(-2) ?? '')
  }
  const lineOf = (src: string, at: number) => src.slice(0, at).split('\n').length

  // Lists that stay small: string literals, enum facet filters (bounded by the enum).
  const BOUNDED = [
    /^\[\s*('[^']*'\s*,?\s*)*\]$/,
    /^data\.(status|platform|taskType|role|template|rule|source|state)$/,
    /^TAB_STATUSES\[tab\]$/,
  ]

  it('every inArray takes a bounded list or is chunked', () => {
    const offenders: string[] = []
    for (const file of files('src')) {
      if (file.endsWith('in-chunks.ts')) continue
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/\binArray\(/g)) {
        const at = m.index ?? 0
        const list =
          callArgs(src, at + m[0].length - 1)
            .split(/,(.+)/s)[1]
            ?.trim() ?? ''
        if (BOUNDED.some((re) => re.test(list)) || insideHelper(src, at) || marked(src, at)) continue
        offenders.push(`${file}:${lineOf(src, at)} inArray(…, ${list})`)
      }
    }
    expect(offenders, 'Wrap these in inChunks/inBatches from @/db/in-chunks').toEqual([])
  })

  it('every multi-row insert is sized by insertMany', () => {
    const offenders: string[] = []
    for (const file of files('src')) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/\.insert\([^)]*\)\s*\.values\(/g)) {
        const at = m.index ?? 0
        const arg = callArgs(src, at + m[0].length - 1).trim()
        if (arg.startsWith('{') || insideHelper(src, at) || marked(src, at)) continue
        offenders.push(`${file}:${lineOf(src, at)} .values(${arg.slice(0, 40)})`)
      }
    }
    expect(offenders, 'Use insertMany from @/db/in-chunks for row lists').toEqual([])
  })
})
