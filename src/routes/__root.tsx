import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AuthUiProvider } from '@/components/shared/auth-ui-provider'
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/components/shared/theme-provider'
import { viewerQuery } from '@/features/auth/queries'
import { getAuthConfig } from '@/features/auth/server/auth-config'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SITE } from '@/lib/site'
import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: SITE.title },
      { name: 'description', content: SITE.description },
      { name: 'theme-color', content: '#e2561f' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'TinyGig' },
      { property: 'og:site_name', content: SITE.name },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      // Installable app: needed for push on iPhone (Add to Home Screen) and a nicer Android install.
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  loader: async ({ context }) => {
    const [config] = await Promise.all([getAuthConfig(), context.queryClient.ensureQueryData(viewerQuery())])
    return config
  },
  staleTime: Number.POSITIVE_INFINITY,
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const { google } = Route.useLoaderData()
  return (
    <AuthUiProvider google={google}>
      <Outlet />
    </AuthUiProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster richColors closeButton position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
