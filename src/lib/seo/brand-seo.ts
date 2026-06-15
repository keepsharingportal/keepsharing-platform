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
  /** Local-search queries we WANT to rank for. Used by the AI SEO
   *  assistant + weekly Claude audit to prioritize coverage gaps
   *  ("we should be ranking for Montgomery summer camps but aren't").
   *  Brand-aware: each region's list is different (Montgomery families
   *  vs Mobile Bay families search differently). */
  targetKeywords:   string[]
  /** Known local-news / competing publication domains for this market.
   *  Powers competitor-comparison features (where do they rank that we
   *  don't, what topics are they covering, etc.). */
  competitorDomains: string[]
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
  foundingYear?:     number
  socialUrls?:       string[]
  knowsAbout?:       string[]
  audience?:         string
  brandColor?:       string
  legalName?:        string
  targetKeywords?:   string[]
  competitorDomains?: string[]
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
    targetKeywords: [
      'Montgomery family events', 'Montgomery summer camps', 'River Region schools',
      'Montgomery pediatricians', 'Pike Road schools', 'Prattville family activities',
      'Autauga County schools', 'Elmore County family events', 'Montgomery birthday parties',
      'River Region childcare', 'Montgomery moms', 'River Region after-school programs',
      'Montgomery parks', 'River Region homeschool', 'Montgomery teen activities',
      'River Region newcomer guide', 'Montgomery family restaurants',
      'River Region special needs resources', 'Montgomery field trips',
      'best schools in Montgomery AL',
    ],
    competitorDomains: [
      'montgomeryparents.com', 'al.com', 'wsfa.com', 'montgomeryadvertiser.com',
    ],
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
    targetKeywords: [
      'Montgomery 50+ events', 'River Region retirement', 'Montgomery senior activities',
      'River Region grandparenting', 'Montgomery senior services', 'River Region active aging',
      'Montgomery boomer travel', 'River Region empty nester', 'senior dining Montgomery',
      'River Region midlife reinvention', 'Montgomery downsizing',
    ],
    competitorDomains: ['al.com', 'wsfa.com', 'montgomeryadvertiser.com'],
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
    targetKeywords: [
      'Mobile family events', 'Mobile Bay summer camps', 'Mobile schools',
      'Mobile pediatricians', 'Daphne family activities', 'Spanish Fort schools',
      'Mobile Bay childcare', 'Fairhope family events', 'Mobile birthday parties',
      'Mobile Bay moms', 'Mobile parks', 'Mobile newcomer guide',
    ],
    competitorDomains: ['al.com', 'fox10tv.com', 'mobilebaymag.com'],
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
    targetKeywords: [
      'Auburn family events', 'Opelika summer camps', 'Auburn schools',
      'Auburn pediatricians', 'Lee County family activities', 'Auburn childcare',
      'Auburn moms', 'Auburn parks', 'Auburn newcomer guide', 'Opelika schools',
    ],
    competitorDomains: ['al.com', 'oanow.com'],
  },
  esp: {
    foundingYear: 2015,
    socialUrls: [
      'https://www.facebook.com/easternshoreparents',
    ],
    knowsAbout: ['Parenting', 'Eastern Shore Family Activities', 'Local Schools'],
    audience: 'Eastern Shore Alabama families with children',
    brandColor: '#ef6442',
    targetKeywords: [
      'Eastern Shore family events', 'Daphne schools', 'Fairhope summer camps',
      'Baldwin County schools', 'Eastern Shore childcare', 'Spanish Fort family activities',
      'Eastern Shore moms', 'Fairhope newcomer guide',
    ],
    competitorDomains: ['al.com', 'fox10tv.com'],
  },
  gpp: {
    foundingYear: 2014,
    socialUrls: [
      'https://www.facebook.com/greaterpensacolaparents',
    ],
    knowsAbout: ['Parenting', 'Greater Pensacola Family Life', 'Local Schools'],
    audience: 'Greater Pensacola families with children',
    brandColor: '#ef6442',
    targetKeywords: [
      'Pensacola family events', 'Pensacola summer camps', 'Pensacola schools',
      'Escambia County schools', 'Pensacola childcare', 'Pensacola pediatricians',
      'Pensacola Beach family activities', 'Pace schools', 'Milton family events',
      'Pensacola moms', 'Pensacola newcomer guide',
    ],
    competitorDomains: ['pnj.com', 'weartv.com', 'pensacolavoice.com'],
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
    targetKeywords:   o.targetKeywords ?? [
      `${market.regionLabel} family events`,
      `${market.regionLabel} schools`,
      `${market.regionLabel} summer camps`,
      `${market.regionLabel} childcare`,
      `${market.regionLabel} family activities`,
    ],
    competitorDomains: o.competitorDomains ?? [],
    currency:         'USD',
    brandColor:       o.brandColor ?? '#ef6442',
    editorialPolicyUrl:   `${origin}/about/editorial-policy`,
    ethicsPolicyUrl:      `${origin}/about/editorial-policy`,
    correctionsPolicyUrl: `${origin}/about/corrections`,
    aboutUrl:             `${origin}/about`,
    contactEmail:         'hello@riverregionparents.com',
  }
}
