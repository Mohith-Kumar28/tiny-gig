import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, AtSign, ChevronRight, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { CopyButton } from '@/components/shared/copy-button'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PushToggle } from '@/features/push/components/push-toggle'
import { useAction } from '@/hooks/use-action'
import { type ProfileUpdateInput, profileUpdateSchema } from '../schemas'
import { type getMyProfile, updateMyProfile } from '../server/profile'
import { FormSection } from './form-section'
import { StateSelect } from './state-select'

type Profile = Awaited<ReturnType<typeof getMyProfile>>

export function ProfileForm({ profile }: { profile: Profile }) {
  const defaults: ProfileUpdateInput = {
    fullName: profile.fullName,
    phone: profile.phone.replace(/^\+91/, ''),
    state: profile.state as ProfileUpdateInput['state'],
    upiId: profile.upiId,
    bio: profile.bio ?? '',
    languages: profile.languages ?? '',
    emailPrefs: { newGigs: profile.emailPrefs?.newGigs ?? true, reminders: profile.emailPrefs?.reminders ?? true },
  }
  const form = useForm<ProfileUpdateInput, unknown, ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema) as never,
    defaultValues: defaults,
  })
  const save = useAction((data: ProfileUpdateInput) => updateMyProfile({ data }), {
    success: 'Profile saved',
    invalidate: [['me'], ['w']],
    onSuccess: (_r, v) => form.reset(v),
  })
  const upi = form.watch('upiId')
  const upiChanged = upi.trim() !== profile.upiId

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6" noValidate>
        <FormSection title="About you">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={profile.email} readOnly disabled />
            <p className="text-xs text-muted-foreground">Change it in the Account tab.</p>
          </div>
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <StateSelect value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="languages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Languages you write in</FormLabel>
                <FormControl>
                  <Input placeholder="English, Hindi, Tamil" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Short bio (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Topics you know well, communities you're active in…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <Link
          to="/w/accounts"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors duration-150 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <AtSign className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Reddit and other social accounts</p>
            <p className="text-xs text-muted-foreground">
              Add accounts, update karma and see each account’s pay level on My accounts.
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>

        <div id="payments" className="scroll-mt-20">
          <FormSection title="Payments">
            <FormField
              control={form.control}
              name="upiId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>UPI ID</FormLabel>
                  <FormControl>
                    <Input autoCapitalize="none" autoCorrect="off" placeholder="name@okaxis" className="font-mono" {...field} />
                  </FormControl>
                  {upiChanged ? (
                    <p className="flex items-start gap-2 rounded-md bg-warning/15 p-2.5 text-xs text-warning-foreground dark:text-warning">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" />
                      Future payouts go to this new UPI ID. Double-check it.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        </div>

        <FormSection title="Notifications">
          <PushToggle className="sm:col-span-2" />
          <div className="divide-y overflow-hidden rounded-lg border bg-card sm:col-span-2">
            <FormField
              control={form.control}
              name="emailPrefs.newGigs"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="space-y-0.5">
                    <FormLabel>New gig emails</FormLabel>
                    <p className="text-xs text-muted-foreground">An email when a gig you can do goes live.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emailPrefs.reminders"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="space-y-0.5">
                    <FormLabel>Deadline reminders</FormLabel>
                    <p className="text-xs text-muted-foreground">A nudge before a task you were picked for is due.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Referral code">
          <div className="flex items-center gap-2 rounded-md border bg-card py-1.5 pr-1.5 pl-3 sm:col-span-2">
            <span className="flex-1 font-mono text-sm font-semibold">{profile.ownReferralCode}</span>
            <span className="text-xs text-muted-foreground tabular">{profile.referredCount} joined</span>
            <CopyButton value={profile.referralLink} label="Copy link" size="sm" />
          </div>
        </FormSection>

        <div className="sticky bottom-[var(--mobile-nav-offset,0px)] z-10 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          {form.formState.isDirty ? (
            <span className="mr-auto text-xs text-muted-foreground">You have unsaved changes</span>
          ) : null}
          <Button type="button" variant="ghost" disabled={!form.formState.isDirty || save.isPending} onClick={() => form.reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || save.isPending}>
            {save.isPending ? <Spinner /> : <Save />}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
