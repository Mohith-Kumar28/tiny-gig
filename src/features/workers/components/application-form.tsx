import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { ACCOUNT_AGE_HINT, type ApplicationInput, applicationSchema } from '../schemas'
import { submitApplication } from '../server/application'
import { FormSection } from './form-section'
import { StateSelect } from './state-select'

export function ApplicationForm({ defaults }: { defaults: Partial<ApplicationInput> }) {
  const router = useRouter()
  const form = useForm<ApplicationInput, unknown, ApplicationInput>({
    resolver: zodResolver(applicationSchema) as never,
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      redditUrl: '',
      accountAgeMonths: '' as unknown as number,
      karma: '' as unknown as number,
      upiId: '',
      referralCode: '',
      ...defaults,
    },
  })
  const submit = useAction((data: ApplicationInput) => submitApplication({ data }), {
    success: 'Application submitted!',
    invalidate: [['viewer']],
    onSuccess: async () => {
      await router.navigate({ to: '/pending' })
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-6" noValidate>
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
              <FormItem className="sm:col-span-2">
                <FormLabel>State</FormLabel>
                <FormControl>
                  <StateSelect value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Reddit account" description="We check your profile before approving.">
          <FormField
            control={form.control}
            name="redditUrl"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Reddit profile link</FormLabel>
                <FormControl>
                  <Input inputMode="url" placeholder="https://www.reddit.com/user/yourname" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountAgeMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account age (months)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} {...field} value={field.value as never} />
                </FormControl>
                <FormDescription>{ACCOUNT_AGE_HINT}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="karma"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total karma</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} {...field} value={field.value as never} />
                </FormControl>
                <FormDescription>Post + comment karma on your profile.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Payments">
          <FormField
            control={form.control}
            name="upiId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>UPI ID</FormLabel>
                <FormControl>
                  <Input autoCapitalize="none" autoCorrect="off" placeholder="name@okaxis" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Referral">
          <FormField
            control={form.control}
            name="referralCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referral code (optional)</FormLabel>
                <FormControl>
                  <Input className="font-mono uppercase" placeholder="ABC1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">We review every application by hand, usually within 24–48 hours.</p>
          <Button type="submit" size="lg" disabled={submit.isPending}>
            {submit.isPending ? <Spinner /> : null}
            Submit application
            <ArrowRight />
          </Button>
        </div>
      </form>
    </Form>
  )
}
