import { SITE } from '@/lib/site'
import { Container } from './container'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'

const COLUMNS = [
  {
    title: 'TinyGig',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/faq', label: 'FAQ' },
      { href: '/login', label: 'Apply now' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/40">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 max-w-sm space-y-4 md:col-span-1">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Small paid social media gigs for people in India. Reviewed by humans, paid by UPI.
          </p>
          <p className="text-sm">
            <a
              href={`mailto:${SITE.email}`}
              className="font-medium underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              {SITE.email}
            </a>
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-4 text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container>
        <div className="flex flex-col gap-4 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl leading-relaxed">
          © {new Date().getFullYear()} {SITE.name}. Not affiliated with Reddit, X, LinkedIn, Meta or any other platform
          mentioned on this site. Platform names are trademarks of their owners.
        </p>
        <ThemeToggle />
        </div>
      </Container>
    </footer>
  )
}
