import { SITE } from '@/lib/site'
import { EXAMPLE_GIGS, formatGigPay } from './example-gigs'
import { FAQ } from './faq-data'
import { absoluteUrl } from './seo'
import { STEPS } from './steps-data'

/** Public, indexable pages. Used by sitemap.xml and llms.txt. */
export const PUBLIC_PAGES = [
  { path: '/', title: 'Home', description: 'Overview of TinyGig, example gigs, requirements and payouts.', priority: '1.0', changefreq: 'weekly' },
  { path: '/how-it-works', title: 'How it works', description: 'The four steps from applying to getting paid by UPI.', priority: '0.8', changefreq: 'monthly' },
  { path: '/faq', title: 'FAQ', description: 'Answers about eligibility, selection, proof, the live hold, payouts and referrals.', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy', title: 'Privacy policy', description: 'What data TinyGig collects and why.', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', title: 'Terms of service', description: 'Rules for workers using TinyGig.', priority: '0.3', changefreq: 'yearly' },
] as const

const SUMMARY = `> ${SITE.name} is a gig-work platform for India. The team posts small paid social media tasks ("gigs"), mostly Reddit posts, comments and replies in specific subreddits, plus tasks on X (Twitter), LinkedIn, Threads, Instagram and other platforms. Approved workers say they are interested in gigs, the team selects one account per slot, the worker completes it from that account, submit a proof link, and are paid in Indian rupees (INR) to their UPI ID after human review.`

const REQUIREMENTS = `- 18 or older and living in India.
- A Reddit account (profile link, account age and karma are asked for when applying).
- A UPI ID for payouts, a phone number and an email address.
- Sign in with Google or a one-time email code.
- Some gigs add their own requirements, such as minimum karma, account age or state. These are shown before claiming.
- Free to join. TinyGig never asks workers to pay.`

const PAYOUTS = `- A reviewer approves the submission, requests changes with comments, or rejects it. Rejected work is not paid.
- Many gigs require the post to stay live for a hold period (for example 24 hours) before final approval.
- Approved earnings are added to the worker's TinyGig balance.
- Payouts are sent manually by the TinyGig team to the worker's UPI ID. The worker receives an email with the UTR reference.
- There is no guaranteed income; each gig shows its pay in rupees; Reddit posts and comments pay more from older accounts, and the rate is fixed once an account is selected.`

const REFERRALS = `Every worker gets a personal referral link and can earn bonus rewards when referred friends sign up, get approved and complete gigs. The reward rules are set by the TinyGig team and change over time; current rules are shown in the worker dashboard.`

function pageLinks() {
  return PUBLIC_PAGES.map((p) => `- [${p.title}](${absoluteUrl(p.path)}): ${p.description}`).join('\n')
}

export function llmsTxt() {
  return `# ${SITE.name}

${SUMMARY}

Audience: students, freelancers and Reddit regulars in India who want to earn from home using their phone. Contact: ${SITE.email}.

## How it works

${STEPS.map((s, i) => `${i + 1}. **${s.title}**: ${s.summary}`).join('\n')}

## Requirements

${REQUIREMENTS}

## Payouts

${PAYOUTS}

## Pages

${pageLinks()}
- [Apply](${absoluteUrl('/login')}): Sign in and apply to become a worker.

## Optional

- [Full content for LLMs](${absoluteUrl('/llms-full.txt')}): Complete FAQ and detailed steps in one file.
`
}

export function llmsFullTxt() {
  return `# ${SITE.name}

${SUMMARY}

Audience: students, freelancers and Reddit regulars in India who want to earn from home using their phone.
Website: ${SITE.url}
Contact: ${SITE.email}
Currency: Indian rupees (INR, ₹). Payment method: UPI.

## How it works

${STEPS.map((s, i) => `### ${i + 1}. ${s.title}\n\n${s.summary}\n\n${s.details.map((d) => `- ${d}`).join('\n')}`).join('\n\n')}

## Platforms and task types

- Reddit (most gigs): posts, comments and replies in specific subreddits.
- X (Twitter): replies, quote posts and threads.
- LinkedIn: comments and short posts.
- Threads: replies and conversation starters.
- Instagram: comments on posts and reels.
- Other platforms appear as new gigs come in.

## Example gigs (illustrative only, real gigs and rates vary)

${EXAMPLE_GIGS.map((g) => `- ${g.task} (${g.where}): ${formatGigPay(g)}${g.payoutMax ? ' depending on account age' : ''}${g.requirement ? `, requires ${g.requirement}` : ''}`).join('\n')}

## Requirements

${REQUIREMENTS}

## Reviews and payouts

${PAYOUTS}

## Referral program

${REFERRALS}

## Frequently asked questions

${FAQ.map((f) => `### ${f.question}\n\n${f.answer}`).join('\n\n')}

## Pages

${pageLinks()}
- [Apply](${absoluteUrl('/login')}): Sign in and apply to become a worker.
`
}
