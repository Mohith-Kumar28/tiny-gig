import { Menu } from 'lucide-react'
import { Container } from './container'
import { HeaderAuth } from './header-auth'
import { Logo } from './logo'

const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' },
]

const linkClass =
  'rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="/" aria-label="TinyGig home" className="rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60">
          <Logo />
        </a>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderAuth />
          {/* CSS-only mobile menu */}
          <details className="group relative md:hidden">
            <summary
              aria-label="Open menu"
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-12 flex w-52 flex-col rounded-2xl border bg-popover p-2 text-popover-foreground shadow-[0_20px_50px_-20px_oklch(0.3_0.05_50/0.35)]"
            >
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </Container>
    </header>
  )
}
