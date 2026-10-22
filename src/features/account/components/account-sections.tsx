import { ChangeEmailCard, ChangePasswordCard, SessionsCard, TwoFactorCard, UpdateAvatarCard, UpdateNameCard } from '@daveyplate/better-auth-ui'
import { PushToggle } from '@/features/push/components/push-toggle'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { SignInMethods } from './sign-in-methods'

// Better Auth UI paints card footers with the sidebar colour, which is cloth red here; keep them paper.
const card = {
  base: 'shadow-none',
  header: 'pb-4',
  title: 'font-display text-base font-bold',
  footer: 'border-t bg-muted/40 py-3',
  instructions: 'text-xs text-muted-foreground',
}

/** Name, photo and login email. */
export function ProfileSections() {
  return (
    <SettingsSection title="Profile" description="How you appear to the TinyGig team, and the email you sign in with.">
      <div className="space-y-4">
        <UpdateAvatarCard classNames={card} />
        <UpdateNameCard classNames={card} />
        <ChangeEmailCard classNames={card} />
      </div>
    </SettingsSection>
  )
}

/** Push alerts for this device. Everything also lands under the bell. */
export function NotificationSections({ audience }: { audience: 'worker' | 'admin' }) {
  return (
    <SettingsSection
      title="Notifications"
      description="Alerts are per device: turn them on on each phone or laptop you use. Everything also shows under the bell."
    >
      <PushToggle audience={audience} />
    </SettingsSection>
  )
}

/** Sign-in methods, password, two-step and the devices signed in. */
export function SecuritySections({ email }: { email: string }) {
  return (
    <>
      <SettingsSection title="Sign-in methods" description="Ways you can get into TinyGig. Email codes always work.">
        <SignInMethods email={email} />
      </SettingsSection>
      <SettingsSection title="Password and two-step" description="A password is optional. Two-step sign-in needs one.">
        <div className="space-y-4">
          <ChangePasswordCard classNames={card} />
          <TwoFactorCard classNames={card} />
        </div>
      </SettingsSection>
      <SettingsSection title="Signed-in devices" description="Sign out anywhere you don't recognise.">
        <SessionsCard classNames={card} />
      </SettingsSection>
    </>
  )
}
