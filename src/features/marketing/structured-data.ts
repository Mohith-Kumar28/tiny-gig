import { SITE } from '@/lib/site'
import { absoluteUrl } from './seo'
import { STEPS } from './steps-data'

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl('/apple-touch-icon.png'),
    email: SITE.email,
    description: SITE.description,
    areaServed: { '@type': 'Country', name: 'India' },
    sameAs: [`https://x.com/${SITE.twitter.replace(/^@/, '')}`],
    contactPoint: { '@type': 'ContactPoint', email: SITE.email, contactType: 'customer support', availableLanguage: ['en', 'hi'] },
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    inLanguage: 'en-IN',
    description: SITE.description,
    publisher: { '@id': `${SITE.url}/#organization` },
  }
}

export function howToJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to earn with TinyGig',
    description: 'Apply once, claim small paid social media gigs, submit proof and get paid by UPI.',
    inLanguage: 'en-IN',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'INR', value: 0 },
    step: STEPS.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.title,
      text: [step.summary, ...step.details].join(' '),
      url: absoluteUrl(`/how-it-works#${step.id}`),
    })),
  }
}
