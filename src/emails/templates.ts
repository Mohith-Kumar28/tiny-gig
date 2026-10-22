import { formatMoney } from '@/lib/format'
import type { BaseEmailProps } from './base-email'

type Content = Omit<BaseEmailProps, 'appName' | 'appUrl'> & { subject: string }
type Ctx = { appUrl: string; appName: string }

const url = (ctx: Ctx, path: string) => `${ctx.appUrl.replace(/\/$/, '')}${path}`

/**
 * Every transactional email. Each entry maps typed data to subject + content,
 * rendered through the shared `BaseEmail` layout.
 */
export const emailTemplates = {
  otp: (d: { otp: string; type: string }, _ctx: Ctx): Content => ({
    subject: `${d.otp} is your TinyGig sign-in code`,
    preview: `Your code is ${d.otp}`,
    heading: 'Your sign-in code',
    paragraphs: ['Enter this code to continue. It expires in 10 minutes.'],
    quote: d.otp,
    footerNote: "If you didn't request this, you can safely ignore this email.",
  }),

  verifyEmail: (d: { url: string }, _ctx: Ctx): Content => ({
    subject: 'Confirm your email for TinyGig',
    preview: 'One click to confirm your email address.',
    heading: 'Confirm your email',
    paragraphs: ['Click the button below to confirm your email and finish creating your TinyGig account.'],
    cta: { label: 'Confirm email', href: d.url },
    footerNote: "If you didn't create a TinyGig account, you can ignore this email.",
  }),

  confirmEmailChange: (d: { url: string; newEmail: string }, _ctx: Ctx): Content => ({
    subject: 'Confirm your new TinyGig email',
    preview: `Approve changing your login email to ${d.newEmail}.`,
    heading: 'Confirm email change',
    paragraphs: [`Someone asked to change your TinyGig login email to ${d.newEmail}. If this was you, confirm below.`],
    cta: { label: 'Confirm change', href: d.url },
    footerNote: "If you didn't ask for this, ignore this email and your email stays the same.",
  }),

  resetPassword: (d: { url: string }, _ctx: Ctx): Content => ({
    subject: 'Reset your TinyGig password',
    preview: 'Set a new password. This link expires in 1 hour.',
    heading: 'Reset your password',
    paragraphs: ['Click the button below to choose a new password. The link expires in 1 hour.'],
    cta: { label: 'Set new password', href: d.url },
    footerNote: "If you didn't ask to reset your password, you can ignore this email. Your password won't change.",
  }),

  adminInvite: (d: { invitedBy: string; url: string }, _ctx: Ctx): Content => ({
    subject: 'You now have admin access to TinyGig',
    preview: `${d.invitedBy} added you as a TinyGig admin.`,
    heading: "You're a TinyGig admin",
    paragraphs: [
      `${d.invitedBy} gave you admin access to TinyGig.`,
      'Sign in with this email address (email code, password or Google) to open the admin dashboard.',
    ],
    cta: { label: 'Sign in', href: d.url },
  }),

  applicationReceived: (d: { name: string }, ctx: Ctx): Content => ({
    subject: 'We received your TinyGig application',
    preview: "Thanks for applying — we'll review it shortly.",
    heading: `Thanks for applying, ${d.name.split(' ')[0]}!`,
    paragraphs: [
      "Our team reviews every application by hand. You'll get an email as soon as there's a decision — usually within 24–48 hours.",
      'You can check your status anytime from your dashboard.',
    ],
    cta: { label: 'View status', href: url(ctx, '/pending') },
  }),

  adminNewApplicant: (
    d: { name: string; email: string; reddit: string; karma: number; ageMonths: number; state: string },
    ctx: Ctx,
  ): Content => ({
    subject: `New applicant: ${d.name}`,
    preview: `${d.name} applied to become a worker`,
    heading: 'New worker application',
    paragraphs: [`${d.name} just applied and is waiting for review.`],
    details: [
      { label: 'Email', value: d.email },
      { label: 'Reddit', value: d.reddit },
      { label: 'Karma', value: String(d.karma) },
      { label: 'Account age', value: `${d.ageMonths} months` },
      { label: 'State', value: d.state },
    ],
    cta: { label: 'Review applicant', href: url(ctx, '/admin/applicants?status=pending') },
  }),

  applicationApproved: (d: { name: string }, ctx: Ctx): Content => ({
    subject: "You're in! Your TinyGig account is approved",
    preview: 'Add your accounts and start raising your hand for gigs.',
    heading: `Welcome aboard, ${d.name.split(' ')[0]} 🎉`,
    paragraphs: [
      'Your application has been approved. You now have full access to your dashboard.',
      'Add every account you can work from on My accounts, then tap “I’m interested” on gigs that suit you. When you’re selected, post, submit the link and get paid via UPI.',
    ],
    cta: { label: 'Browse gigs', href: url(ctx, '/w/gigs') },
  }),

  applicationRejected: (d: { name: string; reason?: string | null }, ctx: Ctx): Content => ({
    subject: 'Update on your TinyGig application',
    preview: "We couldn't approve your application right now.",
    heading: 'Application not approved',
    paragraphs: [
      `Hi ${d.name.split(' ')[0]}, thanks for your interest. Unfortunately we can't approve your application at this time.`,
      'You can update your profile and we may reconsider in the future.',
    ],
    quote: d.reason ?? undefined,
    cta: { label: 'Open dashboard', href: url(ctx, '/pending') },
  }),

  newGig: (d: { title: string; platform: string; payout: number; gigId: string; windowMinutes?: number; payLabel?: string }, ctx: Ctx): Content => ({
    subject: `New gig: ${d.title}`,
    preview: `Interested? Say so in the next ${d.windowMinutes ?? 10} minutes.`,
    heading: 'A new gig just went live',
    paragraphs: [
      `“${d.title}” is open on ${d.platform}. Tap “I’m interested” within ${d.windowMinutes ?? 10} minutes and our team picks the best-fit account.`,
      'Saying you’re interested doesn’t commit you to anything until you’re selected.',
    ],
    details: [{ label: 'Pay', value: d.payLabel ?? formatMoney(d.payout) }],
    cta: { label: 'I’m interested', href: url(ctx, `/w/gigs/${d.gigId}`) },
    footerNote: 'You can turn off new-gig emails in your profile settings.',
  }),

  selectedForGig: (d: { title: string; account: string; pay: string; dueAt: string; submissionId: string; disclaimer: string }, ctx: Ctx): Content => ({
    subject: `You’re selected: “${d.title}”`,
    preview: `Post from ${d.account} and submit the link before ${d.dueAt}.`,
    heading: 'You’ve been selected',
    paragraphs: [
      `We picked ${d.account} for “${d.title}”. Post from that account and submit the link before the deadline.`,
      'Reply to comments on your post: it’s part of the task.',
    ],
    details: [
      { label: 'Account', value: d.account },
      { label: 'Pay', value: d.pay },
      { label: 'Deadline', value: d.dueAt },
    ],
    cta: { label: 'Open task', href: url(ctx, `/w/work/${d.submissionId}`) },
    footerNote: d.disclaimer,
  }),

  claimConfirmed: (d: { title: string; dueAt: string; submissionId: string }, ctx: Ctx): Content => ({
    subject: `You claimed “${d.title}”`,
    preview: `Submit your proof before ${d.dueAt}.`,
    heading: 'Slot claimed',
    paragraphs: [`You've reserved a slot for “${d.title}”. Complete the task and submit your proof link before the deadline.`],
    details: [{ label: 'Deadline', value: d.dueAt }],
    cta: { label: 'Open task', href: url(ctx, `/w/work/${d.submissionId}`) },
  }),

  insightsDue: (d: { title: string; submissionId: string }, ctx: Ctx): Content => ({
    subject: `Last step: upload insights for “${d.title}”`,
    preview: 'Your post has been live for the full hold.',
    heading: 'Time to upload your insights',
    paragraphs: [
      `Your post for “${d.title}” has been live for the full hold. Open it on Reddit, screenshot the insights shown under it, and upload that.`,
      'Once it’s approved, the pay goes straight to your TinyGig balance.',
    ],
    cta: { label: 'Upload insights', href: url(ctx, `/w/work/${d.submissionId}`) },
  }),

  adminWeeklyPayouts: (d: { created: number; total: number }, ctx: Ctx): Content => ({
    subject: `Weekly payouts ready: ${d.created} worker${d.created === 1 ? '' : 's'}, ${formatMoney(d.total)}`,
    preview: 'Send the UPI transfers and record the UTRs.',
    heading: 'This week’s payouts are ready',
    paragraphs: [`${d.created} pending payout${d.created === 1 ? '' : 's'} totalling ${formatMoney(d.total)} were created from approved balances.`],
    cta: { label: 'Open payouts', href: url(ctx, '/admin/payouts') },
  }),

  claimExpiring: (d: { title: string; dueAt: string; submissionId: string }, ctx: Ctx): Content => ({
    subject: `Reminder: “${d.title}” is due soon`,
    preview: `Your claim expires at ${d.dueAt}.`,
    heading: 'Your claim expires soon',
    paragraphs: [`Submit your proof for “${d.title}” before ${d.dueAt}, or the slot will be released to someone else.`],
    cta: { label: 'Submit proof', href: url(ctx, `/w/work/${d.submissionId}`) },
  }),

  claimExpired: (d: { title: string }, ctx: Ctx): Content => ({
    subject: `Your claim on “${d.title}” expired`,
    preview: 'The slot was released.',
    heading: 'Claim expired',
    paragraphs: [`The deadline for “${d.title}” passed without a submission, so the slot was released.`],
    cta: { label: 'Find another gig', href: url(ctx, '/w/gigs') },
  }),

  adminSubmissionReceived: (d: { worker: string; title: string; resubmission: boolean }, ctx: Ctx): Content => ({
    subject: `${d.resubmission ? 'Resubmission' : 'New submission'}: ${d.title}`,
    preview: `${d.worker} submitted proof for review.`,
    heading: d.resubmission ? 'A worker resubmitted' : 'New submission to review',
    paragraphs: [`${d.worker} submitted proof for “${d.title}”.`],
    cta: { label: 'Open review inbox', href: url(ctx, '/admin/review') },
  }),

  adminDigest: (d: { pendingReviews: number; liveChecks: number; applicants: number }, ctx: Ctx): Content => ({
    subject: `TinyGig daily: ${d.pendingReviews} reviews, ${d.liveChecks} live-checks, ${d.applicants} applicants`,
    preview: 'Your daily review summary.',
    heading: 'Daily summary',
    paragraphs: ["Here's what's waiting for you today."],
    details: [
      { label: 'Submissions to review', value: String(d.pendingReviews) },
      { label: 'Live-checks due', value: String(d.liveChecks) },
      { label: 'Pending applicants', value: String(d.applicants) },
    ],
    cta: { label: 'Open admin', href: url(ctx, '/admin') },
  }),

  changesRequested: (d: { title: string; comment: string; submissionId: string; checklist?: string[] }, ctx: Ctx): Content => ({
    subject: `Changes requested: ${d.title}`,
    preview: 'A reviewer asked for a few changes.',
    heading: 'A few changes needed',
    paragraphs: [
      `The reviewer looked at your submission for “${d.title}” and asked for changes. Update your post and resubmit.`,
      ...(d.checklist?.length ? [`Issues: ${d.checklist.join(' · ')}`] : []),
    ],
    quote: d.comment,
    cta: { label: 'Fix & resubmit', href: url(ctx, `/w/work/${d.submissionId}`) },
  }),

  movedToLiveCheck: (d: { title: string; hours: number; submissionId: string }, ctx: Ctx): Content => ({
    subject: `Looks good! Keep “${d.title}” live for ${d.hours}h`,
    preview: 'Your submission passed review.',
    heading: 'Submission passed review',
    paragraphs: [
      `Your submission for “${d.title}” looks good. Keep the post live for at least ${d.hours} hours — we'll do a final check and then approve the payment.`,
      "Don't delete or edit the post during this time.",
    ],
    cta: { label: 'View status', href: url(ctx, `/w/work/${d.submissionId}`) },
  }),

  submissionApproved: (d: { title: string; payout: number }, ctx: Ctx): Content => ({
    subject: `Approved: ${d.title} · ${formatMoney(d.payout)} earned`,
    preview: `${formatMoney(d.payout)} added to your balance.`,
    heading: 'Work approved 🎉',
    paragraphs: [
      `Your submission for “${d.title}” was approved and ${formatMoney(d.payout)} was added to your pending balance.`,
      "We'll send it to your UPI ID in the next payout cycle.",
    ],
    cta: { label: 'View earnings', href: url(ctx, '/w/payments') },
  }),

  submissionRejected: (d: { title: string; reason: string; submissionId: string }, ctx: Ctx): Content => ({
    subject: `Not approved: ${d.title}`,
    preview: 'Your submission was not approved.',
    heading: 'Submission not approved',
    paragraphs: [`Unfortunately your submission for “${d.title}” was not approved.`],
    quote: d.reason,
    cta: { label: 'View details', href: url(ctx, `/w/work/${d.submissionId}`) },
  }),

  payoutSent: (d: { amount: number; upiId: string; utr?: string | null }, ctx: Ctx): Content => ({
    subject: `Payment sent: ${formatMoney(d.amount)}`,
    preview: `${formatMoney(d.amount)} sent to ${d.upiId}.`,
    heading: 'Payment sent 💸',
    paragraphs: [`We've sent ${formatMoney(d.amount)} to your UPI ID. It may take a few minutes to reflect.`],
    details: [
      { label: 'Amount', value: formatMoney(d.amount) },
      { label: 'UPI ID', value: d.upiId },
      ...(d.utr ? [{ label: 'UTR / reference', value: d.utr }] : []),
    ],
    cta: { label: 'Payment history', href: url(ctx, '/w/payments') },
  }),

  referralJoined: (d: { name: string }, ctx: Ctx): Content => ({
    subject: `${d.name} joined TinyGig with your link`,
    preview: 'Your referral signed up.',
    heading: 'Someone joined with your link',
    paragraphs: [`${d.name} just signed up using your referral link. We'll let you know when they're approved.`],
    cta: { label: 'Track referrals', href: url(ctx, '/w/referrals') },
  }),

  referralApproved: (d: { name: string }, ctx: Ctx): Content => ({
    subject: `Your referral ${d.name} was approved`,
    preview: 'One step closer to your reward.',
    heading: 'Your referral was approved',
    paragraphs: [`${d.name} is now an approved TinyGig worker. Check your progress toward the next reward.`],
    cta: { label: 'View progress', href: url(ctx, '/w/referrals') },
  }),

  referralRewardEarned: (d: { amount: number; program: string; pendingReview: boolean }, ctx: Ctx): Content => ({
    subject: `You earned a ${formatMoney(d.amount)} referral reward`,
    preview: `Reward from “${d.program}”.`,
    heading: 'Referral reward earned 🎁',
    paragraphs: [
      `You earned ${formatMoney(d.amount)} from the “${d.program}” referral program.`,
      d.pendingReview
        ? "It's being verified by our team and will be added to your balance once approved."
        : "It's been added to your pending balance.",
    ],
    cta: { label: 'View rewards', href: url(ctx, '/w/referrals') },
  }),
} satisfies Record<string, (data: never, ctx: Ctx) => Content>

export type EmailTemplates = typeof emailTemplates
export type EmailTemplateName = keyof EmailTemplates
export type EmailTemplateData<T extends EmailTemplateName> = Parameters<EmailTemplates[T]>[0]
