import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, CheckCheck, ChevronsUpDown, Inbox, Keyboard, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { DataTableSearch } from '@/components/data-table/data-table-search'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORMS } from '@/db/schema/enums'
import { gigOptionsQuery } from '@/features/gigs/queries'
import { reviewCountsQuery, reviewQueueQuery } from '@/features/submissions/queries'
import { REVIEW_TABS, type ReviewTab, reviewSearchSchema } from '@/features/submissions/server/admin-review'
import { type QueueRow, ReviewQueueItem } from '@/features/submissions/components/review-queue-item'
import { ReviewShortcutsDialog } from '@/features/submissions/components/review-shortcuts-dialog'
import { SubmissionReviewPanel } from '@/features/submissions/components/submission-review-panel'
import { useReviewDecision } from '@/features/submissions/components/use-review-decision'
import { DecisionDialog } from '@/features/workers/components/decision-dialog'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { cn } from '@/lib/utils'

const TAB_LABELS: Record<ReviewTab, string> = {
  needs_review: 'Needs review',
  on_hold: 'On hold (live 24h)',
  insights_overdue: 'Insights overdue',
  live_check_due: 'Live check due (old flow)',
  live_check: 'In live check (old flow)',
  changes_requested: 'Changes requested',
  all: 'All',
}

export const Route = createFileRoute('/_app/admin/review')({
  head: () => ({ meta: [{ title: 'Review inbox · TinyGig Admin' }] }),
  validateSearch: reviewSearchSchema,
  loaderDeps: ({ search }) => {
    const { selected: _s, ...rest } = search
    return rest
  },
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(reviewQueueQuery(deps)),
  component: ReviewInbox,
})

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return desktop
}

