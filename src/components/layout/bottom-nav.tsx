import { Link, useRouterState } from '@tanstack/react-router'
import { isNavActive, type NavItem } from './nav'
import { cn } from '@/lib/utils'

/** Phone-only tab bar. Thumb-reachable, 5 items max, safe-area aware. */
export function BottomNav({ items, badges }: { items: NavItem[]; badges?: Record<string, number> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map((item) => {
          const active = isNavActive(item, pathname)
          const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="relative">
                  <item.icon className={cn('size-5.5', active && 'stroke-[2.25]')} />
                  {badge ? (
                    <span className="absolute -top-1.5 -right-2.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
