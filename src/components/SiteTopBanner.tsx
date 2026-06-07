// SiteTopBanner — server component that renders the site-wide leaderboard
// ad strip ABOVE the navigation, on every public page.
//
// Pattern matches Atlanta Parent's site-top rotation: prime, dismissibly-not-
// sticky, full-width, one ad per page view chosen from a rotation pool. We
// pull up to 5 bookings, weighted-random pick one, and render its image
// edge-to-edge as a clickable link with impression + click tracking.
//
// Auto-hides when nothing is booked — by design. Per editor direction:
// "No selling the spot when off." Empty real estate at the very top of
// every page reads worse than no real estate at all.

import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds, type ActiveAd } from '@/lib/get-active-ads'
import { TrackedImpression } from '@/components/tracking/TrackedImpression'

// pickWeighted — same algorithm the homepage uses for its 4 rotation
// slots. Each row's rotation_weight defaults to 1 if missing. With a
// single active booking the pick collapses to that ad (no rotation
// surprise for exclusive-tier sponsors).
function pickWeighted(rows: ActiveAd[]): ActiveAd | null {
  if (rows.length === 0) return null
  const weights = rows.map(r => Math.max(0, r.rotation_weight ?? 1))
  const total   = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return rows[0]
  // Deterministic per-render randomness — Math.random is fine here
  // because this server component runs uncached per request via
  // force-dynamic upstream. For routes that ARE cached, the rotation
  // collapses to the first ad until the cache invalidates, which is
  // acceptable for low-frequency sponsor changes.
  let r = Math.random() * total
  for (let i = 0; i < rows.length; i++) {
    r -= weights[i]
    if (r <= 0) return rows[i]
  }
  return rows[rows.length - 1]
}

export async function SiteTopBanner() {
  // Up to 5 in rotation per the inventory cap.
  const ads = await getActiveAds('site_top_banner', null, 5, { rotate: true })
  const ad  = pickWeighted(ads)

  // No booking → no banner. Strict by design: no sales placeholder
  // here. The top of every page is too valuable to use as inventory
  // self-promotion; if it's empty it should be invisible.
  if (!ad || !ad.ad_link || !ad.ad_image_url) return null

  return (
    <TrackedImpression adPlacementId={ad.id}>
      <Link
        href={ad.ad_link}
        data-ad-placement="site-top-banner"
        aria-label={ad.ad_headline ?? 'Sponsor'}
        className="block w-full bg-foreground/5 border-b border-border/40 hover:bg-foreground/8 transition-colors"
      >
        <div className="relative w-full overflow-hidden">
          {/* aspect-ratio container scales the image responsively
              without layout shift. Desktop banners are typically
              ~1200x180 (≈6.7:1), mobile banners crop to ~3:1 via
              CSS — the next/image sizes attr handles the network
              cost so we don't ship the desktop file to phones. */}
          <div className="relative w-full" style={{ aspectRatio: '1200 / 180' }}>
            <Image
              src={ad.ad_image_url}
              alt={ad.ad_headline ?? 'Sponsor'}
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </Link>
    </TrackedImpression>
  )
}
