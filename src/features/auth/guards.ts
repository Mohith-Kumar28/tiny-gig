import { redirect } from '@tanstack/react-router'
import type { Viewer } from './server/viewer'

/** Where a signed-in user belongs based on role + application status. */
export function homeFor(viewer: Viewer): '/admin' | '/w' | '/onboarding' | '/pending' {
  if (viewer.user.role === 'admin') return '/admin'
  if (viewer.profileStatus === 'approved') return '/w'
  if (viewer.profileStatus === 'none' || viewer.profileStatus === 'draft') return '/onboarding'
  return '/pending'
}

export function requireViewer(viewer: Viewer | null, href?: string): Viewer {
  if (!viewer) throw redirect({ to: '/login', search: href ? { redirect: href } : {} })
  return viewer
}