function ReviewInbox() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const tab = search.tab ?? 'needs_review'
  const isDesktop = useIsDesktop()

  const { data, isFetching } = useQuery({ ...reviewQueueQuery(search), placeholderData: keepPreviousData })
  const { data: counts } = useQuery(reviewCountsQuery())
  const rows = data?.rows ?? []

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulkDialog, setBulkDialog] = useState<'reject' | 'changes' | null>(null)
  const [help, setHelp] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  /** Items decided this session, hidden immediately while the list refetches. */
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const visible = useMemo(() => rows.filter((r) => !hidden.has(r.id)), [rows, hidden])
  const selectedId = search.selected && visible.some((r) => r.id === search.selected) ? search.selected : undefined
  const activeId = selectedId ?? (isDesktop ? visible[0]?.id : undefined)
  const activeIndex = visible.findIndex((r) => r.id === activeId)

  useEffect(() => {
    // Reset local state whenever the queue definition changes.
    setChecked(new Set())
    setHidden(new Set())
  }, [tab, search.q, search.gigId, search.platform?.join(), search.page])

  const select = (id: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, selected: id }), replace: true, resetScroll: false })

  const move = (delta: number) => {
    if (!visible.length) return
    const next = visible[Math.min(visible.length - 1, Math.max(0, (activeIndex < 0 ? -1 : activeIndex) + delta))]
    if (next) select(next.id)
  }

  useEffect(() => {
    if (!activeId) return
    listRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const afterDecision = (ids: string[]) => {
    const nextHidden = new Set(hidden)
    for (const id of ids) nextHidden.add(id)
    setHidden(nextHidden)
    setChecked(new Set())
    const remaining = visible.filter((r) => !nextHidden.has(r.id))
    const next = remaining[Math.min(Math.max(activeIndex, 0), remaining.length - 1)]
    select(next?.id)
  }

  const bulk = useReviewDecision({
    onDone: (v) => {
      setBulkDialog(null)
      afterDecision(v.ids)
    },
  })
  const checkedIds = [...checked]

  useHotkeys({
    j: () => move(1),
    arrowdown: () => move(1),
    k: () => move(-1),
    arrowup: () => move(-1),
    x: () => {
      if (!activeId) return
      setChecked((cur) => {
        const next = new Set(cur)
        if (next.has(activeId)) next.delete(activeId)
        else next.add(activeId)
        return next
      })
    },
    'shift+a': () => checkedIds.length && bulk.mutate({ ids: checkedIds, decision: 'approve' }),
    'shift+?': () => setHelp(true),
    '?': () => setHelp(true),
  })

  const allChecked = visible.length > 0 && visible.every((r) => checked.has(r.id))
  const filtersActive = Boolean(search.q || search.gigId || search.platform?.length)

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.25rem)] min-w-0 flex-col overflow-hidden sm:-mx-6 lg:-mx-8">
      <h1 className="sr-only">Review inbox</h1>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
        <Select
          value={tab}
          onValueChange={(v) => onSearchChange({ tab: v === 'needs_review' ? undefined : v, selected: undefined })}
        >
          <SelectTrigger size="sm" className="w-auto min-w-36 font-medium sm:min-w-44" aria-label="View">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {REVIEW_TABS.filter((t) => !t.startsWith('live_check') || (counts?.[t] ?? 0) > 0 || t === tab).map((t) => (
              <SelectItem key={t} value={t}>
                {TAB_LABELS[t]}
                <TabCount tab={t} count={counts?.[t]} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DataTableSearch
          value={search.q}
          onChange={(q) => onSearchChange({ q, selected: undefined })}
          placeholder="Search worker, gig, link…"
          className="order-last w-full sm:order-none sm:w-56 xl:w-64"
        />
        <GigFilter value={search.gigId} onChange={(gigId) => onSearchChange({ gigId, selected: undefined })} />
        <DataTableFacetedFilter
          title="Platform"
          options={PLATFORMS.map((p) => ({
            label: PLATFORM_LABELS[p],
            value: p,
            icon: ({ className }) => <PlatformIcon platform={p} className={className} />,
          }))}
          value={search.platform}
          onChange={(platform) => onSearchChange({ platform, selected: undefined })}
        />
        {filtersActive ? (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate({ search: { tab: search.tab } })}>
            Reset <X />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto hidden size-8 text-muted-foreground lg:inline-flex"
          onClick={() => setHelp(true)}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard />
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col lg:border-r">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
            <Checkbox
              checked={allChecked || (checked.size > 0 && 'indeterminate')}
              onCheckedChange={(v) => setChecked(v ? new Set(visible.map((r) => r.id)) : new Set())}
              aria-label="Select all"
            />
            {checked.size ? (
              <div className="flex flex-1 items-center gap-1.5">
                <span className="text-sm font-medium tabular">{checked.size} selected</span>
                <Button
                  size="sm"
                  className="ml-auto h-7"
                  disabled={bulk.isPending}
                  onClick={() => bulk.mutate({ ids: checkedIds, decision: 'approve' })}
                >
                  <CheckCheck /> Approve
                </Button>
                {tab !== 'live_check' && tab !== 'live_check_due' ? (
                  <Button size="sm" variant="outline" className="h-7" onClick={() => setBulkDialog('changes')}>
                    Changes
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" className="h-7" onClick={() => setBulkDialog('reject')}>
                  Reject
                </Button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground tabular">
                {data ? `${data.total} ${data.total === 1 ? 'item' : 'items'}` : 'Loading…'}
                {isFetching ? ' · updating' : ''}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!data ? (
              <div className="space-y-3 p-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : visible.length ? (
              <ul ref={listRef}>
                {visible.map((row: QueueRow) => (
                  <ReviewQueueItem
                    key={row.id}
                    row={row}
                    active={row.id === activeId}
                    checked={checked.has(row.id)}
                    onSelect={() => select(row.id)}
                    onCheck={(v) =>
                      setChecked((cur) => {
                        const next = new Set(cur)
                        if (v) next.add(row.id)
                        else next.delete(row.id)
                        return next
                      })
                    }
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Check}
                title={tab === 'needs_review' ? 'Inbox zero 🎉' : 'Nothing here'}
                description={
                  tab === 'needs_review'
                    ? 'Every submission has been reviewed. New ones will appear here.'
                    : 'No submissions match this view.'
                }
                className="m-3 border-0"
              />
            )}
          </div>
          {data && data.pageCount > 1 ? (
            <div className="border-t p-2">
              <DataTablePagination
                page={data.page}
                pageCount={data.pageCount}
                perPage={data.perPage}
                total={data.total}
                onSearchChange={(p) => onSearchChange({ ...p, selected: undefined })}
              />
            </div>
          ) : null}
        </div>

        {isDesktop ? (
          <div className="hidden h-full min-h-0 min-w-0 lg:block">
            {activeId ? (
              <SubmissionReviewPanel key={activeId} id={activeId} hotkeys onDecided={(v) => afterDecision(v.ids)} />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  icon={Inbox}
                  title="Select a submission"
                  description="Use J / K to move through the queue."
                  className="border-0"
                />
              </div>
            )}
          </div>
        ) : (
          <Sheet open={!!selectedId} onOpenChange={(o) => !o && select(undefined)}>
            <SheetContent className="w-full gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
              <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-4">
                <SheetTitle className="text-sm">Review submission</SheetTitle>
                <SheetDescription className="sr-only">Proof, worker and decision</SheetDescription>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="ml-auto size-9" aria-label="Close">
                    <X />
                  </Button>
                </SheetClose>
              </div>
              <div className="min-h-0 flex-1">
                {selectedId ? (
                  <SubmissionReviewPanel key={selectedId} id={selectedId} onDecided={(v) => afterDecision(v.ids)} />
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <DecisionDialog
        open={bulkDialog === 'reject'}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        title={`Reject ${checked.size} submissions?`}
        description="Each worker gets this reason by email. Slots are released."
        confirmLabel="Reject all"
        templateKind="reject"
        destructive
        pending={bulk.isPending}
        onConfirm={(comment) => bulk.mutate({ ids: checkedIds, decision: 'reject', comment })}
      />
      <DecisionDialog
        open={bulkDialog === 'changes'}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        title={`Request changes on ${checked.size} submissions?`}
        description="Each worker gets this comment and a fresh deadline."
        confirmLabel="Send to all"
        templateKind="changes"
        pending={bulk.isPending}
        onConfirm={(comment) => bulk.mutate({ ids: checkedIds, decision: 'request_changes', comment })}
      />
      <ReviewShortcutsDialog open={help} onOpenChange={setHelp} />
    </div>
  )
}

function TabCount({ tab, count }: { tab: ReviewTab; count?: number }) {
  if (!count) return null
  const urgent = tab === 'needs_review' || tab === 'live_check_due'
  return (
    <span
      className={cn(
        'rounded-full px-1.5 text-[11px] leading-4 tabular',
        urgent ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/15 text-muted-foreground',
      )}
    >
      {count}
    </span>
  )
}

function GigFilter({ value, onChange }: { value?: string; onChange: (id: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const { data } = useQuery({ ...gigOptionsQuery(), enabled: open || !!value })
  const current = data?.find((g) => g.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 max-w-56 justify-between', !value && 'border-dashed')}>
          <span className="truncate">{current ? current.title : 'Gig'}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a gig…" />
          <CommandList>
            <CommandEmpty>No gigs.</CommandEmpty>
            <CommandGroup>
              {value ? (
                <CommandItem
                  onSelect={() => {
                    onChange(undefined)
                    setOpen(false)
                  }}
                >
                  All gigs
                </CommandItem>
              ) : null}
              {data?.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`${g.title}-${g.id}`}
                  onSelect={() => {
                    onChange(g.id)
                    setOpen(false)
                  }}
                >
                  <PlatformIcon platform={g.platform} />
                  <span className="truncate">{g.title}</span>
                  {g.id === value ? <Check className="ml-auto" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
