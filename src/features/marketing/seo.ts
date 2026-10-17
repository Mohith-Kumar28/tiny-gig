import { SITE } from '@/lib/site'

export const OG_IMAGE = { url: `${SITE.url}/og.png`, width: 1200, height: 630, alt: 'TinyGig: get paid to post on Reddit, X, LinkedIn and Threads' }

/** Absolute URL for a site path, e.g. absoluteUrl('/faq') -> https://tinygig.in/faq */
export function absoluteUrl(path = '/') {
  return new URL(path, SITE.url).toString()
}

type PageHeadInput = {
  path: string
  title: string
  description: string
  type?: 'website' | 'article'
}

/** Builds the `head()` return value for a marketing route: meta, Open Graph, Twitter card and canonical link. */
export function pageHead({ path, title, description, type = 'website' }: PageHeadInput) {
  const url = absoluteUrl(path)
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url },
      { property: 'og:image', content: OG_IMAGE.url },
      { property: 'og:image:width', content: String(OG_IMAGE.width) },
      { property: 'og:image:height', content: String(OG_IMAGE.height) },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      { property: 'og:locale', content: 'en_IN' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: SITE.twitter },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: OG_IMAGE.url },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}
