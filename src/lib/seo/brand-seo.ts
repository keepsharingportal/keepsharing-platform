// ── Per-brand SEO config — local-news authority signals ───────────────────
//
// Every public surface needs to know "who is publishing this" with
// enough detail for Google to grade us as a legitimate local-news
// publisher. The output of this file feeds:
//
//   - NewsMediaOrganization JSON-LD (root layout)
//   - News sitemap (publisher name)
//   - RSS feed (channel metadata)
//   - Web App Manifest (name + theme color)
//   - Per-page metadata defaults
//
// Adding a new brand = add a row to MARKETS (markets.ts) — the SEO
// config falls out of city/state/regionLabel by default, with optional
// per-brand overrides below for things only the editor knows
// (founding year, masthead URL, social handles, knowsAbout subject
// list). Defaults are SAFE — a new brand without overrides still
// emits valid local-news schema.

import type { MarketDef } from '@/lib/markets'

export interface BrandSeoConfig {
  organizationName: string
  legalName?:       string
  url:              string
  logoUrl:          string
  slogan:           string
  /** ISO year the brand started publishing — emits as foundingDate.
   *  E-E-A-T signal that this isn't a fly-by-night blog. */
  foundingYear?:    number
  socialUrls:       string[]
  /** Full text label of the area we serve — emits as areaServed
   *  (AdministrativeArea / GeoCircle). Example: "River Region, AL". */
  areaServedLabel:  string
  /** ISO country code. All current brands are US. */
  addressCountry:   string
  addressLocality:  string  // city
  addressRegion:    string  // state code (e.g. 'AL')
  /** Subjects the publication writes about — emits as knowsAbout
   *  on NewsMediaOrganization. Major E-E-A-T signal for niche
   *  ranking. */
  knowsAbout:       string[]
  /** Target audience (for the audience field on Organization). */
  audience:         string
  /** ISO 4217 currency code for any commerce schema (advertising,
   *  events). */
  currency:         'USD'
  /** Hex color used as theme-color on web manifest + OG default
   *  image background. Per-brand chrome takes priority; this is the
   *  fallback. */
  brandColor:       string
  /** Editorial policy / about / corrections URLs — emits on
   *  NewsMediaOrganization. Set to absolute URLs. */
  editorialPolicyUrl?: string
  ethicsPolicyUrl?:    string
  correctionsPolicyUrl?: string
  /** Where the masthead (about the publication) lives. */
  aboutUrl?:           string
  contactEmail?:       string
}

// ── Per-brand overrides ─────────────────────────────────────────────────────
// Only set fields the default doesn't get right. Everything else
// flows from MARKETS + sensible defaults.

interface BrandOverride {
  foundingYear?: number
  socialUrls?:   string[]
  knowsAbout?:   string[]
  audience?:     string
  brandColor?:   string
  legalName?:    string
}

const BRAND_OVERRIDES: Record<string, BrandOverride> = {
  rrp: {
    foundingYear: 2005,
    socialUrls: [
      'https://www.facebook.com/riverregionparents',
      'https://www.instagram.com/riverregionparents',
      'https://www.pinterest.com/riverregionparents',
    ],
    knowsAbout: [
      'Parenting', 'Family Events', 'Local Schools', 'Education',
      'Childcare', 'Summer Camps', 'Birthday Parties', 'After-School Programs',
      'Family Activities', 'Mom Community', 'Healthy Kids', 'Special Needs Support',
      'Newcomer Resources', 'Pediatric Health', 'Family-Friendly Restaurants',
    ],
    audience: 'Mothers, fathers, grandparents, and caregivers of River Region children',
    brandColor: '#ef6442',  // site coral
    legalName: 'River Region Parents Magazine',
  },
  rr50plus: {
    foundingYear: 2018,
    socialUrls: [
      'https://www.facebook.com/riverregion50plus',
      'https://www.instagram.com/riverregion50plus',
    ],
    knowsAbout: [
      'Adults 50+', 'Retirement Living', 'Empty Nester Activities',
      'Senior Health', 'Grandparenting', 'Travel for Boomers',
      'Active Aging', 'Local Events', 'Reinvention', 'Caregiving',
    ],
    audience: 'River Region adults ages 50 and older',
    brandColor: '#0B1F37',  // 50+ navy
    legalName: 'River Region 50+ Magazine',
  },
  mbp: {
    foundingYear: 2010,
    socialUrls: [
      'https://www.facebook.com/mobilebayparents',
      'https://www.instagram.com/mobilebayparents',
    ],
    knowsAbout: [
      'Parenting', 'Family Events', 'Local Schools', 'Mobile Bay Activities',
      'Childcare', 'Summer Camps', 'Mom Community', 'Family Activities',
    ],
    audience: 'Mobile Bay families with children',
    brandColor: '#ef6442',
  },
  aop: {
    foundingYear: 2012,
    socialUrls: [
      'https://www.facebook.com/auburnopelikaparents',
      'https://www.instagram.com/auburnopelikaparents',
    ],
    knowsAbout: ['Parenting', 'Family Events', 'Local Schools', 'Auburn Opelika Family Life'],
    audience: 'Auburn-Opelika families with children',
    brandColor: '#ef6442',
  },
  esp: {
    foundingYear: 2015,
    socialUrls: [
      'https://www.facebook.com/easternshoreparents',
    ],
    knowsAbout: ['Parenting', 'Eastern Shore Family Activities', 'Local Schools'],
    audience: 'Eastern Shore Alabama families with children',
    brandColor: '#ef6442',
  },
  gpp: {
    foundingYear: 2014,
    socialUrls: [
      'https://www.facebook.com/greaterpensacolaparents',
    ],
    knowsAbout: ['Parenting', 'Greater Pensacola Family Life', 'Local Schools'],
    audience: 'Greater Pensacola families with children',
    brandColor: '#ef6442',
  },
}

/** Build the per-brand SEO config. Everything is brand-aware: every
 *  string mentions the right city, the right area, the right social
 *  handles. Adding a new brand just means adding a row to MARKETS
 *  + (optionally) overriding the knowsAbout list + social URLs in
 *  BRAND_OVERRIDES above. */
export function getBrandSeoConfig(market: MarketDef, publicOrigin: string): BrandSeoConfig {
  const o = BRAND_OVERRIDES[market.slug] ?? {}
  const origin = publicOrigin.replace(/\/$/, '')
  return {
    organizationName: market.displayName,
    legalName:        o.legalName,
    url:              origin,
    logoUrl:          `${origin}/images/advertise/rrp-logo.png`,
    slogan:           `The Go-To Resource for ${market.regionLabel} Families`,
    foundingYear:     o.foundingYear,
    socialUrls:       o.socialUrls ?? [],
    areaServedLabel:  `${market.regionLabel}, ${market.state}`,
    addressCountry:   'US',
    addressLocality:  market.city,
    addressRegion:    market.state,
    knowsAbout:       o.knowsAbout ?? [
      'Parenting', 'Family Events', 'Local Schools', 'Family Activities',
    ],
    audience:         o.audience ?? `${market.regionLabel} families`,
    currency:         'USD',
    brandColor:       o.brandColor ?? '#ef6442',
    editorialPolicyUrl:   `${origin}/about/editorial-policy`,
    ethicsPolicyUrl:      `${origin}/about/editorial-policy`,
    correctionsPolicyUrl: `${origin}/about/corrections`,
    aboutUrl:             `${origin}/about`,
    contactEmail:         'hello@riverregionparents.com',
  }
}
