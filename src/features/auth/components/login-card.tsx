import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoogleButton } from './google-button'
import { OtpLogin } from './otp-login'
import { PasswordLogin } from './password-login'

export function LoginCard({ google, devEmails, redirectTo }: { google: boolean; devEmails: boolean; redirectTo?: string }) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in to TinyGig</h1>
        <p className="text-sm text-muted-foreground">New here? Create your account, then apply to start doing paid gigs.</p>
      </div>
      {google ? (
        <>
          <GoogleButton redirectTo={redirectTo} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with your email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      <Tabs defaultValue="code" className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code">Email code</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="code">
          <OtpLogin devEmails={devEmails} redirectTo={redirectTo} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordLogin redirectTo={redirectTo} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
