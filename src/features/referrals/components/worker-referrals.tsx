import { Check, Circle } from 'lucide-react'
import { CopyButton } from '@/components/shared/copy-button'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Progress } from '@/components/ui/progress'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describeProgram } from '../rules'
import type { getMyReferrals } from '../server/referrals'
import { ShareButtons } from './share-buttons'

type Data = Awaited<ReturnType<typeof getMyReferrals>>

const REWARD_LABELS: Record<string, string> = { pending_review: 'Verifying', approved: 'Approved', paid: 'Paid', void: 'Void' }

function Milestone({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs', done ? 'font-medium text-foreground' : 'text-muted-foreground')}
    >
      {done ? (
        <Check className="size-3.5 text-success" aria-label="Done" />
      ) : (
        <Circle className="size-3 opacity-50" aria-label="Not yet" />
      )}
      {children}
    </span>
  )
}

function PanelHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {children}
    </div>
  )
}

/** Progress as tally marks, the way a ledger keeps count. */
function Tally({ current, target, done }: { current: number; target: number; done: boolean }) {
  if (target > 24) return null
  return (
    <span aria-hidden className="flex gap-[3px]">
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-3.5 w-[3px] rounded-[1px]',
            i < current ? (done ? 'bg-success' : 'bg-foreground/70') : 'bg-foreground/12',
          )}
        />
      ))}
    </span>
  )
}

export function WorkerReferrals({ data }: { data: Data }) {
  const earned = data.rewards.filter((r) => r.status !== 'void').reduce((s, r) => s + r.amount, 0)
  const message = 'I earn money doing small social media tasks on TinyGig. Join with my link:'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        description="Share your link. When people you invite get approved and finish gigs, you earn the rewards below."
      />

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="space-y-3 p-4 sm:p-5">
          <h2 className="font-display text-base font-bold">Your referral link</h2>
          <div className="flex items-center gap-2 rounded-md border bg-background py-1.5 pr-1.5 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{data.link}</span>
            <CopyButton value={data.link} label="Copy" variant="default" size="sm" />
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            Or share your code: <span className="font-mono font-semibold text-foreground">{data.code}</span>
            <CopyButton value={data.code} className="size-7" />
          </p>
          <ShareButtons link={data.link} message={message} />
        </div>
        <dl className="grid grid-cols-2 divide-x border-t">
          <div className="px-4 py-3 sm:px-5">
            <dt className="ledger-label">People joined</dt>
            <dd className="mt-0.5 font-display text-2xl font-bold tabular">{data.referees.length}</dd>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <dt className="ledger-label">Rewards earned</dt>
            <dd className="mt-0.5 font-display text-2xl font-bold tabular">{formatMoney(earned)}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <PanelHead title="Rewards you can earn" />
        {data.programs.length ? (
          <ul className="divide-y">
            {data.programs.map((p) => {
              const tracksReferrer = p.referrerReward > 0
              const pct = p.progress.target ? (p.progress.current / p.progress.target) * 100 : 0
              return (
                <li key={p.id} className="space-y-2.5 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Money
                      paise={tracksReferrer ? p.referrerReward : p.refereeReward}
                      className="shrink-0 font-display text-lg leading-none font-extrabold"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{describeProgram(p)}</p>
                  {p.endsAt ? <p className="text-xs text-muted-foreground">Ends {formatDate(p.endsAt)}</p> : null}
                  {tracksReferrer ? (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {p.progress.done
                          ? 'Done'
                          : p.progress.earned > 0
                            ? `Earned ${p.progress.earned} · next reward`
                            : 'Next reward'}
                      </span>
                      <span className="flex items-center gap-2">
                        {p.progress.target > 24 ? (
                          <Progress value={pct} className={cn('h-1.5 w-24', p.progress.done && '[&>*]:bg-success')} />
                        ) : (
                          <Tally current={p.progress.current} target={p.progress.target} done={p.progress.done} />
                        )}
                        <span className="font-semibold tabular">
                          {p.progress.current} of {p.progress.target}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <p className="ledger-label">Bonus for your friends</p>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-4 py-5 text-sm text-muted-foreground">
            No reward programs are running right now. Your link still works, so keep sharing it.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="overflow-hidden rounded-lg border bg-card">
          <PanelHead title="People you referred" />
          {data.referees.length ? (
            <ul className="divide-y">
              {data.referees.map((r) => (
                <li key={r.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{r.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs text-muted-foreground tabular">Joined {formatDate(r.attributedAt)}</span>
                    <Milestone done={Boolean(r.approvedAt)}>Approved</Milestone>
                    <Milestone done={Boolean(r.firstGigApprovedAt)}>First gig</Milestone>
                    {r.gigsApproved > 0 ? (
                      <span className="text-xs font-medium tabular">
                        {r.gigsApproved} gig{r.gigsApproved === 1 ? '' : 's'} approved
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-muted-foreground">
              No one yet. Send your link on WhatsApp to friends who are active on Reddit. They show up here as soon as they sign
              up.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border bg-card">
          <PanelHead title="Reward history" />
          {data.rewards.length ? (
            <ul className="divide-y">
              {data.rewards.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.programName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.role === 'referee' ? 'Joining bonus' : 'Referral reward'} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} label={REWARD_LABELS[r.status]} />
                  <span className="w-16 shrink-0 text-right font-display font-bold tabular">
                    <span
                      className={cn(
                        r.status === 'paid' && 'ledger-total',
                        r.status === 'void' && 'ledger-struck text-muted-foreground',
                      )}
                    >
                      {formatMoney(r.amount)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-muted-foreground">
              No rewards yet. Rewards appear here once someone you invited meets a program’s goal, and are paid with your weekly
              payout.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
