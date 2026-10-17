import { env } from '@/lib/env'
import { AppError } from './middleware'

/** Fixed-window limiter on KV. Good enough to stop abuse; not a precise counter. */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds)
  const k = `rl:${key}:${bucket}`
  const current = Number((await env.CACHE.get(k)) ?? 0)
  if (current >= limit) throw new AppError('RATE_LIMITED', 'Too many attempts. Please wait a moment.')
  await env.CACHE.put(k, String(current + 1), { expirationTtl: Math.max(60, windowSeconds * 2) })
}
