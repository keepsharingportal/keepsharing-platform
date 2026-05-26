// Single source of truth for ad_placements.placement_type values.
//
// Each entry has:
//   - slug:        the actual DB value
//   - label:       human-friendly name shown in admin dropdowns
//   - description: tooltip-style hint for the editor about what this powers
//   - surface:     grouping key so the dropdown can render <optgroup>s
//
// Add a new placement_type by appending here AND in the surface that
// renders it. The /admin/ads list + new form both pull from this list.

export interface PlacementTypeDef {
  slug:        string
  label:       string
  description: string
  surface:     SurfaceKey
}

export type SurfaceKey =
  | 'homepage'
  | 'school-bits'
  | 'articles'
  | 'guides'
  | 'verticals'
  | 'calendar'
  | 'newsletter'
  | 'site'

export const SURFACE_LABELS: Record<SurfaceKey, string> = {
  homepage:     'Homepage',
  'school-bits': 'School Bits',
  articles:     'Articles',
  guides:       'Guides',
  verticals:    'Verticals',
  calendar:     'Calendar',
  newsletter:   'Newsletter',
  site:         'Site-wide',
}

// Ordered roughly by surface group — keeps the dropdown reading top-down
// from the most-visible surfaces (homepage) down to chrome (site-wide).
export const PLACEMENT_TYPES: PlacementTypeDef[] = [

  // ── Homepage ─────────────────────────────────────────────────────────────
  { slug: 'homepage_inline_ad',          surface: 'homepage',
    label: 'Homepage — Inline Ad',
    description: 'In-feed sponsored card on the homepage (and FRG home). One rotated by display_priority.' },
  { slug: 'homepage_sidebar_ad',         surface: 'homepage',
    label: 'Homepage — Sidebar Ad',
    description: 'Square sidebar ad on the homepage and FRG. Image-overlay style.' },
  { slug: 'homepage_business_spotlight', surface: 'homepage',
    label: 'Homepage — Business Spotlight',
    description: 'Sidebar card promoting one business of the moment.' },
  { slug: 'homepage_bottom_ad',          surface: 'homepage',
    label: 'Homepage — Bottom Ad',
    description: 'Wide ad block below the main homepage feed.' },
  { slug: 'homepage_hero_rotator',       surface: 'homepage',
    label: 'Homepage — Hero Rotator',
    description: 'Reserved for a future rotating hero promo.' },

  // ── School Bits ──────────────────────────────────────────────────────────
  { slug: 'school_bits_sponsor',         surface: 'school-bits',
    label: 'School Bits — Top Sponsor',
    description: 'Annual presenting sponsor card in the School Bits hero. Pair with placement_context = school-bits and use the section_sponsor type if you want it to also surface elsewhere via existing queries.' },
  { slug: 'school_bits_inline',          surface: 'school-bits',
    label: 'School Bits — Inline Card',
    description: '12-bit batch on the public School Bits page picks 2 of these per batch. Rotates as the reader hits Load More.' },
  { slug: 'school_bits_transition',      surface: 'school-bits',
    label: 'School Bits — Transition Banner',
    description: 'Wide banner shown ABOVE each new batch when the reader hits Load More. Premium attention-grab slot.' },

  // ── Articles ─────────────────────────────────────────────────────────────
  { slug: 'article_sidebar_sticky',      surface: 'articles',
    label: 'Article — Sticky Sidebar',
    description: 'Sidebar ad that stays visible while the reader scrolls an article.' },
  { slug: 'article_sidebar_sponsored',   surface: 'articles',
    label: 'Article — Sponsored Sidebar Card',
    description: 'Sponsored content card in the article sidebar.' },
  { slug: 'article_inline',              surface: 'articles',
    label: 'Article — Inline',
    description: 'In-body ad break inserted into the article body flow.' },
  { slug: 'article_header_sponsor',      surface: 'articles',
    label: 'Article — Header Sponsor',
    description: 'Sponsor strip at the top of an article.' },
  { slug: 'article_inline_recommendation', surface: 'articles',
    label: 'Article — Inline Recommendation',
    description: 'In-body "you might like" sponsored recommendation.' },
  { slug: 'article_footer_listings',     surface: 'articles',
    label: 'Article — Footer Listings',
    description: 'Listings strip at the bottom of an article.' },

  // ── Guides ───────────────────────────────────────────────────────────────
  { slug: 'guide_sidebar_sticky',        surface: 'guides',
    label: 'Guide — Sticky Sidebar',
    description: 'Sticky sidebar ad on guide detail pages.' },
  { slug: 'guide_inline',                surface: 'guides',
    label: 'Guide — Inline',
    description: 'In-feed ad on guide pages.' },
  { slug: 'guide_inline_sponsored',      surface: 'guides',
    label: 'Guide — Inline Sponsored',
    description: 'Sponsored content card woven into a guide feed.' },
  { slug: 'guide_featured_strip',        surface: 'guides',
    label: 'Guide — Featured Strip',
    description: 'Featured-partner strip across a guide page.' },
  { slug: 'guide_directory_inline_ad',   surface: 'guides',
    label: 'Guide — Directory Inline Ad',
    description: 'Ad woven into the directory listing grid on guide pages.' },

  // ── Verticals (School Zone, Mom Knows Best, etc.) ────────────────────────
  { slug: 'section_sponsor',             surface: 'verticals',
    label: 'Section — Top Sponsor',
    description: 'Presenting-sponsor card in a vertical/guide hero. Filter by placement_context to scope to a specific section (e.g., school-zone, family-resource-guide).' },

  // ── Calendar ─────────────────────────────────────────────────────────────
  { slug: 'calendar_featured_event',     surface: 'calendar',
    label: 'Calendar — Featured Event',
    description: 'Highlighted event slot on the calendar page.' },
  { slug: 'calendar_inline_promotion',   surface: 'calendar',
    label: 'Calendar — Inline Promotion',
    description: 'Promo woven into the calendar grid.' },

  // ── Newsletter ───────────────────────────────────────────────────────────
  { slug: 'newsletter_sponsor',          surface: 'newsletter',
    label: 'Newsletter — Sponsor',
    description: 'Sponsor block inside the weekly email newsletter.' },

  // ── Site-wide ────────────────────────────────────────────────────────────
  { slug: 'site_footer_partners',        surface: 'site',
    label: 'Site — Footer Partners',
    description: 'Footer strip of partner logos.' },
]

export const PLACEMENT_TYPE_SLUGS = PLACEMENT_TYPES.map(p => p.slug)

export function findPlacementType(slug: string | null | undefined): PlacementTypeDef | null {
  if (!slug) return null
  return PLACEMENT_TYPES.find(p => p.slug === slug) ?? null
}

export function groupedPlacementTypes(): Array<{ surface: SurfaceKey; label: string; entries: PlacementTypeDef[] }> {
  const out: Array<{ surface: SurfaceKey; label: string; entries: PlacementTypeDef[] }> = []
  const surfaceOrder: SurfaceKey[] = [
    'homepage', 'school-bits', 'articles', 'guides', 'verticals',
    'calendar', 'newsletter', 'site',
  ]
  for (const surface of surfaceOrder) {
    const entries = PLACEMENT_TYPES.filter(p => p.surface === surface)
    if (entries.length > 0) {
      out.push({ surface, label: SURFACE_LABELS[surface], entries })
    }
  }
  return out
}
