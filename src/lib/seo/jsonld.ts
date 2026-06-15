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

// ── NewsMediaOrganization — local-news publisher signal ─────────────────────
//
// More specific than Organization; tells Google this is a news/media
// publisher (matters for News Showcase, Top Stories carousel, local
// news ranking). Includes the full E-E-A-T payload — editorial /
// ethics / corrections policy URLs, masthead, founding date, area
// served, address.

export interface NewsMediaOrganizationInput {
  name:                  string
  legalName?:            string
  url:                   string
  logoUrl:               string
  slogan:                string
  foundingYear?:         number
  socialUrls?:           string[]
  /** Topics the publication covers. Major niche-ranking signal. */
  knowsAbout?:           string[]
  /** Free-text audience description. */
  audience?:             string
  /** Geographic area served — e.g. "River Region, AL" */
  areaServedLabel:       string
  /** Postal address. */
  addressLocality:       string
  addressRegion:         string
  addressCountry:        string
  contactEmail?:         string
  /** Editorial transparency URLs — heavily weighted by Google for
   *  news-publisher E-E-A-T. */
  editorialPolicyUrl?:   string
  ethicsPolicyUrl?:      string
  correctionsPolicyUrl?: string
  /** Masthead / about page. */
  aboutUrl?:             string
}

export function newsMediaOrganizationJsonLd(input: NewsMediaOrganizationInput) {
  return {
    '@context':  'https://schema.org',
    '@type':     'NewsMediaOrganization',
    '@id':       `${input.url}#organization`,
    name:        input.name,
    ...(input.legalName && { legalName: input.legalName }),
    url:         input.url,
    slogan:      input.slogan,
    logo: {
      '@type': 'ImageObject',
      url:     input.logoUrl,
    },
    ...(input.foundingYear && { foundingDate: `${input.foundingYear}-01-01` }),
    ...(input.socialUrls?.length && { sameAs: input.socialUrls }),
    ...(input.knowsAbout?.length && { knowsAbout: input.knowsAbout }),
    ...(input.audience && {
      audience: { '@type': 'Audience', audienceType: input.audience },
    }),
    areaServed: {
      '@type': 'AdministrativeArea',
      name:    input.areaServedLabel,
    },
    address: {
      '@type':          'PostalAddress',
      addressLocality:  input.addressLocality,
      addressRegion:    input.addressRegion,
      addressCountry:   input.addressCountry,
    },
    ...(input.contactEmail && {
      contactPoint: {
        '@type':       'ContactPoint',
        contactType:   'Editorial',
        email:         input.contactEmail,
        areaServed:    input.addressCountry,
        availableLanguage: 'English',
      },
    }),
    ...(input.editorialPolicyUrl   && { publishingPrinciples: input.editorialPolicyUrl }),
    ...(input.ethicsPolicyUrl      && { ethicsPolicy:         input.ethicsPolicyUrl }),
    ...(input.correctionsPolicyUrl && { correctionsPolicy:    input.correctionsPolicyUrl }),
    ...(input.aboutUrl             && { mainEntityOfPage:     input.aboutUrl }),
    diversityPolicy:    input.editorialPolicyUrl,
    actionableFeedbackPolicy: input.correctionsPolicyUrl,
  }
}

// ── Person schema for author bios — E-E-A-T signal ─────────────────────────
//
// Article author cards link via JSON-LD to the author's Person entity.
// Google grades how well-attributed your articles are; having author
// pages with Person schema (and the same @id referenced from
// NewsArticle.author) lifts the whole publication.

export interface PersonJsonLdInput {
  name:        string
  url:         string  // author page URL (canonical)
  imageUrl?:   string | null
  jobTitle?:   string  // "Editor in Chief", "Staff Writer", "Contributor"
  description?: string  // short bio
  knowsAbout?: string[]
  socialUrls?: string[]
  email?:      string
  worksForUrl?: string  // back-reference to organization @id
  worksForName?: string
}

export function personJsonLd(input: PersonJsonLdInput) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Person',
    '@id':       `${input.url}#person`,
    name:        input.name,
    url:         input.url,
    ...(input.imageUrl && { image: input.imageUrl }),
    ...(input.jobTitle && { jobTitle: input.jobTitle }),
    ...(input.description && { description: input.description }),
    ...(input.knowsAbout?.length && { knowsAbout: input.knowsAbout }),
    ...(input.socialUrls?.length && { sameAs: input.socialUrls }),
    ...(input.email && { email: input.email }),
    ...(input.worksForUrl && {
      worksFor: {
        '@type': 'NewsMediaOrganization',
        '@id':   `${input.worksForUrl}#organization`,
        ...(input.worksForName && { name: input.worksForName }),
      },
    }),
  }
}

// ── FAQPage schema — for guides + listicles with structured Q&A ────────────

export interface FaqJsonLdInput {
  url: string
  items: Array<{ question: string; answer: string }>
}

export function faqPageJsonLd(input: FaqJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    '@id':      `${input.url}#faqpage`,
    mainEntity: input.items.map(it => ({
      '@type':         'Question',
      name:            it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    it.answer,
      },
    })),
  }
}

