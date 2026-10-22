import { SITE } from '@/lib/site'
import { Container } from './container'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'

const LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/login', label: 'Apply now' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-double border-foreground/70">
      <Container className="flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Small paid posting gigs for people in India. Reviewed by people, paid by UPI.
          </p>
          <a href={`mailto:${SITE.email}`} className="inline-block text-sm font-semibold text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
            {SITE.email}
          </a>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5 sm:grid-cols-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container>
        <div className="flex flex-col gap-4 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl leading-relaxed">
            © {new Date().getFullYear()} {SITE.name}. Not affiliated with Reddit, X, LinkedIn, Meta or any other platform named
            here. Platform names are trademarks of their owners.
          </p>
          <ThemeToggle />
        </div>
      </Container>
    </footer>
  )
}
