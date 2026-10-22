/** The four-step worker journey. Shared by the landing page, /how-it-works, HowTo JSON-LD and llms.txt. */
export type Step = { id: string; title: string; summary: string; details: string[] }

export const STEPS: Step[] = [
  {
    id: 'apply',
    title: 'Apply once',
    summary: 'Sign in with Google or an email code and tell us about your Reddit account and UPI ID.',
    details: [
      'Sign in with Google or a one-time code sent to your email.',
      'Fill in your name, Reddit profile link, the date your Reddit account was created, karma, UPI ID, state, phone and email. Add a referral code if a friend invited you.',
      'Our team reviews every application by hand, usually within 24 to 48 hours, and emails you when you are approved.',
    ],
  },
  {
    id: 'claim',
    title: 'Raise your hand',
    summary: 'Browse open gigs, check the pay and requirements, and tap “I’m interested”. Our team picks one account per slot.',
    details: [
      'Each gig shows the platform, the brief, the payout in rupees, any requirements (like minimum karma, account age or state) and how many slots are left.',
      'Saying you are interested reserves nothing. The team picks the best-fit account for each slot and notifies you if it is yours.',
      'Once selected you have a set window to complete the task and submit.',
    ],
  },
  {
    id: 'submit',
    title: 'Post and submit proof',
    summary: 'Do the task from your own account, following the brief, then submit the link to your work.',
    details: [
      'Write the post, comment or reply the brief asks for, in the community it names, following that community’s rules.',
      'Submit a link to the live post and optional screenshots.',
      'A reviewer approves it, asks for changes with comments, or rejects it. Many gigs need the post to stay live for a hold period, such as 24 hours, before final approval.',
    ],
  },
  {
    id: 'paid',
    title: 'Get paid by UPI',
    summary: 'Approved earnings land in your balance and are paid to your UPI ID, with a UTR reference by email.',
    details: [
      'Once a gig is approved, the payout is added to your TinyGig balance.',
      'Our team sends payouts to the UPI ID on your profile.',
      'You get an email with the UTR reference for every payout.',
    ],
  },
]
