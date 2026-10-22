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
      'TinyGig is a gig-work platform for India. Our team posts small paid social media tasks, mostly Reddit posts, comments and replies in specific subreddits, plus tasks on X, LinkedIn, Threads, Instagram and other platforms. You say you are interested in a gig, our team picks one account per slot, and if you are selected you complete it, submit proof and get paid to your UPI ID once the work is approved.',
  },
  {
    id: 'who-can-apply',
    question: 'Who can apply?',
    answer:
      'Anyone 18 or older who lives in India and has a UPI ID and a phone number. Most gigs are on Reddit, so an active Reddit account helps a lot. When you apply we ask for your name, Reddit profile link, the date your Reddit account was created, karma, UPI ID, state, phone and email, plus a referral code if you have one.',
  },
  {
    id: 'approval-time',
    question: 'How long does approval take?',
    answer:
      'Every application is reviewed by a person, usually within 24 to 48 hours. You get an email as soon as you are approved, and you can start raising your hand for gigs right away.',
  },
  {
    id: 'karma-requirements',
    question: 'Do I need a lot of Reddit karma?',
    answer:
      'Not to join. Some gigs set their own requirements, such as minimum karma, account age or a specific state, and you will see those on the gig before you raise your hand. Gigs without requirements are open to every approved worker.',
  },
  {
    id: 'claiming',
    question: 'How do I get a gig?',
    answer:
      'Open the list of gigs and tap “I’m interested”, ideally within the first few minutes. That reserves nothing. Our team picks one account for each slot, based on account age, recent activity and fit with the community, and you get a notification if you are selected. You then have a set window, shown on the gig, to post and submit. If the window runs out, the slot goes back to the pool. If a limit stops you from taking a gig, the gig shows you why and when it lifts.',
  },
  {
    id: 'proof',
    question: 'What do I submit as proof?',
    answer:
      'Two things, at two times. First, the link to your post or comment, posted from the account that was selected for the gig. Then, once the live hold is over, a screenshot of the post’s insights.',
  },
  {
    id: 'review',
    question: 'What happens after I submit?',
    answer:
      'A reviewer checks your link and insights against the brief. They approve it, ask for changes with a comment (you fix it and send it again), or reject it if it does not follow the brief. Approved work goes into your balance. Rejected work is not paid.',
  },
  {
    id: 'live-hold',
    question: 'What is the live hold?',
    answer:
      'After you submit the link, your post or comment must stay live for the hold period shown on the gig, usually 24 hours. Then you upload a screenshot of the post’s insights (Reddit shows them under the post). If it is removed by you, a moderator or the platform during the hold, it is not paid. Replying to comments on your own post is part of the task.',
  },
  {
    id: 'cooldowns',
    question: 'Why is a gig locked for me?',
    answer:
      'To keep accounts healthy, every gig checks a few cooldowns: one gig a day per person, no repeat in the same community within a week, a limit on how many open tasks you hold, and limits on work for the same client per account. A locked gig always says which rule applies and the date it opens again.',
  },
  {
    id: 'account-safety',
    question: 'Can I lose my Reddit account doing gigs?',
    answer:
      'Any platform can warn, restrict or ban any account, including while it does gigs. You run your own accounts and they are your responsibility: TinyGig is not liable if one is suspended, shadowbanned or lost. Writing in your own words, following the brief and respecting each community’s rules is the best way to keep an account healthy.',
  },
  {
    id: 'pay-levels',
    question: 'Why does the same gig pay different amounts?',
    answer:
      'Reddit posts and comments pay by the level of the account that does them, which comes from how old the account is: under two weeks is warm-up only, then L1 up to 3 months, L2 up to 6 months, L3 up to a year and L4 after that. Your rate is fixed the moment your account is selected and never changes afterwards. Accounts move up a level on their own as they get older. Upvotes pay the same at every level.',
  },
  {
    id: 'payouts',
    question: 'How and when do I get paid?',
    answer:
      'Approved earnings are added to your TinyGig balance. Every Monday, the whole balance goes into that week’s payout, with no minimum, and our team sends it to the UPI ID on your profile. You get an email with the UTR reference for each payout so you can match it in your bank or UPI app.',
  },
  {
    id: 'earnings',
    question: 'How much can I earn?',
    answer:
      'It depends on how many gigs are available and how many you complete. Every gig shows what it pays in rupees, and once you are selected the rate is fixed, so you always know what a task pays. There is no guaranteed income or fixed salary.',
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
