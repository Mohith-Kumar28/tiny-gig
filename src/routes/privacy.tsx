// LEGAL REVIEW NEEDED: plain-language draft written for product launch. Have this reviewed by a
// lawyer for compliance with the Digital Personal Data Protection Act, 2023 and the IT Act/Rules
// before relying on it. Confirm the grievance officer details and the list of service providers.
import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/features/marketing/legal-page'
import { pageHead } from '@/features/marketing/seo'
import { SITE } from '@/lib/site'

export const Route = createFileRoute('/privacy')({
  head: () =>
    pageHead({
      path: '/privacy',
      title: `Privacy policy | ${SITE.name}`,
      description: 'What personal data TinyGig collects, why we collect it, who we share it with and the choices you have.',
      type: 'article',
    }),
  component: PrivacyPage,
})

const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead="The short version: we collect what we need to review your application, check your work and pay you. We do not sell your data."
      updated="16 October 2026"
    >
      <p>
        This policy explains how {SITE.name} (“we”, “us”) handles personal data when you use {SITE.url.replace('https://', '')}{' '}
        and the {SITE.name} app. It applies to visitors, applicants and approved workers.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name and email address, and your basic Google profile if you sign in with
          Google.
        </li>
        <li>
          <strong>Application details:</strong> your Reddit profile link, Reddit account age and karma, UPI ID, state, phone
          number and any referral code you enter.
        </li>
        <li>
          <strong>Work details:</strong> the gigs you claim, the links and screenshots you submit as proof, and reviewer
          comments and decisions.
        </li>
        <li>
          <strong>Payout details:</strong> your balance, payout amounts, dates and UTR references.
        </li>
        <li>
          <strong>Referral details:</strong> who invited you and who signed up with your link.
        </li>
        <li>
          <strong>Technical details:</strong> cookies needed to keep you signed in, and basic logs (such as IP address, device
          and browser type) that help us keep the service secure.
        </li>
      </ul>
      <p>We also look at the public posts and profiles you link to, so we can check that the work is yours and still live.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To review your application and decide whether you are eligible for specific gigs.</li>
        <li>To match your accounts to gigs, review your submissions and calculate your earnings.</li>
        <li>To send payouts to your UPI ID and email you the UTR reference.</li>
        <li>To run the referral program and credit referral rewards.</li>
        <li>To send emails about your account, such as approval, review results and payouts.</li>
        <li>To prevent fraud, duplicate accounts and abuse, and to meet legal obligations.</li>
      </ul>
      <p>
        We process your data based on your consent when you apply, and as needed to provide the service you asked for. We
        do not use it for advertising.
      </p>

      <h2>Who we share it with</h2>
      <p>We never sell your personal data. We share it only with:</p>
      <ul>
        <li>
          Service providers who help us run {SITE.name}, such as cloud hosting, database, email delivery and sign-in
          providers, under agreements that limit how they can use it.
        </li>
        <li>Banks and payment apps involved in sending your UPI payout.</li>
        <li>Authorities, when the law requires it or to protect people from harm or fraud.</li>
      </ul>
      <p>Clients who fund gigs see the public links to completed work, not your phone number, UPI ID or email.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account is active. If you close your account we delete or anonymise it within a
        reasonable time, except records we must keep for tax, accounting, fraud prevention or legal reasons, such as payout
        history.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can ask us to show you the personal data we hold about you, correct it, or delete it, and you can withdraw your
        consent at any time. Withdrawing consent or deleting your account means we can no longer offer you gigs or pay
        out future earnings, so request any pending payout first. Email {mail} to make a request.
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections, access controls and reputable infrastructure providers. No system is perfectly secure,
        so please keep your email account safe and tell us right away if you think your {SITE.name} account has been misused.
      </p>

      <h2>Age</h2>
      <p>{SITE.name} is only for people aged 18 or older. We do not knowingly collect data from anyone younger.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy in a meaningful way we will update the date above and, for important changes, tell you by
        email or in the app.
      </p>

      <h2>Contact and grievances</h2>
      <p>
        For any privacy question or complaint, email {mail}. We aim to reply within 7 days. If you are not satisfied with our
        response, you may approach the Data Protection Board of India.
      </p>
    </LegalPage>
  )
}
