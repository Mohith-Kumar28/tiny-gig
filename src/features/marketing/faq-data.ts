/**
 * Single source of truth for FAQ copy. Used by the visible FAQ on / and /faq,
 * the FAQPage JSON-LD, and /llms-full.txt, so they never drift apart.
 */
export type FaqItem = { id: string; question: string; answer: string }

export const FAQ: FaqItem[] = [
  {
    id: 'what-is-tinygig',
    question: 'What is TinyGig?',
    answer:
      'TinyGig is a gig-work platform for India. Our team posts small paid social media tasks, mostly Reddit posts, comments and replies in specific subreddits, plus tasks on X, LinkedIn, Threads, Instagram and other platforms. You claim a gig, complete it, submit proof and get paid to your UPI ID once the work is approved.',
  },
  {
    id: 'who-can-apply',
    question: 'Who can apply?',
    answer:
      'Anyone 18 or older who lives in India and has a UPI ID and a phone number. Most gigs are on Reddit, so an active Reddit account helps a lot. When you apply we ask for your name, Reddit profile link, Reddit account age, karma, UPI ID, state, phone and email, plus a referral code if you have one.',
  },
  {
    id: 'approval-time',
    question: 'How long does approval take?',
    answer:
      'Every application is reviewed by a person, usually within 24 to 48 hours. You get an email as soon as you are approved, and you can start claiming gigs right away.',
  },
  {
    id: 'karma-requirements',
    question: 'Do I need a lot of Reddit karma?',
    answer:
      'Not to join. Some gigs set their own requirements, such as minimum karma, account age or a specific state, and you will see those on the gig before you claim it. Gigs without requirements are open to every approved worker.',
  },
  {
    id: 'claiming',
    question: 'How do I claim a gig?',
    answer:
      'Open the list of available gigs and tap claim. Slots are limited and go first come, first served. Once you claim a slot you have a set window to complete the task and submit, shown on the gig. If the window runs out, the slot goes back to the pool.',
  },
  {
    id: 'proof',
    question: 'What do I submit as proof?',
    answer:
      'A link to your live post, comment or reply, plus optional screenshots. The link must point to the work you did for that gig, posted from the account you applied with.',
  },
  {
    id: 'review',
    question: 'What happens after I submit?',
    answer:
      'A reviewer checks your work against the brief. They can approve it, request changes with comments (you fix it and resubmit), or reject it if it does not follow the brief. Rejected work is not paid.',
  },
  {
    id: 'live-hold',
    question: 'What is the live hold?',
    answer:
      'Many gigs need your post or comment to stay live for a hold period, for example 24 hours, before final approval. If it is removed by you, a moderator or the platform during the hold, the gig may not be approved. The hold period is shown on each gig.',
  },
  {
    id: 'payouts',
    question: 'How and when do I get paid?',
    answer:
      'Approved earnings are added to your TinyGig balance. Payouts are sent by our team directly to the UPI ID on your profile, and you get an email with the UTR reference for each payout so you can match it in your bank or UPI app.',
  },
  {
    id: 'earnings',
    question: 'How much can I earn?',
    answer:
      'It depends on how many gigs are available and how many you complete. Every gig shows its payout in rupees before you claim it, so you always know what a task pays. There is no guaranteed income or fixed salary.',
  },
  {
    id: 'referrals',
    question: 'How does the referral program work?',
    answer:
      'Every worker gets a personal referral link. You can earn bonus rewards when friends sign up with your link, get approved and complete gigs. The exact rewards are set by our team and can change over time; the current rules are always shown in your dashboard.',
  },
  {
    id: 'free-to-join',
    question: 'Is it free to join? Do I have to follow subreddit rules?',
    answer:
      'Yes, TinyGig is free and we will never ask you to pay to join or to unlock gigs. And yes, you must follow the rules of each platform and community you post in. Briefs are written with that in mind, and spammy or rule-breaking work is rejected.',
  },
]

export function faqPageJsonLd(items: FaqItem[] = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
