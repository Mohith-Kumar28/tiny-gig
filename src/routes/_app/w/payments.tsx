import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { WorkerPayments } from '@/features/payouts/components/worker-payments'
import { myEarningsQuery } from '@/features/payouts/queries'
import { myProfileQuery } from '@/features/workers/queries'

export const Route = createFileRoute('/_app/w/payments')({
  head: () => ({ meta: [{ title: 'Earnings · TinyGig' }] }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(myProfileQuery())
    return context.queryClient.ensureQueryData(myEarningsQuery())
  },
  component: PaymentsPage,
})

function PaymentsPage() {
  const { data: earnings } = useSuspenseQuery(myEarningsQuery())
  const { data: profile } = useQuery(myProfileQuery())
  return <WorkerPayments earnings={earnings} upiId={profile?.upiId} />
}
