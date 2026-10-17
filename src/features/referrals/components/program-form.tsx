import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { REFERRAL_TRIGGERS } from '@/db/schema/enums'
import { useAction } from '@/hooks/use-action'
import { TRIGGER_LABELS } from '../rules'
import { type ProgramFormInput, programFormSchema } from '../schemas'
import { saveProgram } from '../server/referrals'
import { formToRule, localToIso } from './program-form-values'
import { ProgramPreview } from './program-preview'

type Output = z.output<typeof programFormSchema>

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function RupeeInput(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">₹</span>
      <Input type="number" inputMode="decimal" min={0} step="1" className="pl-7 tabular" {...props} />
    </div>
  )
}

/** Program builder: rule form on the left, live preview on the right. */
export function ProgramForm({
  open,
  onOpenChange,
  programId,
  values,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Present when editing. */
  programId?: string
  values: ProgramFormInput
  onSaved: (r: { id?: string; created: boolean }) => void
}) {
  const form = useForm<ProgramFormInput, unknown, Output>({
    resolver: zodResolver(programFormSchema) as never,
    defaultValues: values,
  })
  useEffect(() => {
    if (open) form.reset(values)
  }, [open, values, form])

  const watched = useWatch({ control: form.control }) as ProgramFormInput
  const rule = formToRule(watched)
  const trigger = watched.trigger
  const repeatMode = watched.repeatMode
  const needsValue = trigger === 'gigs_approved' || trigger === 'earned_at_least'

  const save = useAction(
    (v: Output) => saveProgram({ data: { ...v, startsAt: localToIso(v.startsAt), endsAt: localToIso(v.endsAt), id: programId } }),
    {
      success: programId ? 'Program updated' : 'Program created',
      invalidate: [['admin']],
      onSuccess: (r) => {
        onSaved({ id: r.id, created: !programId })
        onOpenChange(false)
      },
    },
  )

  const onTriggerChange = (t: ProgramFormInput['trigger']) => {
    form.setValue('trigger', t, { shouldDirty: true })
    if (t === 'gigs_approved') form.setValue('triggerValue', 3)
    else if (t === 'earned_at_least') form.setValue('triggerValue', 500)
    else form.setValue('triggerValue', 1)
  }

  const intField = (v: unknown) => (v == null ? '' : (v as string | number))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-5xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="font-display text-lg">{programId ? 'Edit program' : 'New referral program'}</SheetTitle>
          <SheetDescription>Define what a referred worker has to do, and who gets paid for it.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id="program-form"
            noValidate
            onSubmit={form.handleSubmit((v) => {
              if (v.startsAt && v.endsAt && new Date(v.endsAt) <= new Date(v.startsAt)) {
                form.setError('endsAt', { message: 'End must be after the start.' })
                return
              }
              if (Number(v.referrerRewardRupees) === 0 && Number(v.refereeRewardRupees) === 0) {
                form.setError('referrerRewardRupees', { message: 'Set a reward for the referrer, the referee, or both.' })
                return
              }
              save.mutate(v)
            })}
            className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_340px] md:overflow-hidden"
          >
            <div className="space-y-5 px-6 py-5 md:overflow-y-auto">
              <Section title="Basics">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Invite 3 friends" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Shown to workers on their referrals page" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Paused programs stop creating new rewards.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="When a referred worker…">
                <FormField
                  control={form.control}
                  name="trigger"
                  render={({ field }) => (
                    <FormItem className={needsValue ? '' : 'sm:col-span-2'}>
                      <FormLabel>Milestone</FormLabel>
                      <Select value={field.value} onValueChange={(v) => onTriggerChange(v as ProgramFormInput['trigger'])}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REFERRAL_TRIGGERS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {TRIGGER_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {needsValue ? (
                  <FormField
                    control={form.control}
                    name="triggerValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{trigger === 'gigs_approved' ? 'Number of gigs' : 'Earnings'}</FormLabel>
                        <FormControl>
                          {trigger === 'earned_at_least' ? (
                            <RupeeInput {...field} value={intField(field.value)} />
                          ) : (
                            <Input type="number" min={1} inputMode="numeric" className="tabular" {...field} value={intField(field.value)} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </Section>

              <Section title="How many referred workers">
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referrals per reward</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} inputMode="numeric" className="tabular" {...field} value={intField(field.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Rewards">
                <FormField
                  control={form.control}
                  name="referrerRewardRupees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referrer gets</FormLabel>
                      <FormControl>
                        <RupeeInput {...field} value={intField(field.value)} />
                      </FormControl>
                      <FormDescription>Per reward tier</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="refereeRewardRupees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Each referred worker gets</FormLabel>
                      <FormControl>
                        <RupeeInput {...field} value={intField(field.value)} />
                      </FormControl>
                      <FormDescription>Once, when they qualify</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Repeat">
                <FormField
                  control={form.control}
                  name="repeatMode"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          value={field.value}
                          onValueChange={(v) => v && field.onChange(v)}
                          className="w-full sm:w-auto"
                        >
                          <ToggleGroupItem value="once" className="flex-1 px-4">
                            Once
                          </ToggleGroupItem>
                          <ToggleGroupItem value="every" className="flex-1 px-4">
                            Every {rule.threshold} more
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {repeatMode === 'every' ? (
                  <FormField
                    control={form.control}
                    name="maxRewardsPerReferrer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max rewards per referrer</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} inputMode="numeric" placeholder="No limit" className="tabular" {...field} value={intField(field.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </Section>

              <Section title="Limits">
                <FormField
                  control={form.control}
                  name="qualifyWithinDays"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Must qualify within (days of joining)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} inputMode="numeric" placeholder="No limit" className="tabular sm:max-w-48" {...field} value={intField(field.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts</FormLabel>
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
                      <FormLabel>Ends</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title="Approval">
                <FormField
                  control={form.control}
                  name="autoApprove"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel>Auto-approve rewards</FormLabel>
                        <FormDescription>
                          {field.value ? 'Rewards join the balance immediately.' : 'Rewards are held in the review queue for you to approve.'}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </Section>
            </div>

            <aside className="border-t bg-muted/30 px-6 py-5 md:overflow-y-auto md:border-t-0 md:border-l">
              <ProgramPreview rule={rule} autoApprove={!!watched.autoApprove} name={watched.name} />
            </aside>
          </form>
        </Form>
        <SheetFooter className="flex-row justify-end border-t px-6 py-3">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="program-form" disabled={save.isPending}>
            {save.isPending ? <Spinner /> : null}
            {programId ? 'Save changes' : 'Create program'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
