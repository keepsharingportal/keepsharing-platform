// Rate card — every ad slot on the platform with its pricing.
//
// Single source of truth that the admin map page, the assignment form,
// and the future Stripe auto-invoice all read from. When the sales team
// quotes a price, it matches what the system uses.
//
// Prices are per-month unless otherwise noted. Annual = 12× monthly with
// a ~15% discount. Quarterly = 3× monthly with ~8% discount.
//
// Organized by surface (same grouping as placement-types.ts) so the
// admin map page can render them in logical sections.

export interface SlotRate {
  placementType: string          // matches ad_placements.placement_type
  label:         string          // human label shown in admin
  surface:       string          // grouping key
  description:   string          // what the advertiser gets
  locked:        boolean         // true = one advertiser owns it; false = rotation pool
  monthly:       number          // $/month
  quarterly:     number          // $/quarter
  annual:        number          // $/year
}

export const RATE_CARD: SlotRate[] = [
  // ── Calendar ──────────────────────────────────────────────────────────────
  {
    placementType: 'section_sponsor', surface: 'calendar',
    label:       'Calendar — Top Sponsor (Hero)',
    description: 'Presenting sponsor in the hero section of /calendar. "Proudly Presented By [You]." One advertiser, locked.',
    locked: true, monthly: 800, quarterly: 2200, annual: 7800,
  },
  {
    placementType: 'calendar_featured_event', surface: 'calendar',
    label:       'Calendar — Banner Sponsor',
    description: 'Full-width banner above or below the event grid. Image + headline + CTA. Two positions available (top + bottom).',
    locked: true, monthly: 500, quarterly: 1400, annual: 5000,
  },
  {
    placementType: 'calendar_inline_promotion', surface: 'calendar',
    label:       'Calendar — Grid Ad Card',
    description: 'Shaped like an event card, drops into positions 4 + 9 in the grid. Rotates if multiple advertisers are booked.',
    locked: false, monthly: 300, quarterly: 800, annual: 2800,
  },

  // ── School Zone ───────────────────────────────────────────────────────────
  {
    placementType: 'section_sponsor', surface: 'school-zone',
    label:       'School Zone — Top Sponsor (Hero)',
    description: 'Presenting sponsor in the School Zone hero. One advertiser, locked.',
    locked: true, monthly: 800, quarterly: 2200, annual: 7800,
  },

  // ── School Bits ───────────────────────────────────────────────────────────
  {
    placementType: 'school_bits_sponsor', surface: 'school-bits',
    label:       'School Bits — Top Sponsor',
    description: 'Annual presenting sponsor in the School Bits hero.',
    locked: true, monthly: 600, quarterly: 1650, annual: 6000,
  },
  {
    placementType: 'school_bits_inline', surface: 'school-bits',
    label:       'School Bits — Inline Card',
    description: 'Rotates among batches of 12 bits. Two per batch.',
    locked: false, monthly: 250, quarterly: 680, annual: 2400,
  },
  {
    placementType: 'school_bits_transition', surface: 'school-bits',
    label:       'School Bits — Transition Banner',
    description: 'Full-width banner above each new Load More batch.',
    locked: false, monthly: 350, quarterly: 960, annual: 3400,
  },

  // ── Mom Knows Best ────────────────────────────────────────────────────────
  {
    placementType: 'section_sponsor', surface: 'mom-knows-best',
    label:       'Mom Knows Best — Top Sponsor (Hero)',
    description: 'Presenting sponsor in the Mom Knows Best hero.',
    locked: true, monthly: 600, quarterly: 1650, annual: 6000,
  },

  // ── Brain Games ───────────────────────────────────────────────────────────
  {
    placementType: 'section_sponsor', surface: 'games',
    label:       'Brain Games — Top Sponsor (Hero)',
    description: 'Presenting sponsor in the Brain Games hero.',
    locked: true, monthly: 500, quarterly: 1400, annual: 5000,
  },

  // ── Articles ──────────────────────────────────────────────────────────────
  {
    placementType: 'article_header_sponsor', surface: 'articles',
    label:       'Article — Header Sponsor',
    description: 'Sponsor strip at the top of an article. One per article or per column, locked.',
    locked: true, monthly: 400, quarterly: 1100, annual: 3800,
  },
  {
    placementType: 'article_sidebar_sticky', surface: 'articles',
    label:       'Article — Sidebar (Sticky)',
    description: 'Sidebar ad that follows the reader. Rotates from pool.',
    locked: false, monthly: 300, quarterly: 800, annual: 2800,
  },
  {
    placementType: 'article_inline', surface: 'articles',
    label:       'Article — Inline Break',
    description: 'In-body ad break inserted after every ~4 paragraphs. Rotates from pool.',
    locked: false, monthly: 200, quarterly: 540, annual: 1900,
  },

  // ── Guides ────────────────────────────────────────────────────────────────
  {
    placementType: 'guide_sidebar_sticky', surface: 'guides',
    label:       'Guide — Sidebar (Sticky)',
    description: 'Sidebar ad on guide detail pages. Rotates from pool.',
    locked: false, monthly: 300, quarterly: 800, annual: 2800,
  },
  {
    placementType: 'guide_featured_strip', surface: 'guides',
    label:       'Guide — Featured Strip',
    description: 'Featured-partner strip across a guide page.',
    locked: true, monthly: 500, quarterly: 1400, annual: 5000,
  },

  // ── Homepage ──────────────────────────────────────────────────────────────
  {
    placementType: 'homepage_inline_ad', surface: 'homepage',
    label:       'Homepage — Inline Ad',
    description: 'In-feed sponsored card on the homepage. Rotates from pool.',
    locked: false, monthly: 400, quarterly: 1100, annual: 3800,
  },
  {
    placementType: 'homepage_sidebar_ad', surface: 'homepage',
    label:       'Homepage — Sidebar',
    description: 'Square sidebar ad on the homepage. Rotates from pool.',
    locked: false, monthly: 350, quarterly: 960, annual: 3400,
  },
  {
    placementType: 'homepage_bottom_ad', surface: 'homepage',
    label:       'Homepage — Bottom Ad',
    description: 'Wide ad block below the homepage feed.',
    locked: false, monthly: 250, quarterly: 680, annual: 2400,
  },

  // ── Newsletter ────────────────────────────────────────────────────────────
  {
    placementType: 'newsletter_sponsor', surface: 'newsletter',
    label:       'Newsletter — Sponsor',
    description: 'Sponsor block inside the weekly email. One per issue, locked.',
    locked: true, monthly: 600, quarterly: 1650, annual: 6000,
  },

  // ── Site-wide ─────────────────────────────────────────────────────────────
  {
    placementType: 'site_footer_partners', surface: 'site',
    label:       'Footer — Partner Logos',
    description: 'Logo strip in the global footer. Rotates from pool.',
    locked: false, monthly: 100, quarterly: 270, annual: 960,
  },
]

export const SURFACE_ORDER = [
  'calendar', 'school-zone', 'school-bits', 'mom-knows-best', 'games',
  'articles', 'guides', 'homepage', 'newsletter', 'site',
]

export const SURFACE_LABELS: Record<string, string> = {
  'calendar':       '📅 Calendar',
  'school-zone':    '🎓 School Zone',
  'school-bits':    '📰 School Bits',
  'mom-knows-best': '💬 Mom Knows Best',
  'games':          '🧠 Brain Games',
  'articles':       '📰 Articles',
  'guides':         '📚 Guides',
  'homepage':       '🏠 Homepage',
  'newsletter':     '📧 Newsletter',
  'site':           '🌐 Site-wide',
}

export function getSlotRate(placementType: string, surface?: string): SlotRate | undefined {
  return RATE_CARD.find(r =>
    r.placementType === placementType &&
    (!surface || r.surface === surface),
  )
}

export function getRatesBySurface(): Map<string, SlotRate[]> {
  const map = new Map<string, SlotRate[]>()
  for (const slot of RATE_CARD) {
    const arr = map.get(slot.surface) ?? []
    arr.push(slot)
    map.set(slot.surface, arr)
  }
  return map
}
