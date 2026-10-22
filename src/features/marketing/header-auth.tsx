import { UserButton } from '@daveyplate/better-auth-ui'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ShieldCheck } from 'lucide-react'
import { homeFor } from '@/features/auth/guards'
import { viewerQuery } from '@/features/auth/queries'
import { CtaLink } from './cta-link'

const linkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-cloth-foreground/80 transition-colors hover:text-cloth-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cloth-foreground/50'

/** Sign in / Apply when signed out; Dashboard + avatar menu when signed in. Sits on the red cloth header. */
export function HeaderAuth() {
  const { data: viewer } = useQuery(viewerQuery())
  if (!viewer) {
    return (
      <>
        <a href="/login" className={`${linkClass} hidden sm:inline-flex`}>
          Sign in
        </a>
        <CtaLink href="/login" variant="paper" className="h-9 px-4">
          Apply now
        </CtaLink>
      </>
    )
  }
  const home = homeFor(viewer)
  return (
    <>
      <CtaLink href={home} variant="paper" className="h-9 px-4">
        <LayoutDashboard className="size-4" aria-hidden />
        Dashboard
      </CtaLink>
      <UserButton
        size="icon"
        className="size-9 rounded-md"
        additionalLinks={[
          { href: home, label: 'Dashboard', icon: <LayoutDashboard />, signedIn: true },
          { href: '/account/security', label: 'Security', icon: <ShieldCheck />, signedIn: true },
        ]}
      />
    </>
  )
}
