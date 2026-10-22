import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { CalendarClock, Clock, MapPin, Save, Send, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { formatDateTime } from '@/components/shared/relative-time'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { type GigStatus, PLATFORMS, TASK_TYPES } from '@/db/schema/enums'
import { tagDot } from '@/features/accounts/components/client-chip'
import { clientsQuery } from '@/features/clients/queries'
import { settingsQuery } from '@/features/settings/queries'
import { useAction } from '@/hooks/use-action'
import { formatMoney, formatNumber, rupeesToPaise } from '@/lib/format'
import { cn } from '@/lib/utils'
import { GIG_FORM_DEFAULTS, type GigFormInput, type GigFormValues, gigFormSchemaRefined, PAID_LEVEL_KEYS } from '../schemas'
import { type getGigAdmin, saveGig } from '../server/admin-gigs'
import { ChecklistEditor, StatesMultiSelect } from './gig-form-fields'
import { formatHours, TASK_TYPE_LABELS } from './worker-gig-meta'

type AdminGig = Awaited<ReturnType<typeof getGigAdmin>>['gig']

const toLocalInput = (d: Date | string | null | undefined) => (d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : '')
/** datetime-local values are local time; send ISO so the server (UTC) stores the right instant. */
const toIso = (v: string | undefined) => (v ? new Date(v).toISOString() : '')

export function gigToFormInput(g: AdminGig): GigFormInput {
  return {
    title: g.title,
    platform: g.platform,
    taskType: g.taskType,
    brief: g.brief,
    targetUrl: g.targetUrl ?? '',
    community: g.community ?? '',
    clientTagId: g.clientTagId ?? '',
    contentGuidelines: g.contentGuidelines ?? '',
    sampleContent: g.sampleContent ?? '',
    reviewChecklist: g.reviewChecklist,
    payMode: g.payMode,
    payoutRupees: g.payoutAmount / 100,
    levelOverrides: {
      L1: g.levelRateOverrides?.L1 ? String(g.levelRateOverrides.L1 / 100) : '',
      L2: g.levelRateOverrides?.L2 ? String(g.levelRateOverrides.L2 / 100) : '',
      L3: g.levelRateOverrides?.L3 ? String(g.levelRateOverrides.L3 / 100) : '',
      L4: g.levelRateOverrides?.L4 ? String(g.levelRateOverrides.L4 / 100) : '',
    },
    totalSlots: g.totalSlots,
    claimWindowHours: g.claimWindowHours,
    interestWindowMinutes: g.interestWindowMinutes,
    liveHoldHours: g.liveHoldHours,
    minKarma: g.minKarma,
    minAccountAgeMonths: g.minAccountAgeMonths,
    allowedStates: g.allowedStates as GigFormInput['allowedStates'],
    startsAt: toLocalInput(g.startsAt),
    endsAt: toLocalInput(g.endsAt),
    priority: g.priority,
    status: g.status,
    notifyWorkers: !g.publishedAt,
  }
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4 space-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

const COMMUNITY_HINT: Record<string, { label: string; placeholder: string }> = {
  reddit: { label: 'Subreddit', placeholder: 'r/india' },
  x: { label: 'Account / hashtag', placeholder: '@brand or #topic' },
  linkedin: { label: 'Group / page', placeholder: 'Company page or group' },
  threads: { label: 'Account / topic', placeholder: '@brand' },
  instagram: { label: 'Account / hashtag', placeholder: '@brand or #topic' },
  other: { label: 'Community', placeholder: 'Where should this go?' },
}

export function GigForm({
  gigId,
  initial,
  publishedAt,
  claimedSlots = 0,
}: {
  gigId?: string
  initial?: Partial<GigFormInput>
  publishedAt?: Date | string | null
  claimedSlots?: number
}) {
  const navigate = useNavigate()
  const { data: clients } = useQuery(clientsQuery())
  const { data: settings } = useQuery(settingsQuery())
  const form = useForm<GigFormInput, unknown, GigFormValues>({
    resolver: zodResolver(gigFormSchemaRefined),
    defaultValues: { ...GIG_FORM_DEFAULTS, ...initial },
  })
  const initialStatus = (initial?.status ?? 'draft') as GigStatus
  const isDraft = initialStatus === 'draft'

  const save = useAction((v: GigFormValues) => saveGig({ data: { ...v, id: gigId } }), {
    success: (r, v) => {
      if (r.notified) return `Gig published · ${formatNumber(r.notified)} worker${r.notified === 1 ? '' : 's'} emailed`
      if (v.status === 'live' && !publishedAt) return 'Gig published · no eligible workers to email'
      return v.status === 'draft' ? 'Draft saved' : 'Gig saved'
    },
    invalidate: [['admin']],
    onSuccess: async (r) => {
      form.reset(form.getValues())
      await navigate({ to: '/admin/gigs/$gigId', params: { gigId: r.id } })
    },
  })

  const submit = (status?: GigStatus) =>
    form.handleSubmit(
      (v) => save.mutate({ ...v, status: status ?? v.status, startsAt: toIso(v.startsAt), endsAt: toIso(v.endsAt) }),
      () => toast.error('Fix the highlighted fields first'),
    )

  const platform = useWatch({ control: form.control, name: 'platform' })
  const status = useWatch({ control: form.control, name: 'status' })
  const hint = COMMUNITY_HINT[platform] ?? COMMUNITY_HINT.other!
  const payMode = useWatch({ control: form.control, name: 'payMode' })
  const taskType = useWatch({ control: form.control, name: 'taskType' })
  const levelsApply = platform === 'reddit' && (taskType === 'post' || taskType === 'comment' || taskType === 'upvote')

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()()
        }}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-4">
          <Section title="Task">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input autoFocus={!gigId} placeholder="Post about our budgeting app in r/personalfinanceindia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          <PlatformIcon platform={p} /> {PLATFORM_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_TYPES.filter((t) => t !== 'reply' || field.value === 'reply').map((t) => (
                        <SelectItem key={t} value={t}>
                          {TASK_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="community"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{hint.label}</FormLabel>
                  <FormControl>
                    <Input placeholder={hint.placeholder} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientTagId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {(clients ?? [])
                        .filter((c) => !c.archivedAt || c.id === field.value)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className={cn('size-1.5 rounded-full', tagDot(c.color))} />
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Internal only. Drives same-client cooldowns.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input inputMode="url" placeholder="https://… (optional)" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Brief">
            <FormField
              control={form.control}
              name="brief"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Brief</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Explain the goal, the angle, and what a good result looks like." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contentGuidelines"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Content guidelines</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Do's and don'ts: tone, length, no links, mention X once…" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sampleContent"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Sample content</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="An example post or comment workers can adapt (not copy)." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Reviewer checklist">
            <FormField
              control={form.control}
              name="reviewChecklist"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <ChecklistEditor value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Payout & slots">
            <FormField
              control={form.control}
              name="payMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="levels">By account level</SelectItem>
                      <SelectItem value="flat">Flat rate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {payMode === 'levels' && !levelsApply
                      ? 'Level pricing applies to Reddit posts, comments and upvotes; this gig will pay its flat rate.'
                      : 'Replies to comments on a worker’s own post are part of the task and never paid separately.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {payMode === 'levels' && levelsApply ? (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Rate by level{taskType === 'upvote' ? ' (upvotes pay the same at every level)' : ''}</p>
                {taskType === 'upvote' ? (
                  <p className="text-sm text-muted-foreground">
                    {settings ? formatMoney(settings.upvoteRate) : '—'} per upvote, from Settings.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {PAID_LEVEL_KEYS.map((l) => (
                      <FormField
                        key={l}
                        control={form.control}
                        name={`levelOverrides.${l}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">{l}</FormLabel>
                            <div className="relative">
                              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={1}
                                  className="pl-7 tabular"
                                  placeholder={settings ? String(settings.levelRates[taskType === 'comment' ? 'comment' : 'post'][l] / 100) : ''}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Empty = the rate table in Settings. The rate locks when an account is selected.</p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="payoutRupees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payout per task</FormLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                      <FormControl>
                        <Input type="number" inputMode="decimal" min={1} step="any" className="pl-7 tabular" {...field} value={field.value as never} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="totalSlots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slots</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={Math.max(1, claimedSlots)} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  {claimedSlots ? <FormDescription>{claimedSlots} already assigned</FormDescription> : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="claimWindowHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time to submit (hours)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={1} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  <FormDescription>Counted from selection.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interestWindowMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest window (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={1} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  <FormDescription>How long workers get to raise their hand once it’s live.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="liveHoldHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keep live for (hours)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={0} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  <FormDescription>0 = no live check</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Requirements">
            <FormField
              control={form.control}
              name="minKarma"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min karma</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={0} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minAccountAgeMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min account age (months)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={0} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedStates"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Allowed states</FormLabel>
                  <FormControl>
                    <StatesMultiSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Schedule">
            <FormField
              control={form.control}
              name="startsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starts (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ends (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (0–10, higher first)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={0} max={10} className="tabular" {...field} value={field.value as never} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notifyWorkers"
              render={({ field }) => (
                <FormItem className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel>Email eligible workers on publish</FormLabel>
                    {publishedAt ? <FormDescription>Already announced</FormDescription> : null}
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!!publishedAt} />
                  </FormControl>
                </FormItem>
              )}
            />
          </Section>

          <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
            <span className="mr-auto text-xs text-muted-foreground">
              {form.formState.isDirty ? 'Unsaved changes' : gigId ? 'No changes' : ''}
            </span>
            <Button type="button" variant="ghost" onClick={() => history.back()} disabled={save.isPending}>
              Cancel
            </Button>
            {isDraft ? (
              <>
                <Button type="button" variant="outline" onClick={submit('draft')} disabled={save.isPending}>
                  {save.isPending && save.variables?.status === 'draft' ? <Spinner /> : <Save />}
                  Save draft
                </Button>
                <Button type="button" onClick={submit('live')} disabled={save.isPending}>
                  {save.isPending && save.variables?.status === 'live' ? <Spinner /> : <Send />}
                  Publish
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Spinner /> : <Save />}
                Save changes{status !== initialStatus ? ` · ${status}` : ''}
              </Button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <GigSummaryCard control={form.control} />
          </div>
        </aside>
      </form>
    </Form>
  )
}

function SummaryRow({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

/** Live preview of how the gig reads to workers. */
function GigSummaryCard({ control }: { control: ReturnType<typeof useForm<GigFormInput, unknown, GigFormValues>>['control'] }) {
  const v = useWatch({ control }) as GigFormInput
  const { data: settings } = useQuery(settingsQuery())
  const levelPriced = v.payMode === 'levels' && v.platform === 'reddit' && (v.taskType === 'post' || v.taskType === 'comment' || v.taskType === 'upvote')
  const rates =
    levelPriced && settings
      ? v.taskType === 'upvote'
        ? [settings.upvoteRate]
        : PAID_LEVEL_KEYS.map((l) => (v.levelOverrides?.[l] ? rupeesToPaise(Number(v.levelOverrides[l])) : settings.levelRates[v.taskType === 'comment' ? 'comment' : 'post'][l]))
      : null
  const flat = rupeesToPaise(Number(v.payoutRupees) || 0)
  const minRate = rates ? Math.min(...rates) : flat
  const maxRate = rates ? Math.max(...rates) : flat
  const slots = Number(v.totalSlots) || 0
  const claim = Number(v.claimWindowHours) || 0
  const hold = Number(v.liveHoldHours) || 0
  const karma = Number(v.minKarma) || 0
  const age = Number(v.minAccountAgeMonths) || 0
  const states = v.allowedStates ?? []
  const checklist = (v.reviewChecklist ?? []).filter(Boolean)
  const endsAt = v.endsAt ? new Date(v.endsAt) : null
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Worker preview</p>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {v.platform ? <PlatformIcon platform={v.platform} /> : null}
              {v.community || (v.platform ? PLATFORM_LABELS[v.platform] : '')} · {v.taskType ? TASK_TYPE_LABELS[v.taskType] : ''}
            </span>
            <StatusBadge status={v.status ?? 'draft'} />
          </div>
          <h3 className={cn('font-display text-lg leading-snug font-semibold text-balance', !v.title && 'text-muted-foreground')}>
            {v.title || 'Untitled gig'}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular">
              {minRate === maxRate ? formatMoney(maxRate) : `${formatMoney(minRate)}–${formatMoney(maxRate)}`}
            </span>
            <span className="text-xs text-muted-foreground">{minRate === maxRate ? 'per approved task' : 'depending on the account'}</span>
          </div>
        </div>
        <div className="space-y-2 border-t bg-muted/30 p-4">
          <SummaryRow icon={Users}>
            <span className="tabular">{formatNumber(slots)}</span> slot{slots === 1 ? '' : 's'}
          </SummaryRow>
          <SummaryRow icon={Clock}>{claim ? `${formatHours(claim)} to submit after selection` : 'Set a time to submit'}</SummaryRow>
          <SummaryRow icon={CalendarClock}>
            {endsAt && !Number.isNaN(endsAt.getTime()) ? `Ends ${formatDateTime(endsAt)}` : 'No end date'}
          </SummaryRow>
          <SummaryRow icon={ShieldCheck}>
            {hold ? `Live ${formatHours(hold)}, then insights screenshot` : 'Approved right after review'}
          </SummaryRow>
          <SummaryRow icon={MapPin}>{states.length ? states.join(', ') : 'Open to all of India'}</SummaryRow>
          <div className="pt-1 text-xs text-muted-foreground">
            Requires {karma ? <span className="tabular">{formatNumber(karma)}+ karma</span> : 'any karma'}
            {' · '}
            {age ? <span className="tabular">{age}+ month old account</span> : 'any account age'}
          </div>
        </div>
      </div>
      <div className="rounded-xl border p-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{minRate === maxRate ? 'Total budget ' : 'Maximum exposure '}</span>
        <span className="tabular">{formatMoney(maxRate * slots)}</span>
        {minRate === maxRate ? ' if every slot is approved.' : ' if every slot goes to a top-level account.'}
        {checklist.length ? <span className="mt-1 block">{checklist.length} reviewer checks.</span> : null}
      </div>
    </div>
  )
}
