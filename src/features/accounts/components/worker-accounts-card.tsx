import { Link } from '@tanstack/react-router'
import { ExternalLink, Plus } from 'lucide-react'
import { useState } from 'react'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate } from '@/components/shared/relative-time'
import { Button } from '@/components/ui/button'
import type { AccountStanding } from '@/db/schema/enums'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { accountAgeDays, accountLabel, formatAge, levelFor } from '../rules'
import { adminAddAccount } from '../server/roster'
import { LevelBadge, platformIconFor } from './account-columns'
import { CreatedOnEditor, istDateInputToMs, KarmaEditor, StandingSelect } from './account-editors'
import { AddAccountDialog } from './add-account-dialog'

type Account = {
  id: string
  platform: string
  handle: string
  url: string
  createdOn: Date | null
  createdOnConfirmedAt: Date | null
  karma: number | null
  karmaUpdatedAt: Date | null
  standing: AccountStanding
}

/** A worker's accounts on their admin page, with the same one-click edits as the roster. */
export function WorkerAccountsCard({ workerId, accounts, karmaStaleDays = 30 }: { workerId: string; accounts: Account[]; karmaStaleDays?: number }) {
  const [adding, setAdding] = useState(false)
  const add = useAction(
    (v: { platform: Account['platform']; url: string; createdOn: string; karma: string }) =>
      adminAddAccount({
        data: {
          workerId,
          platform: v.platform as never,
          url: v.url,
          createdOn: v.createdOn ? istDateInputToMs(v.createdOn) : undefined,
          karma: v.karma === '' ? undefined : Number(v.karma),
        },
      }),
    { success: 'Account added', invalidate: [['admin', 'worker', workerId], ['admin', 'accounts']], onSuccess: () => setAdding(false) },
  )
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-display text-base font-bold">
          Accounts <span className="font-normal text-muted-foreground tabular">· {accounts.length}</span>
        </h2>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm" className="h-7">
            <Link to="/admin/accounts" search={{ workerId, platform: ['reddit', 'x', 'linkedin', 'threads', 'instagram', 'facebook'] }}>
              Open in roster
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-7" onClick={() => setAdding(true)}>
            <Plus /> Add account
          </Button>
        </div>
      </div>
      <ul className="divide-y">
        {accounts.map((a) => {
          const stale = a.karma == null || !a.karmaUpdatedAt || Date.now() - a.karmaUpdatedAt.getTime() > karmaStaleDays * 86_400_000
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
              <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex min-w-40 items-center gap-1.5 font-medium hover:underline">
                <PlatformIcon platform={platformIconFor(a.platform)} />
                {accountLabel(a.platform, a.handle)}
                <ExternalLink className="size-3 opacity-50" />
              </a>
              {a.platform === 'reddit' ? (
                <>
                  <CreatedOnEditor id={a.id} createdOn={a.createdOn} confirmed={!!a.createdOnConfirmedAt}>
                    <span className="inline-flex items-center gap-1.5">
                      <LevelBadge level={levelFor(a.createdOn)} />
                      <span className={cn('text-xs tabular', a.createdOnConfirmedAt ? 'text-muted-foreground' : 'text-warning-foreground dark:text-warning')}>
                        {formatAge(accountAgeDays(a.createdOn))}
                        {a.createdOn ? ` · ${formatDate(a.createdOn)}` : ''}
                        {a.createdOn && !a.createdOnConfirmedAt ? ' (unconfirmed)' : ''}
                      </span>
                    </span>
                  </CreatedOnEditor>
                  <KarmaEditor id={a.id} karma={a.karma} updatedAt={a.karmaUpdatedAt} stale={stale} />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{a.karma != null ? `${formatNumber(a.karma)} followers/karma` : ''}</span>
              )}
              <div className="ml-auto">
                <StandingSelect id={a.id} value={a.standing} />
              </div>
            </li>
          )
        })}
        {!accounts.length ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No accounts on file. Use Add account to record the ones they post from, so they show in the register.
          </li>
        ) : null}
      </ul>
      <AddAccountDialog
        open={adding}
        onOpenChange={setAdding}
        title="Add an account for this worker"
        description="Creation dates you enter here count as confirmed."
        pending={add.isPending}
        onSubmit={(v) => add.mutate(v)}
      />
    </section>
  )
}
