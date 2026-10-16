// ── Central SEO metadata builder ─────────────────────────────────────────────
//
// Every page-level generateMetadata() should call buildPageMetadata so we
// never ship a page with empty OG / Twitter / canonical / image data
// again. Brand-aware: pulls the active brand from loadBrandContext()
// (or accepts an explicit override for routes that need to force a
// brand — e.g., article pages where the article's own brand_slug
// overrides the request's resolved brand).
//
// Returns a fully-populated Next.js Metadata object. Caller supplies the
// PAGE-SPECIFIC fields (title, description, path, image, type, dates);
// everything else (site name, twitter handle, metadataBase, canonical
// URL building, default image fallback) flows from defaults.

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { brandifyCopy } from '@/lib/brandify'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'
import { metadataBaseForRequest } from '@/lib/markets'

export interface BuildPageMetadataInput {
  /** Page title — used as-is for og:title + twitter:title. The browser
   *  tab title becomes `${title} — ${brand displayName}` when the title
   *  doesn't already contain the brand name. */
  title:        string
  /** 1-2 sentence summary. Becomes meta description, og:description,
   *  twitter:description. ~155 characters reads best in SERPs. */
  description:  string
  /** Site-root-relative path for this page ('/', '/games',
   *  '/columns/play-ball/jane-doe'). Used to build canonical URL +
   *  og:url. Leading slash required. */
  path:         string
  /** Page-specific hero image URL (article hero, event flyer, game
   *  signature card). Absolute or root-relative both work. When
   *  omitted, the route's opengraph-image.tsx convention generates a
   *  default, or the root /opengraph-image fallback is used. */
  image?:       string | null
  /** Alt text for the image (Twitter + accessibility). Defaults to
   *  `${title} — ${brand displayName}`. */
  imageAlt?:    string
  /** og:type — 'article' for articles, 'website' for hubs, 'event' for
   *  calendar event pages (mapped to article for FB compat). Defaults
   *  to 'website'. */
  type?:        'website' | 'article'
  /** ISO datetime — required by Facebook for type='article'. */
  publishedTime?: string
  modifiedTime?:  string
  /** When provided, included in og:article:author and meta tag. */
  authorName?:    string
  /** Override the active brand chrome (e.g. article pages force the
   *  article's brand_slug). Otherwise loadBrandContext() resolves it
   *  from the request. */
  brandSlug?: string
  /** Override the public origin. Used by article pages so the canonical
   *  URL matches the article's own brand domain even when the request
   *  came from a different host. */
  publicOrigin?: string
  /** Optional list of section/category keywords. */
  keywords?: string[]
  /** When true, adds noindex,nofollow. Default false. */
  noIndex?:  boolean
}

/** Resolve absolute URL for a site-root-relative path under the active
 *  brand's origin. */
