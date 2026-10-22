import { cn } from '@/lib/utils'

export const TAG_COLORS = ['slate', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'] as const
export type TagColor = (typeof TAG_COLORS)[number]

const DOT: Record<TagColor, string> = {
  slate: 'bg-slate-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-green-600',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
}

export function tagDot(color: string) {
  return DOT[color as TagColor] ?? DOT.slate
}

/** Admin-only client tag. Never render this in worker-facing UI (R44). */
export function ClientChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 max-w-40 items-center gap-1.5 rounded-md bg-muted px-1.5 text-xs whitespace-nowrap',
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', tagDot(color))} />
      <span className="truncate">{name}</span>
    </span>
  )
}
