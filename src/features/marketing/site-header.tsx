import { Menu } from 'lucide-react'
import { Container } from './container'
import { HeaderAuth } from './header-auth'
import { Logo } from './logo'

const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/#rules', label: 'The rules' },
  { href: '/faq', label: 'FAQ' },
]

const linkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-cloth-foreground/80 transition-colors hover:bg-cloth-foreground/10 hover:text-cloth-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cloth-foreground/50'

/** Sticky site header. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-cloth text-cloth-foreground border-b">
      <Container className="flex h-15 items-center justify-between gap-4">
        <a href="/" aria-label="TinyGig home" className="rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cloth-foreground/50">
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
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-cloth-foreground/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cloth-foreground/50 [&::-webkit-details-marker]:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-12 flex w-52 flex-col rounded-md border bg-popover p-1.5 text-popover-foreground shadow-lg"
            >
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
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
