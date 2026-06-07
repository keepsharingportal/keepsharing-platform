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

export async function Navigation() {
  return (
    <>
      {/* Renders nothing when no advertiser is booked — by design. */}
      <SiteTopBanner />
      <NavigationBar />
    </>
  )
}
