import { createFileRoute, redirect } from '@tanstack/react-router'
import { homeFor } from '@/features/auth/guards'

/** Post-login landing: sends each user to the right home. */
export const Route = createFileRoute('/_app/app')({
  beforeLoad: ({ context }) => {
    throw redirect({ to: homeFor(context.viewer) })
  },
})
