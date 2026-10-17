import { UserButton } from '@daveyplate/better-auth-ui'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ShieldCheck } from 'lucide-react'
import { homeFor } from '@/features/auth/guards'
import { viewerQuery } from '@/features/auth/queries'
import { CtaLink } from './cta-link'

const linkClass =
  'rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60'

/** Sign in / Apply when signed out; Dashboard + avatar menu when signed in. Viewer is prefetched on the server. */
export function HeaderAuth() {
  const { data: viewer } = useQuery(viewerQuery())
  if (!viewer) {
    return (
      <>
        <a href="/login" className={`${linkClass} hidden sm:inline-flex`}>
          Sign in
        </a>
        <CtaLink href="/login" className="h-9 px-4 sm:h-10 sm:px-5">
          Apply now
        </CtaLink>
      </>
    )
  }
  const home = homeFor(viewer)
  return (
    <>
      <CtaLink href={home} className="h-9 px-4 sm:h-10 sm:px-5">
        <LayoutDashboard className="size-4" aria-hidden />
        Dashboard
      </CtaLink>
      <UserButton
        size="icon"
        className="size-9 rounded-full"
        additionalLinks={[
          { href: home, label: 'Dashboard', icon: <LayoutDashboard />, signedIn: true },
          { href: '/account/security', label: 'Security', icon: <ShieldCheck />, signedIn: true },
        ]}
      />
    </>
  )
}
