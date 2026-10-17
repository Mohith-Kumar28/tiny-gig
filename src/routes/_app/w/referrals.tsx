import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { WorkerReferrals } from '@/features/referrals/components/worker-referrals'
import { myReferralsQuery } from '@/features/referrals/queries'

export const Route = createFileRoute('/_app/w/referrals')({
  head: () => ({ meta: [{ title: 'Referrals · TinyGig' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myReferralsQuery()),
  component: ReferralsPage,
})

function ReferralsPage() {
  const { data } = useSuspenseQuery(myReferralsQuery())
  return <WorkerReferrals data={data} />
}
