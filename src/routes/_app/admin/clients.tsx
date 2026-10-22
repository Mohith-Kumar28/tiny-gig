import { createFileRoute } from '@tanstack/react-router'
import { ClientsManager } from '@/features/clients/components/clients-manager'
import { clientsQuery } from '@/features/clients/queries'

export const Route = createFileRoute('/_app/admin/clients')({
  head: () => ({ meta: [{ title: 'Clients · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQuery()),
  component: ClientsManager,
})
