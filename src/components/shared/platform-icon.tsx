import type { Platform } from '@/db/schema/enums'
import { cn } from '@/lib/utils'

export const PLATFORM_LABELS: Record<Platform, string> = {
  reddit: 'Reddit',
  x: 'X',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  instagram: 'Instagram',
  other: 'Other',
}

const PATHS: Record<Platform, string> = {
  reddit:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5.9 11.4c0 2.6-2.6 4.3-5.9 4.3s-5.9-1.7-5.9-4.3c0-.4.1-.8.2-1.2a1.4 1.4 0 1 1 1.6-2.2 7.6 7.6 0 0 1 3.7-1.1l.8-3.6 2.5.5a1 1 0 1 1-.1.8l-1.9-.4-.6 2.7c1.4.1 2.7.5 3.6 1.1a1.4 1.4 0 1 1 1.8 2.1c.1.4.2.8.2 1.3ZM9.5 13.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm5 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm-.1 1.6a.3.3 0 0 0-.4 0c-.5.4-1.2.6-2 .6s-1.5-.2-2-.6a.3.3 0 0 0-.4.4c.6.5 1.5.8 2.4.8s1.8-.3 2.4-.8a.3.3 0 0 0 0-.4Z',
  x: 'M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.2-8.2L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z',
  linkedin:
    'M20.4 3H3.6C3.3 3 3 3.3 3 3.6v16.8c0 .3.3.6.6.6h16.8c.3 0 .6-.3.6-.6V3.6c0-.3-.3-.6-.6-.6ZM8.3 18.3H5.7V9.8h2.6v8.5ZM7 8.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm11.3 9.7h-2.6v-4.1c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.2H10V9.8h2.5v1.2c.4-.7 1.2-1.4 2.5-1.4 2.7 0 3.2 1.8 3.2 4v4.7Z',
  threads:
    'M16.7 11.2c-.1 0-.2-.1-.3-.1-.2-3-1.8-4.7-4.6-4.7-1.7 0-3 .7-3.9 2l1.5 1c.6-1 1.6-1.2 2.4-1.2 1 0 1.7.3 2.1.9.3.4.5 1 .6 1.7-.8-.1-1.6-.2-2.5-.1-2.5.1-4.1 1.6-4 3.6.1 1 .6 1.9 1.4 2.4.7.5 1.6.7 2.6.6 1.3-.1 2.3-.6 3-1.4.5-.7.9-1.5 1-2.6.6.4 1.1.9 1.3 1.5.4 1 .4 2.7-1 4-1.2 1.2-2.6 1.7-4.8 1.7-2.4 0-4.2-.8-5.4-2.3-1.1-1.4-1.7-3.4-1.7-6s.6-4.6 1.7-6c1.2-1.5 3-2.3 5.4-2.3 2.4 0 4.2.8 5.4 2.3.6.7 1 1.6 1.3 2.7l1.8-.5c-.4-1.3-.9-2.5-1.7-3.4C17.5 3 15.2 2 12.3 2h-.1C9.3 2 7 3 5.5 4.9 4.2 6.6 3.5 9 3.5 12s.7 5.4 2 7.1C7 21 9.3 22 12.2 22h.1c2.6 0 4.4-.7 5.9-2.2 2-2 1.9-4.4 1.3-5.9-.5-1.1-1.4-2-2.8-2.7Zm-4.5 4.3c-1.1.1-2.2-.4-2.2-1.4-.1-.8.5-1.6 2.3-1.7h.6c.7 0 1.3.1 1.9.2-.2 2.4-1.4 2.8-2.6 2.9Z',
  instagram:
    'M12 3c2.4 0 2.7 0 3.7.1 1 0 1.6.2 2 .4.5.2.9.4 1.3.8.4.4.6.8.8 1.3.2.4.3 1 .4 2 0 1 .1 1.3.1 3.7s0 2.7-.1 3.7c0 1-.2 1.6-.4 2-.2.5-.4.9-.8 1.3-.4.4-.8.6-1.3.8-.4.2-1 .3-2 .4-1 0-1.3.1-3.7.1s-2.7 0-3.7-.1c-1 0-1.6-.2-2-.4-.5-.2-.9-.4-1.3-.8-.4-.4-.6-.8-.8-1.3-.2-.4-.3-1-.4-2C3 14.7 3 14.4 3 12s0-2.7.1-3.7c0-1 .2-1.6.4-2 .2-.5.4-.9.8-1.3.4-.4.8-.6 1.3-.8.4-.2 1-.3 2-.4C8.3 3 8.6 3 12 3Zm0 4.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.8-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z',
  other:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 17.9A8 8 0 0 1 4 12c0-.6.1-1.2.2-1.8L9 15v1a2 2 0 0 0 2 2v1.9Zm6.9-2.5A2 2 0 0 0 16 16h-1v-3a1 1 0 0 0-1-1H8v-2h2a1 1 0 0 0 1-1V7h2a2 2 0 0 0 2-2v-.4a8 8 0 0 1 2.9 12.8Z',
}

const COLORS: Record<Platform, string> = {
  reddit: 'text-[#ff4500]',
  x: 'text-foreground',
  linkedin: 'text-[#0a66c2] dark:text-[#4d9fe8]',
  threads: 'text-foreground',
  instagram: 'text-[#d62976]',
  other: 'text-muted-foreground',
}

export function PlatformIcon({ platform, className, colored = true }: { platform: Platform; className?: string; colored?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label={PLATFORM_LABELS[platform]}
      role="img"
      className={cn('size-4 shrink-0 fill-current', colored && COLORS[platform], className)}
    >
      <path d={PATHS[platform]} />
    </svg>
  )
}

export function PlatformLabel({ platform, community }: { platform: Platform; community?: string | null }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
      <PlatformIcon platform={platform} />
      <span className="truncate">{community || PLATFORM_LABELS[platform]}</span>
    </span>
  )
}
