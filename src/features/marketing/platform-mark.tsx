import { AtSign, Plus } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export type Platform = 'reddit' | 'x' | 'linkedin' | 'threads' | 'instagram' | 'more'

export const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: 'Reddit',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  instagram: 'Instagram',
  more: 'More platforms',
}

type PlatformMarkProps = { platform: Platform; className?: string; title?: string }

/** Simplified single-colour platform marks (currentColor). Not official logos. */
export function PlatformMark({ platform, className, title }: PlatformMarkProps) {
  const maskId = useId()
  const label = title ?? PLATFORM_LABEL[platform]
  const common =
    label === ''
      ? { className: cn('size-6 shrink-0', className), 'aria-hidden': true as const }
      : { className: cn('size-6 shrink-0', className), role: 'img' as const, 'aria-label': label }

  if (platform === 'threads') return <AtSign {...common} strokeWidth={2.25} />
  if (platform === 'more') return <Plus {...common} strokeWidth={2.25} />

  if (platform === 'x') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
        <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
      </svg>
    )
  }

  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (platform === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <circle cx="7.4" cy="7.4" r="1.7" fill="black" />
          <rect x="5.9" y="10" width="3" height="8" fill="black" />
          <path d="M10.9 10h2.8v1.2c.5-.8 1.5-1.4 2.8-1.4 2.2 0 3.2 1.4 3.2 3.8V18h-2.9v-4c0-1.1-.4-1.8-1.4-1.8s-1.6.7-1.6 1.8v4h-2.9z" fill="black" />
        </mask>
        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" mask={`url(#${maskId})`} />
      </svg>
    )
  }

  // reddit: simplified head-and-antenna mark
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <circle cx="8.8" cy="13.4" r="1.5" fill="black" />
        <circle cx="15.2" cy="13.4" r="1.5" fill="black" />
        <path d="M8.9 16.6c1.9 1.3 4.3 1.3 6.2 0" stroke="black" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </mask>
      <g fill="currentColor">
        <ellipse cx="12" cy="14.6" rx="8.2" ry="5.9" mask={`url(#${maskId})`} />
        <circle cx="4.6" cy="11.2" r="2" />
        <circle cx="19.4" cy="11.2" r="2" />
        <circle cx="17.6" cy="4.4" r="1.7" />
      </g>
      <path d="M12 8.7 13.3 3.6l4.3 0.8" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
