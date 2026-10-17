import { Gift, Link2, Sparkles, Users } from 'lucide-react'
import { CopyButton } from '@/components/shared/copy-button'
import { EmptyState } from '@/components/shared/empty-state'
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
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
        done ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

export function WorkerReferrals({ data }: { data: Data }) {
  const earned = data.rewards.filter((r) => r.status !== 'void').reduce((s, r) => s + r.amount, 0)
  const message = 'I earn money doing small social media tasks on TinyGig. Join with my link:'

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" description="Invite friends who are active on Reddit. You both can earn rewards." />

      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Link2 className="size-4" /> Your referral link
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-background p-2 pl-3">
              <span className="min-w-0 flex-1 truncate font-mono text-sm sm:text-base">{data.link}</span>
              <CopyButton value={data.link} label="Copy" variant="default" size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              Or share your code: <span className="font-mono font-semibold text-foreground">{data.code}</span>{' '}
              <CopyButton value={data.code} className="size-6 align-middle" />
            </p>
          </div>
          <ShareButtons link={data.link} message={message} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary/15 pt-4 sm:max-w-md">
          <div>
            <p className="text-xs text-muted-foreground">People joined</p>
            <p className="font-display text-2xl font-semibold tabular">{data.referees.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rewards earned</p>
            <p className="font-display text-2xl font-semibold tabular">{formatMoney(earned)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Active programs</h2>
          {data.programs.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {data.programs.map((p) => {
                const pct = p.progress.target ? (p.progress.current / p.progress.target) * 100 : 0
                return (
                  <article key={p.id} className="space-y-3 rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display font-semibold">{p.name}</h3>
                      {p.referrerReward > 0 ? (
                        <Money paise={p.referrerReward} className="shrink-0 font-display text-lg font-semibold text-primary" />
                      ) : null}
                    </div>
                    {p.description ? <p className="text-sm text-muted-foreground">{p.description}</p> : null}
                    <p className="text-sm">{describeProgram(p)}</p>
                    {p.endsAt ? <p className="text-xs text-muted-foreground">Ends {formatDate(p.endsAt)}</p> : null}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {p.progress.done ? 'Completed' : 'Progress to next reward'}
                        </span>
                        <span className="font-medium tabular">
                          {p.progress.current} / {p.progress.target}
                        </span>
                      </div>
                      <Progress value={pct} className={cn('h-2', p.progress.done && '[&>*]:bg-success')} />
                      {p.progress.earned > 0 ? (
                        <p className="text-xs font-medium text-success">
                          Earned {p.progress.earned} reward{p.progress.earned === 1 ? '' : 's'} from this program
                        </p>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={Gift} title="No referral programs right now" description="You can still share your link. New programs will count people who join." />
          )}
        </section>

        <aside className="space-y-3">
          <h2 className="font-display text-lg font-semibold">How it works</h2>
          <ol className="space-y-3 rounded-xl border bg-card p-4 text-sm">
            {[
              'Share your link or code with friends.',
              'They apply on TinyGig and get approved.',
              'When they reach a program milestone, you get a reward.',
              'We verify the reward, then add it to your balance.',
            ].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
            <li className="flex gap-2 border-t pt-3 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0" /> Fake or duplicate accounts are not counted.
            </li>
          </ol>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">People you referred</h2>
          {data.referees.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {data.referees.map((r) => (
                <li key={r.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-muted-foreground">Joined {formatDate(r.attributedAt)}</span>
                    <Milestone done={Boolean(r.approvedAt)}>Approved</Milestone>
                    <Milestone done={Boolean(r.firstGigApprovedAt)}>First gig</Milestone>
                    {r.gigsApproved > 0 ? <Milestone done>{r.gigsApproved} gigs</Milestone> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="No one yet" description="Share your link. People who join with it will show up here." />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Reward history</h2>
          {data.rewards.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {data.rewards.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.programName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.role === 'referee' ? 'Joining bonus' : 'Referral reward'} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} label={REWARD_LABELS[r.status]} />
                  <Money paise={r.amount} className={cn('w-16 shrink-0 text-right text-sm', r.status === 'void' && 'text-muted-foreground line-through')} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Gift} title="No rewards yet" description="Rewards appear here once a referred friend hits a milestone." />
          )}
        </section>
      </div>
    </div>
  )
}
