// ── Schema.org JSON-LD generators ────────────────────────────────────────────
//
// Returns plain JS objects ready to be JSON.stringify'd and emitted as
// <script type="application/ld+json"> in the head. Keeps schema in one
// place so we don't end up with five different "@type": "Article"
// shapes across the codebase.
//
// Helpers cover the content types Google rich-results most reliably
// surfaces for a local-news/community site:
//   - Organization (root, once per page via root layout)
//   - WebSite (root, with SearchAction)
//   - NewsArticle / Article (article pages)
//   - Event (calendar event detail)
//   - BreadcrumbList (any page with a nav trail)
//   - ItemList (guide/listing index pages)

import { absoluteUrl } from './metadata'

export interface OrganizationInput {
  name:         string
  url:          string
  logoUrl:      string | null
  socialUrls?:  string[]   // Facebook, Instagram, etc.
}

/** Site-level organization identity. Emit once in root layout. */
export function organizationJsonLd(input: OrganizationInput) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Organization',
    name:        input.name,
    url:         input.url,
    ...(input.logoUrl && { logo: input.logoUrl }),
    ...(input.socialUrls?.length && { sameAs: input.socialUrls }),
  }
}

export interface WebSiteInput {
  name:      string
  url:       string
  /** When provided, adds a SearchAction so Google's site-search box
   *  knows to call /search?q=… */
  searchPath?: string  // e.g. '/search?q={search_term_string}'
}

export function websiteJsonLd(input: WebSiteInput) {
  return {
    '@context':       'https://schema.org',
    '@type':          'WebSite',
    name:             input.name,
    url:              input.url,
    ...(input.searchPath && {
      potentialAction: {
        '@type':       'SearchAction',
        target:        `${input.url.replace(/\/$/, '')}${input.searchPath}`,
        'query-input': 'required name=search_term_string',
      },
    }),
  }
}

export interface ArticleJsonLdInput {
  title:        string
  description:  string
  url:          string
  imageUrl?:    string | null
  publishedAt?: string  // ISO
  modifiedAt?:  string  // ISO
  authorName?:  string
  publisherName: string
  publisherLogoUrl: string | null
  /** Section / column the article belongs to (e.g. 'Play Ball',
   *  'Mom to Mom'). Surfaces as articleSection in rich results. */
  articleSection?: string
  /** 'NewsArticle' for time-sensitive editorial, 'Article' for
   *  evergreen guides. Defaults to Article. */
  type?: 'Article' | 'NewsArticle'
}

export function articleJsonLd(input: ArticleJsonLdInput) {
  return {
    '@context':     'https://schema.org',
    '@type':        input.type ?? 'Article',
    headline:       input.title,
    description:    input.description,
    url:            input.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    ...(input.imageUrl && { image: [input.imageUrl] }),
    ...(input.publishedAt && { datePublished: input.publishedAt }),
    ...(input.modifiedAt  && { dateModified:  input.modifiedAt  }),
    ...(input.authorName && {
      author: { '@type': 'Person', name: input.authorName },
    }),
    publisher: {
      '@type': 'Organization',
      name:    input.publisherName,
      ...(input.publisherLogoUrl && {
        logo: { '@type': 'ImageObject', url: input.publisherLogoUrl },
      }),
    },
    ...(input.articleSection && { articleSection: input.articleSection }),
  }
}

export interface EventJsonLdInput {
  name:        string
  description: string
  url:         string
  startDate:   string   // ISO with timezone
  endDate?:    string
  /** 'OfflineEventAttendanceMode' is the default for our calendar. */
  attendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode'
  status?:     'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled'
  imageUrl?:   string | null
  locationName?:    string
  locationAddress?: string
  locationCity?:    string
  locationState?:   string
  isFree?:    boolean
  costText?:  string
  organizerName?: string
  organizerUrl?:  string
}

export function eventJsonLd(input: EventJsonLdInput) {
  return {
    '@context':       'https://schema.org',
    '@type':          'Event',
    name:             input.name,
    description:      input.description,
    url:              input.url,
    startDate:        input.startDate,
    ...(input.endDate && { endDate: input.endDate }),
    eventAttendanceMode: `https://schema.org/${input.attendanceMode ?? 'OfflineEventAttendanceMode'}`,
    eventStatus:         `https://schema.org/${input.status ?? 'EventScheduled'}`,
    ...(input.imageUrl && { image: [input.imageUrl] }),
    ...(input.locationName || input.locationAddress) && {
      location: {
        '@type': 'Place',
        ...(input.locationName && { name: input.locationName }),
        ...(input.locationAddress && {
          address: {
            '@type':         'PostalAddress',
            streetAddress:   input.locationAddress,
            ...(input.locationCity  && { addressLocality: input.locationCity  }),
            ...(input.locationState && { addressRegion:   input.locationState }),
            addressCountry: 'US',
          },
        }),
      },
    },
    ...(input.isFree === true || input.costText) && {
      offers: {
        '@type':         'Offer',
        price:           input.isFree ? '0' : undefined,
        priceCurrency:   'USD',
        ...(input.costText && { description: input.costText }),
        availability:    'https://schema.org/InStock',
        url:             input.url,
      },
    },
    ...(input.organizerName && {
      organizer: {
        '@type': 'Organization',
        name:    input.organizerName,
        ...(input.organizerUrl && { url: input.organizerUrl }),
      },
    }),
  }
}

export interface BreadcrumbItem {
  name: string
  path: string   // site-root-relative
}

export function breadcrumbJsonLd(items: BreadcrumbItem[], publicOrigin: string) {
  return {
    '@context':      'https://schema.org',
    '@type':         'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       it.name,
      item:       absoluteUrl(it.path, publicOrigin),
    })),
  }
}

export interface ItemListInput {
  name:    string
  items:   Array<{ name: string; url: string; image?: string }>
}

export function itemListJsonLd(input: ItemListInput) {
  return {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    name:            input.name,
    itemListElement: input.items.map((it, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       it.name,
      url:        it.url,
      ...(it.image && { image: it.image }),
    })),
  }
}

/** Inline-friendly serialization — JSON.stringify with the right
 *  escaping to safely sit inside a <script> tag. */
export function jsonLdScript(obj: object): string {
  // Escape </script> sequences so a malicious value can't break out.
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}
