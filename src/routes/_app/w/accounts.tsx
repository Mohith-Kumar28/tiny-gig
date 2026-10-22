import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MyAccounts } from '@/features/accounts/components/my-accounts'
import { myAccountsQuery } from '@/features/accounts/queries'

export const Route = createFileRoute('/_app/w/accounts')({
  head: () => ({ meta: [{ title: 'My accounts · TinyGig' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myAccountsQuery()),
  component: AccountsPage,
})

function AccountsPage() {
  const { data } = useSuspenseQuery(myAccountsQuery())
  return <MyAccounts accounts={data} />
}
