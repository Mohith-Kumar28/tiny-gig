import { integer, text } from 'drizzle-orm/sqlite-core'
import { createId } from '@/lib/id'

export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => createId())

export const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' })

export const createdAt = () =>
  timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date())

export const updatedAt = () =>
  timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
