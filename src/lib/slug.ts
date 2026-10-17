import { createId } from './id'

export function slugify(text: string) {
  const base = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 60)
  return `${base || 'gig'}-${createId().slice(0, 5)}`
}
