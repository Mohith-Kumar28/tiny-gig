// LEGAL REVIEW NEEDED: plain-language draft. Have a lawyer review it (contractor status, tax/TDS
// obligations, liability caps, governing law and jurisdiction, platform-policy compliance) before
// relying on it.
import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/features/marketing/legal-page'
import { pageHead } from '@/features/marketing/seo'
import { SITE } from '@/lib/site'

export const Route = createFileRoute('/terms')({
  head: () =>
    pageHead({
      path: '/terms',
      title: `Terms of service | ${SITE.name}`,
      description: 'The rules for using TinyGig: eligibility, claiming and completing gigs, reviews, the live hold, UPI payouts and referrals.',
      type: 'article',
    }),
  component: TermsPage,
})

const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>

function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      lead="These terms are the agreement between you and TinyGig. We have kept them as plain as we can. Please read them before you apply."
      updated="16 October 2026"
    >
      <h2>1. Who can use {SITE.name}</h2>
      <p>
        You must be at least 18 years old, live in India and be able to receive payments to a UPI ID in your own name. You
        may have only one {SITE.name} account. The information in your application must be true and about you.
      </p>

      <h2>2. Applications</h2>
      <p>
        Every application is reviewed by our team. We may approve or decline any application, and we may ask for more
        information. Approval lets you see and express interest in gigs; it does not guarantee any amount of work or income.
      </p>

      <h2>3. Gigs</h2>
      <ul>
        <li>Each gig shows its brief, pay range, requirements and the time you have to post once you are selected.</li>
        <li>
          Expressing interest in a gig does not reserve it. Our team selects one account for each slot, and may also assign
          work directly. If you are selected and miss the deadline, the slot may be given to someone else.
        </li>
        <li>
          To protect accounts, we limit how often an account or a person can do client work (for example, one post per day
          and gaps between posts in the same community). When a limit applies we show you the reason and when it lifts.
        </li>
        <li>
          You must do the work yourself, from the account you were selected with, and follow the brief. Proof links must
          come from that account.
        </li>
        <li>
          Replying to comments on your own post or comment is part of the task and is not paid separately. Unanswered
          threads can make the task incomplete.
        </li>
        <li>
          You must follow the rules of each platform and community you post in. Do not use bots, fake or bought accounts,
          vote manipulation, or copied content.
        </li>
        <li>You are responsible for what you post. Do not post anything illegal, hateful, misleading or harmful.</li>
      </ul>

      <h2>4. Reviews and the live hold</h2>
      <p>
        Proof has two steps. First, submit the link to your post or comment. It must then stay live for the hold period
        shown on the gig (usually 24 hours). After the hold, upload a screenshot of the post’s insights. A reviewer then
        approves the work, requests changes, or rejects it. Work that is removed by you, a moderator or the platform during
        the hold is not paid, and we may record the removal against the account. Review decisions are made
        in good faith; if you think a decision was wrong, email {mail} within 7 days.
      </p>

      <h2>5. Earnings and payouts</h2>
      <ul>
        <li>
          Pay for Reddit posts and comments depends on the level of the account that does the task, which comes from the
          account’s age. The rate is fixed when you are selected and does not change afterwards.
        </li>
        <li>Approved earnings are added to your {SITE.name} balance in Indian rupees.</li>
        <li>
          Balances are paid out weekly by our team to the UPI ID on your profile, with no minimum. We email you the UTR
          reference for each payout.
        </li>
        <li>Please keep your UPI ID correct. We are not responsible for payouts sent to a wrong UPI ID that you provided.</li>
        <li>We may hold or reverse earnings linked to fraud, duplicate accounts or rule-breaking work.</li>
        <li>
          You are an independent contractor, not an employee. You are responsible for any taxes on your earnings, and we
          may deduct or report tax where the law requires.
        </li>
      </ul>

      <h2>6. Referrals</h2>
      <p>
        You may share your personal referral link. Referral rewards, and the conditions to earn them, are set by us, shown
        in your dashboard and may change over time. Self-referrals, fake sign-ups or spam invites are not allowed and can
        lead to lost rewards and account suspension.
      </p>

      <h2>7. Fees</h2>
      <p>{SITE.name} is free for workers. We will never ask you to pay to join, to unlock gigs or to receive a payout.</p>

      <h2>8. Your content</h2>
      <p>
        You own what you write. You allow us and the client who funded a gig to view, link to and keep a record of your
        submitted work and proof so we can verify and report on it.
      </p>

      <h2>9. Suspension and closing your account</h2>
      <p>
        You can close your account at any time by emailing {mail}. We may suspend or close accounts that break these terms,
        give false information or put the service or other people at risk. When an account is closed for reasons other
        than fraud or rule-breaking, we will pay out any approved balance.
      </p>

      <h2>10. Disclaimers and liability</h2>
      <p>
        {SITE.name} is provided “as is”. We do not control Reddit, X, LinkedIn, Threads, Instagram or any other platform,
        and we are not affiliated with them. You run and maintain your own social media accounts. {SITE.name} is not
        responsible if any of your accounts is suspended, shadowbanned, restricted or lost, including while doing gigs, and
        we are not responsible for actions those platforms or their moderators take on your accounts. To the extent the law allows, our total liability to you is limited to the approved earnings we owe
        you.
      </p>

      <h2>11. Changes and governing law</h2>
      <p>
        We may update these terms. If we make important changes we will tell you by email or in the app before they take
        effect. These terms are governed by the laws of India.
      </p>

      <h2>12. Contact</h2>
      <p>Questions about these terms? Email {mail}.</p>
    </LegalPage>
  )
}