export function absoluteUrl(path: string, publicOrigin?: string): string {
  const origin = (publicOrigin ?? '').replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${origin}${cleanPath}`
}

export async function buildPageMetadata(input: BuildPageMetadataInput): Promise<Metadata> {
  const ctx       = await loadBrandContext()
  const brandName = ctx.market.displayName
  void chromeForBrand(ctx.brand)
  const origin    = input.publicOrigin ?? ctx.publicOrigin
  // Where this deployment is actually reachable. Canonical URLs stay on
  // `origin` (the brand's public domain). Share-image URLs have to be on
  // the host that runs /opengraph-image and /api/og-image, which is not
  // the canonical domain while that domain still points elsewhere.
  const requestHeaders = await headers()
  const served = metadataBaseForRequest(
    origin,
    requestHeaders.get('host'),
    requestHeaders.get('x-forwarded-proto'),
  )

  // Per-route overrides (page_metadata_overrides table). Loaded for
  // EVERY page so editors can tune social sharing copy on static routes
  // (/school-zone, /about, etc.) the same way they can on articles.
  // No-op when the table doesn't exist or no row matches.
  const { loadPageMetadataOverride } = await import('@/lib/seo/page-metadata-overrides')
  const override = await loadPageMetadataOverride(input.path, input.brandSlug ?? ctx.market.slug)

  // Resolved values — override wins, then input, then fall back.
  //
  // brandifyCopy rewrites River-Region-worded strings for whichever brand is
  // being served. Thirty pages call this helper with titles, descriptions and
  // keywords written when there was one brand, so without it Greater
  // Pensacola's tabs, search snippets and share cards all said River Region.
  // An identity transform on RRP — see lib/brandify.ts.
  const brandify = (t: string) => brandifyCopy(t, ctx.market)

  const resolvedTitle       = brandify(override?.ogTitle?.trim()       || input.title)
  const resolvedDescription = brandify(override?.ogDescription?.trim() || input.description)
  const resolvedImage       = override?.ogImageUrl?.trim()    || input.image || null
  const resolvedNoIndex     = override?.noindex ?? !!input.noIndex
  const resolvedCanonical   = override?.canonicalOverride?.trim()
    ? override.canonicalOverride
    : absoluteUrl(input.path, origin)

  const tabTitle = resolvedTitle.includes(brandName)
    ? resolvedTitle
    : `${resolvedTitle} — ${brandName}`

  const imageAbsolute = resolvedImage
    ? (resolvedImage.startsWith('http') ? resolvedImage : absoluteUrl(resolvedImage, origin))
    : null
  const imageAlt = input.imageAlt ?? `${resolvedTitle} — ${brandName}`

  // Social scrapers get a JPEG at exactly the size we declare, via /api/og-image.
  //
  // Two problems this solves. Our pipeline outputs WebP, and Facebook's WebP
  // handling for og:image is unreliable — it's a known cause of the small
  // side-thumbnail card rather than the full-width one. And the width/height
  // below were hardcoded 1200×630 on every page regardless of the real file
  // (the Play Ball hero is 1600×900), so a scraper that measures the image
  // found it disagreeing with the declaration and fell back to the small
  // layout. Routing through the converter makes the declared numbers true.
  //
  // Only for images we can actually convert — an off-site URL an editor pasted
  // is passed through untouched rather than 403'd by the converter.
  const canConvert = (u: string) =>
    /(^https?:\/\/[^/]*\.supabase\.co\/)|(^https?:\/\/([^/]*\.)?riverregionparents\.com\/)/i.test(u)
  const socialImage = imageAbsolute && canConvert(imageAbsolute)
    ? `${served}/api/og-image?src=${encodeURIComponent(imageAbsolute)}`
    : imageAbsolute

  // A page that sets openGraph without `images` replaces the root file
  // image instead of inheriting it (Next merges openGraph by replacement).
  // About, the calendar, and the articles index were sharing with no image
  // at all. When the page has no hero, point at the branded
  // /opengraph-image on the host that serves it.
  const cardImage = socialImage ?? `${served}/opengraph-image`
  const cardType  = socialImage ? 'image/jpeg' : 'image/png'

  // Twitter inherits OG unless explicitly overridden.
  const twitterTitle = override?.twitterTitle?.trim()       || resolvedTitle
  const twitterDesc  = override?.twitterDescription?.trim() || resolvedDescription
  const twitterImg   = override?.twitterImageUrl?.trim()
    ? (override.twitterImageUrl.startsWith('http') ? override.twitterImageUrl : absoluteUrl(override.twitterImageUrl, origin))
    : cardImage
  const twitterCard  = override?.twitterCardType ?? 'summary_large_image'

  const md: Metadata = {
    metadataBase: new URL(origin),
    title:       tabTitle,
    description: resolvedDescription,
    keywords:    input.keywords?.map(brandify),
    alternates: {
      canonical: resolvedCanonical,
    },
    openGraph: {
      siteName:    brandName,
      type:        input.type ?? 'website',
      url:         resolvedCanonical,
      title:       resolvedTitle,
      description: resolvedDescription,
      locale:      'en_US',
      images: [{
        url:    cardImage,
        alt:    imageAlt,
        // True for /api/og-image, which produces exactly this. The generated
        // fallback is a 1200×630 PNG. An off-site URL passed through
        // unconverted is still a best guess, as it always was.
        width:  1200,
        height: 630,
        type:   cardType,
      }],
      ...(input.type === 'article' && {
        publishedTime: input.publishedTime,
        modifiedTime:  input.modifiedTime,
        authors:       input.authorName ? [input.authorName] : undefined,
      }),
    },
    twitter: {
      card:        twitterCard,
      title:       twitterTitle,
      description: twitterDesc,
      images: [{ url: twitterImg, alt: imageAlt }],
    },
    robots: resolvedNoIndex
      ? { index: false, follow: false }
      : { index: true,  follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  }

  return md
}
