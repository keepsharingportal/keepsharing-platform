// Single source of truth for ad_placements.placement_type values.
//
// Each entry has:
//   - slug:           the actual DB value
//   - label:          short name shown in admin dropdowns
//   - whereItAppears: plain-English "the publisher could find this in 10s"
//                     description of the exact slot location
//   - description:    detailed editor hint (what the slot is for, sizing notes,
//                     rotation rules)
//   - surface:        grouping key so the dropdown can render <optgroup>s
//
// Add a new placement_type by appending here AND in the surface that
// renders it. The /admin/ads list + new form both pull from this list.

export interface PlacementTypeDef {
  slug:           string
  label:          string
  whereItAppears: string
  description:    string
  surface:        SurfaceKey
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
    label: 'Homepage — Sponsored card (mid-feed)',
    whereItAppears: 'On the homepage, in the main column, between "Happening Around Town" events and "Latest Stories". Wide horizontal card with image left, copy + CTA right.',
    description: 'In-feed sponsored card. One rotated by display_priority — the highest priority active row wins.' },

  { slug: 'homepage_sidebar_ad',         surface: 'homepage',
    label: 'Homepage — Square sidebar card (top of right rail)',
    whereItAppears: 'On the homepage right sidebar, top position — square card, ~340×340. Image fills the card with overlay headline. First sidebar item above the Mom Knows Best block.',
    description: 'Square sidebar ad. Image-overlay style. Falls back to "Reach River Region Families" CTA when no booking is active.' },

  { slug: 'homepage_business_spotlight', surface: 'homepage',
    label: 'Homepage — Dark "Business Spotlight" card (sidebar)',
    whereItAppears: 'On the homepage right sidebar, beneath Mom Knows Best. Dark navy card with the business name + a short pitch + a "Read their story" link.',
    description: 'Sidebar Business Spotlight card. Promotes one business of the moment.' },

  { slug: 'homepage_bottom_ad',          surface: 'homepage',
    label: 'Homepage — Wide banner (bottom of main column)',
    whereItAppears: 'On the homepage, at the bottom of the main column, beneath the Family Resource Guides section. Wide gradient card with the image on the left and headline + CTA on the right.',
    description: 'Wide ad block below the main homepage feed. Highest-impression homepage spot per scroll.' },

  { slug: 'homepage_hero_rotator',       surface: 'homepage',
    label: 'Homepage — Hero rotator (top of page)',
    whereItAppears: 'Currently unused. Reserved for a future rotating hero promo at the very top of the homepage.',
    description: 'Reserved — not yet rendered on the public site.' },

  // ── School Bits ──────────────────────────────────────────────────────────
  { slug: 'school_bits_sponsor',         surface: 'school-bits',
    label: 'School Bits — Annual presenting sponsor (top)',
    whereItAppears: 'On /school-zone, in the School Bits hero. Large branded card at the very top: "School Bits presented by [advertiser]" with logo.',
    description: 'Annual presenting sponsor card in the School Bits hero. Pair with placement_context = school-bits and use the section_sponsor type if you want it to also surface elsewhere via existing queries.' },

  { slug: 'school_bits_inline',          surface: 'school-bits',
    label: 'School Bits — In-feed card (every batch)',
    whereItAppears: 'On /school-zone, woven into the bit feed. ~2 ads per 12-bit batch. Reader sees one every ~6 bits as they scroll/Load More.',
    description: '12-bit batch on the public School Bits page picks 2 of these per batch. Rotates as the reader hits Load More.' },

  { slug: 'school_bits_transition',      surface: 'school-bits',
    label: 'School Bits — Transition banner (between batches)',
    whereItAppears: 'On /school-zone, full-width banner that appears ABOVE each new batch when the reader hits Load More. Premium "attention-grab" position because nothing else is on screen at that moment.',
    description: 'Wide banner shown ABOVE each new batch when the reader hits Load More. Premium attention-grab slot.' },

  // ── Articles ─────────────────────────────────────────────────────────────
  { slug: 'article_sidebar_sticky',      surface: 'articles',
    label: 'Article — Sticky sidebar (follows scroll)',
    whereItAppears: 'On any article page, right sidebar. Stays visible (sticky) while the reader scrolls through the body. Image card with headline + CTA.',
    description: 'Sidebar ad that stays visible while the reader scrolls an article.' },

  { slug: 'article_sidebar_sponsored',   surface: 'articles',
    label: 'Article — Sponsored content card (sidebar)',
    whereItAppears: 'On any article page, right sidebar, beneath the sticky ad. Styled like editorial content — "sponsored by" label + headline.',
    description: 'Sponsored content card in the article sidebar.' },

  { slug: 'article_inline',              surface: 'articles',
    label: 'Article — In-body ad break (mid-article)',
    whereItAppears: 'On any article page, inserted into the article body around the midpoint. Wide block that breaks up long copy.',
    description: 'In-body ad break inserted into the article body flow.' },

  { slug: 'article_header_sponsor',      surface: 'articles',
    label: 'Article — Header sponsor strip (top of article)',
    whereItAppears: 'On any article page, thin strip directly above the article title. "Presented by [advertiser]" treatment.',
    description: 'Sponsor strip at the top of an article.' },

  { slug: 'article_inline_recommendation', surface: 'articles',
    label: 'Article — In-body recommendation card',
    whereItAppears: 'On any article page, in-body, styled as a "You might like" recommendation card with the advertiser\'s pitch.',
    description: 'In-body "you might like" sponsored recommendation.' },

  { slug: 'article_footer_listings',     surface: 'articles',
    label: 'Article — Footer listings strip',
    whereItAppears: 'On any article page, at the very bottom beneath the body. Listings strip of partner businesses.',
    description: 'Listings strip at the bottom of an article.' },

  // ── Guides ───────────────────────────────────────────────────────────────
  { slug: 'guide_sidebar_sticky',        surface: 'guides',
    label: 'Guide — Sticky sidebar (detail pages)',
    whereItAppears: 'On guide detail pages (e.g. /healthy-kids-guide/listings/dentistry-for-children), right sidebar, sticky while scrolling.',
    description: 'Sticky sidebar ad on guide detail pages.' },

  { slug: 'guide_inline',                surface: 'guides',
    label: 'Guide — In-feed ad (guide pages)',
    whereItAppears: 'On a guide landing page (e.g. /healthy-kids-guide), in the listing feed. Mixed in with category listings.',
    description: 'In-feed ad on guide pages.' },

  { slug: 'guide_inline_sponsored',      surface: 'guides',
    label: 'Guide — Sponsored content (in-feed)',
    whereItAppears: 'On a guide landing page, styled to look like editorial content with a "sponsored" tag, woven into the feed.',
    description: 'Sponsored content card woven into a guide feed.' },

  { slug: 'guide_featured_strip',        surface: 'guides',
    label: 'Guide — Featured partner strip',
    whereItAppears: 'On a guide landing page, full-width horizontal strip across the page. Usually mid-page above category grids.',
    description: 'Featured-partner strip across a guide page.' },

  { slug: 'guide_directory_inline_ad',   surface: 'guides',
    label: 'Guide — Directory grid card',
    whereItAppears: 'On a guide directory page, woven into the business listing grid. Visually styled like a listing card so it blends in.',
    description: 'Ad woven into the directory listing grid on guide pages.' },

  // ── Verticals (School Zone, Mom Knows Best, etc.) ────────────────────────
  { slug: 'section_sponsor',             surface: 'verticals',
    label: 'Section — Top "presented by" sponsor',
    whereItAppears: 'On any vertical/guide page (configurable via placement_context), at the top of the section hero. "[Section] presented by [advertiser]" treatment.',
    description: 'Presenting-sponsor card in a vertical/guide hero. Filter by placement_context to scope to a specific section (e.g., school-zone, family-resource-guide).' },

  // ── Calendar ─────────────────────────────────────────────────────────────
  { slug: 'calendar_featured_event',     surface: 'calendar',
    label: 'Calendar — Featured event card',
    whereItAppears: 'On /calendar, highlighted card at the top of the event list. Larger than regular events, styled with a "featured" badge.',
    description: 'Highlighted event slot on the calendar page.' },

  { slug: 'calendar_inline_promotion',   surface: 'calendar',
    label: 'Calendar — In-grid promotion',
    whereItAppears: 'On /calendar, in the event grid, mixed in with regular events. Styled like an event card but marked "Sponsored".',
    description: 'Promo woven into the calendar grid.' },

  // ── Newsletter ───────────────────────────────────────────────────────────
  { slug: 'newsletter_sponsor',          surface: 'newsletter',
    label: 'Newsletter — Sponsor block (in email)',
    whereItAppears: 'In the weekly River Region Parents email newsletter. Sponsor block beneath the top stories.',
    description: 'Sponsor block inside the weekly email newsletter.' },

  // ── Site-wide ────────────────────────────────────────────────────────────
  { slug: 'site_footer_partners',        surface: 'site',
    label: 'Site — Footer partner logos',
    whereItAppears: 'In the site footer on EVERY page. Row of partner logos at the bottom, beneath the navigation links.',
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