// ── HowTo schema — for parenting how-tos / step-by-step guides ─────────────

export interface HowToJsonLdInput {
  name:        string
  description: string
  url:         string
  imageUrl?:   string | null
  totalTime?:  string  // ISO 8601 duration (e.g. PT30M)
  steps:       Array<{ name: string; text: string; imageUrl?: string }>
}

export function howToJsonLd(input: HowToJsonLdInput) {
  return {
    '@context':  'https://schema.org',
    '@type':     'HowTo',
    name:        input.name,
    description: input.description,
    url:         input.url,
    ...(input.imageUrl && { image: input.imageUrl }),
    ...(input.totalTime && { totalTime: input.totalTime }),
    step: input.steps.map((s, i) => ({
      '@type':    'HowToStep',
      position:   i + 1,
      name:       s.name,
      text:       s.text,
      ...(s.imageUrl && { image: s.imageUrl }),
    })),
  }
}

// ── Place schema for town / neighborhood landing pages ──────────────────────

export interface PlaceJsonLdInput {
  name:     string
  url:      string
  containedInPlace?: string  // e.g. "Montgomery County, AL"
  latitude?: number
  longitude?: number
}

export function placeJsonLd(input: PlaceJsonLdInput) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Place',
    name:        input.name,
    url:         input.url,
    ...(input.containedInPlace && {
      containedInPlace: { '@type': 'Place', name: input.containedInPlace },
    }),
    ...(typeof input.latitude === 'number' && typeof input.longitude === 'number' && {
      geo: {
        '@type':    'GeoCoordinates',
        latitude:   input.latitude,
        longitude:  input.longitude,
      },
    }),
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
  /** Caption for the hero image — emitted as ImageObject.caption.
   *  Falls back to the article description. */
  imageCaption?: string | null
  publishedAt?: string  // ISO
  modifiedAt?:  string  // ISO
  authorName?:  string
  /** When the author has a public bio page, link it via @id so the
   *  article ties to Person schema. */
  authorUrl?:   string
  publisherName: string
  publisherUrl?: string  // for @id reference
  publisherLogoUrl: string | null
  /** Section / column the article belongs to (e.g. 'Play Ball',
   *  'Mom to Mom'). Surfaces as articleSection in rich results. */
  articleSection?: string
  /** 'NewsArticle' for time-sensitive editorial, 'Article' for
   *  evergreen guides. Defaults to Article. */
  type?: 'Article' | 'NewsArticle'
  /** Plain-text article body for SpeakableSpecification + wordCount
   *  + brief articleBody snippet. Google uses speakable for voice
   *  assistants ("hey Google, read me the news"). */
  bodyText?:    string | null
  /** Keywords / tags from the article taxonomy. */
  keywords?:    string[]
}

export function articleJsonLd(input: ArticleJsonLdInput) {
  const bodyText  = (input.bodyText ?? '').trim()
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : undefined
  // First 600 chars of body for the articleBody snippet — long enough
  // for Google to grade content quality, short enough to keep the
  // structured-data payload reasonable. The full body is in the HTML.
  const bodySnippet = bodyText ? bodyText.slice(0, 600) + (bodyText.length > 600 ? '…' : '') : undefined

  // ImageObject (with caption) instead of a bare URL string in the
  // image array — Google grades image-rich-result eligibility on
  // structured image metadata. Caption defaults to the article
  // description when no specific caption is provided.
  const imageObj = input.imageUrl ? {
    '@type':  'ImageObject',
    url:      input.imageUrl,
    caption:  input.imageCaption ?? input.description,
  } : null

  return {
    '@context':     'https://schema.org',
    '@type':        input.type ?? 'Article',
    headline:       input.title,
    description:    input.description,
    url:            input.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    ...(imageObj && { image: imageObj }),
    ...(input.publishedAt && { datePublished: input.publishedAt }),
    ...(input.modifiedAt  && { dateModified:  input.modifiedAt  }),
    ...(input.authorName && {
      author: {
        '@type': 'Person',
        name:    input.authorName,
        ...(input.authorUrl && { '@id': `${input.authorUrl}#person`, url: input.authorUrl }),
      },
    }),
    publisher: {
      '@type': 'NewsMediaOrganization',
      ...(input.publisherUrl && { '@id': `${input.publisherUrl}#organization` }),
      name:    input.publisherName,
      ...(input.publisherLogoUrl && {
        logo: { '@type': 'ImageObject', url: input.publisherLogoUrl },
      }),
    },
    ...(input.articleSection && { articleSection: input.articleSection }),
    ...(input.keywords?.length && { keywords: input.keywords.join(', ') }),
    ...(wordCount   && { wordCount }),
    ...(bodySnippet && { articleBody: bodySnippet }),
    // Speakable Specification — Google Assistant + voice rich results.
    // Selectors point at the headline + the article body container so
    // a voice assistant can "read this story" without including ads.
    speakable: {
      '@type':       'SpeakableSpecification',
      cssSelector:   ['h1', 'article p'],
    },
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
