// Navigation — server-side wrapper that renders the site-wide top
// banner above the interactive nav bar.
//
// We keep the existing NavigationBar client component (dropdowns, mobile
// drawer, sticky behavior) and bolt on a server-rendered <SiteTopBanner />
// above it. The wrapper keeps the export name `Navigation` so all
// existing public pages keep importing it the same way; the banner just
// appears site-wide for free.
//
// SiteTopBanner is a server component (queries the DB for active
// site_top_banner ads) — that's why this wrapper is a server component
// too. NavigationBar stays client because of its interactive UI.

import { NavigationBar } from './NavigationBar'
import { SiteTopBanner } from './SiteTopBanner'
import { MARKETS } from '@/lib/markets'
import type { BrandChrome } from '@/lib/brands'

interface NavigationProps {
  /** When set, the navigation renders with this brand's chrome. When
   *  omitted (the common path from client-tree pages that can't import
   *  next/headers), the RRP defaults render. Server-component pages
   *  that want brand-aware nav resolve loadBrandContext() themselves
   *  and pass the chrome + slug down as a prop. */
  brandSlug?: string
  chrome?:    BrandChrome
}

export async function Navigation(props: NavigationProps = {}) {
  const brandSlug = props.brandSlug ?? 'rrp'
  const market    = MARKETS.find(m => m.slug === brandSlug) ?? MARKETS[0]
  // Split the display name at the LAST space so the wordmark renders the
  // last word in the primary color, matching the existing RRP "River
  // Region [Parents]" treatment. Falls back to no split when single-word.
  const lastSpace = market.displayName.lastIndexOf(' ')
  const wordmarkBase   = lastSpace > 0 ? market.displayName.slice(0, lastSpace) + ' ' : market.displayName
  const wordmarkAccent = lastSpace > 0 ? market.displayName.slice(lastSpace + 1) : ''
  const tagline        = props.chrome?.tagline         ?? 'The Go-To Resource for River Region Families'
  const logoUrl        = props.chrome?.logoUrl         ?? null
  const primaryColor   = props.chrome?.primaryColorHex

  return (
    <>
      {/* Renders nothing when no advertiser is booked — by design. */}
      <SiteTopBanner />
      <NavigationBar
        wordmarkBase={wordmarkBase}
        wordmarkAccent={wordmarkAccent}
        tagline={tagline}
        logoUrl={logoUrl}
        primaryColorHex={primaryColor}
      />
    </>
  )
}
