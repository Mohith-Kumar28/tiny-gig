import { Link } from '@tanstack/react-router'
import { Check, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AccountLossNotice } from '@/features/consent/components/account-loss-notice'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { accountLabel, formatAge, istDayKey, LEVEL_LABELS } from '../rules'
import { addMyAccount, type listMyAccounts, removeMyAccount, updateMyAccount } from '../server/my-accounts'
import { LevelBadge, platformIconFor } from './account-columns'
import { AddAccountDialog } from './add-account-dialog'

type Account = Awaited<ReturnType<typeof listMyAccounts>>[number]

function KarmaQuickEdit({ a }: { a: Account }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const save = useAction((karma: number) => updateMyAccount({ data: { id: a.id, karma } }), {
    success: 'Karma updated',
    invalidate: [['w', 'accounts']],
    onSuccess: () => setOpen(false),
  })
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(a.karma == null ? '' : String(a.karma))
      }}
    >
      <PopoverTrigger asChild>
        <Button variant={a.karmaStale ? 'default' : 'outline'} size="sm" className="h-8 text-xs">
          <Pencil /> Update karma
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3">
        <p className="text-xs text-muted-foreground">Your current karma on {accountLabel(a.platform, a.handle)}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft !== '') save.mutate(Math.max(0, Math.round(Number(draft))))
          }}
        >
          <Input
            autoFocus
            type="number"
            inputMode="numeric"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm" className="h-8" disabled={save.isPending}>
            <Check />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function CreatedOnQuickEdit({ a }: { a: Account }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const save = useAction((createdOn: string) => updateMyAccount({ data: { id: a.id, createdOn } }), {
    success: 'Date saved',
    invalidate: [['w', 'accounts']],
    onSuccess: () => setOpen(false),
  })
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(a.createdOn ? istDayKey(a.createdOn) : '')
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
          {a.createdOn ? `since ${formatDate(a.createdOn)}` : 'add date'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2 p-3">
        <p className="text-xs text-muted-foreground">When was this account created? Check its “Cake day”.</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft) save.mutate(draft)
          }}
        >
          <Input
            autoFocus
            type="date"
            max={istDayKey(new Date())}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm" className="h-8" disabled={save.isPending || !draft}>
            <Check />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function Figure({ k, children, muted }: { k: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-2 first:pl-0">
      <dt className="ledger-label text-[0.64rem]">{k}</dt>
      <dd className={cn('mt-0.5 truncate text-sm font-semibold tabular', muted && 'text-muted-foreground')}>{children}</dd>
    </div>
  )
}

/** One account as a ruled ledger entry: who it is, then level, age, karma and work done as figures. */
function AccountRow({ a }: { a: Account }) {
  const remove = useAction(() => removeMyAccount({ data: { id: a.id } }), {
    success: 'Account removed',
    invalidate: [['w', 'accounts']],
  })
  const reddit = a.platform === 'reddit'
  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex items-center gap-2.5">
        <PlatformIcon platform={platformIconFor(a.platform)} className="size-4.5 shrink-0" />
        <a
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1 font-semibold underline-offset-2 hover:text-ink hover:underline"
        >
          <span className="truncate">{accountLabel(a.platform, a.handle)}</span>
          <ExternalLink className="size-3 shrink-0 opacity-60" />
        </a>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <StatusBadge status={a.standing} />
          {reddit ? <LevelBadge level={a.level} /> : null}
        </div>
      </div>

      {reddit ? (
        <dl className="grid grid-cols-3 divide-x border-y">
          <Figure k="Age">
            {formatAge(a.ageDays)}
            <span className="block truncate text-[11px] font-normal text-muted-foreground">
              {a.createdOnConfirmed ? a.createdOn ? `since ${formatDate(a.createdOn)}` : '—' : <CreatedOnQuickEdit a={a} />}
            </span>
          </Figure>
          <Figure k="Karma" muted={a.karmaStale}>
            {a.karma == null ? '—' : formatNumber(a.karma)}
            <span
              className={cn(
                'block truncate text-[11px] font-normal',
                a.karmaStale ? 'text-warning-foreground dark:text-warning' : 'text-muted-foreground',
              )}
            >
              {a.karmaStale ? 'please update' : a.karmaUpdatedAt ? formatDate(a.karmaUpdatedAt) : 'never updated'}
            </span>
          </Figure>
          <Figure k="Tasks done">{a.tasksDone}</Figure>
        </dl>
      ) : null}

      {reddit && a.level === 'warmup' && a.next ? (
        <p className="rounded-md border border-ink/25 bg-ink/[0.05] px-3 py-2 text-xs">
          Warming up: build karma and history from the{' '}
          <Link to="/w/warmup" className="font-medium text-ink underline underline-offset-2">
            Warm-up
          </Link>{' '}
          page. Paid gigs open for this account on <strong>{formatDate(a.next.at)}</strong>.
        </p>
      ) : reddit && a.next ? (
        <p className="text-xs text-muted-foreground">
          Reaches {LEVEL_LABELS[a.next.level]} on {formatDate(a.next.at)}. Older accounts earn more per task.
        </p>
      ) : null}

      {reddit || a.tasksDone === 0 ? (
        <div className="flex items-center justify-end gap-2">
          {a.tasksDone === 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 /> Remove
            </Button>
          ) : null}
          {reddit ? <KarmaQuickEdit a={a} /> : null}
        </div>
      ) : null}
    </li>
  )
}

export function MyAccounts({ accounts }: { accounts: Account[] }) {
  const [adding, setAdding] = useState(false)
  const add = useAction(
    (v: { platform: Account['platform']; url: string; createdOn: string; karma: string }) =>
      addMyAccount({ data: { platform: v.platform, url: v.url, createdOn: v.createdOn, karma: v.karma } }),
    { success: 'Account added', invalidate: [['w', 'accounts']], onSuccess: () => setAdding(false) },
  )
  const reddit = accounts.filter((a) => a.platform === 'reddit')
  const others = accounts.filter((a) => a.platform !== 'reddit')
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="My accounts"
        description="Every account you work from. Pay depends on the age of the account that does the task."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add account
          </Button>
        }
      />
      <AccountLossNotice />
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
          <h2 className="font-display text-base font-bold">Reddit</h2>
          <span className="text-xs text-muted-foreground">Pay level comes from account age</span>
        </div>
        {reddit.length ? (
          <ul className="divide-y">
            {reddit.map((a) => (
              <AccountRow key={a.id} a={a} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 px-4 py-5 text-sm">
            <p className="text-muted-foreground">
              No Reddit account yet. Add the account you post from: older accounts earn more per task.
            </p>
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add a Reddit account
            </Button>
          </div>
        )}
      </section>
      {others.length ? (
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-2.5">
            <h2 className="font-display text-base font-bold">Other platforms</h2>
          </div>
          <ul className="divide-y">
            {others.map((a) => (
              <AccountRow key={a.id} a={a} />
            ))}
          </ul>
        </section>
      ) : null}
      <AddAccountDialog
        open={adding}
        onOpenChange={setAdding}
        description="Add every account you can work from. Each account can only be registered by one person."
        pending={add.isPending}
        onSubmit={(v) => add.mutate(v)}
      />
    </div>
  )
}
