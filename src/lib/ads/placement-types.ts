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
  /** Type categorization used by the /admin/ads "By Type" filter. */
  category:       PlacementCategory
  /** When false, this slot is LOCKED to creative_mode='composed' — the
   *  edit form hides the mode dropdown. Used for newsletter sponsor blocks,
   *  footer logo strips, and page sponsor banners where a full-bleed image
   *  doesn't fit the layout. Default = true (mode toggle visible). */
  allowsImageMode?: boolean
  /** Recommended image dimensions surfaced in the edit form so the
   *  advertiser's designer knows what to deliver. Free-form string. */
  recommendedImageSize?: string
}

export type PlacementCategory =
  | 'sidebar'      // sidebar boxes (sticky or static)
  | 'inline'       // in-feed cards / banners woven into content
  | 'in-article'   // body breaks + recommendation cards inside an article
  | 'sponsor'      // "presented by" / top-of-page page sponsor
  | 'footer'       // bottom strips / partner logos
  | 'hero'         // big rotating top-of-page slot

export const CATEGORY_LABELS: Record<PlacementCategory, string> = {
  sidebar:    'Sidebar',
  inline:     'Inline / in-feed',
  'in-article': 'In-article',
  sponsor:    'Page sponsor',
  footer:     'Footer',
  hero:       'Hero rotator',
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
  { slug: 'homepage_inline_ad',          surface: 'homepage', category: 'inline',
    label: 'Homepage — Sponsored card (mid-feed)',
    whereItAppears: 'On the homepage, in the main column, between "Happening Around Town" events and "Latest Stories". Wide horizontal card with image left, copy + CTA right.',
    description: 'In-feed sponsored card. One rotated by display_priority — the highest priority active row wins.',
    recommendedImageSize: 'Image mode: 1200×400 · Composed: 208×160 image left' },

  { slug: 'homepage_sidebar_ad',         surface: 'homepage', category: 'sidebar',
    label: 'Homepage — Square sidebar card (top of right rail)',
    whereItAppears: 'On the homepage right sidebar, top position — square card, ~340×340. Image fills the card with overlay headline. First sidebar item above the Mom Knows Best block.',
    description: 'Square sidebar ad. Image-overlay style. Falls back to "Reach River Region Families" CTA when no booking is active.',
    recommendedImageSize: 'Image mode: 680×680 (1:1 square) · Composed: same image, with overlay text' },

  { slug: 'homepage_business_spotlight', surface: 'homepage', category: 'sidebar',
    label: 'Homepage — Dark "Business Spotlight" card (sidebar)',
    whereItAppears: 'On the homepage right sidebar, beneath Mom Knows Best. Dark navy card with the business name + a short pitch + a "Read their story" link.',
    description: 'Sidebar Business Spotlight card. Promotes one business of the moment.',
    recommendedImageSize: 'Composed: 680×320 banner image · Image mode: 680×500' },

  { slug: 'homepage_bottom_ad',          surface: 'homepage', category: 'footer',
    label: 'Homepage — Wide banner (bottom of main column)',
    whereItAppears: 'On the homepage, at the bottom of the main column, beneath the Family Resource Guides section. Wide gradient card with the image on the left and headline + CTA on the right.',
    description: 'Wide ad block below the main homepage feed. Highest-impression homepage spot per scroll.',
    recommendedImageSize: 'Image mode: 1200×400 · Composed: 208×160 image left' },

  { slug: 'homepage_hero_rotator',       surface: 'homepage', category: 'hero',
    label: 'Homepage — Hero rotator (top of page)',
    whereItAppears: 'Currently unused. Reserved for a future rotating hero promo at the very top of the homepage.',
    description: 'Reserved — not yet rendered on the public site.' },

  // ── School Bits ──────────────────────────────────────────────────────────
  { slug: 'school_bits_sponsor',         surface: 'school-bits', category: 'sponsor',
    label: 'School Bits — Annual presenting sponsor (top)',
    whereItAppears: 'On /school-zone, in the School Bits hero. Large branded card at the very top: "School Bits presented by [advertiser]" with logo.',
    description: 'Annual presenting sponsor card in the School Bits hero.',
    allowsImageMode: false },

  { slug: 'school_bits_inline',          surface: 'school-bits', category: 'inline',
    label: 'School Bits — In-feed card (every batch)',
    whereItAppears: 'On /school-zone, woven into the bit feed. ~2 ads per 12-bit batch. Reader sees one every ~6 bits as they scroll/Load More.',
    description: '12-bit batch on the public School Bits page picks 2 of these per batch. Rotates as the reader hits Load More.' },

  { slug: 'school_bits_transition',      surface: 'school-bits', category: 'inline',
    label: 'School Bits — Transition banner (between batches)',
    whereItAppears: 'On /school-zone, full-width banner that appears ABOVE each new batch when the reader hits Load More. Premium "attention-grab" position because nothing else is on screen at that moment.',
    description: 'Wide banner shown ABOVE each new batch when the reader hits Load More. Premium attention-grab slot.' },

  // ── Articles ─────────────────────────────────────────────────────────────
  { slug: 'article_sidebar_sticky',      surface: 'articles', category: 'sidebar',
    label: 'Article — Sticky sidebar (follows scroll)',
    whereItAppears: 'On any article page, right sidebar. Stays visible (sticky) while the reader scrolls through the body. Image card with headline + CTA.',
    description: 'Sidebar ad that stays visible while the reader scrolls an article.' },

  { slug: 'article_sidebar_sponsored',   surface: 'articles', category: 'sidebar',
    label: 'Article — Sponsored content card (sidebar)',
    whereItAppears: 'On any article page, right sidebar, beneath the sticky ad. Styled like editorial content — "sponsored by" label + headline.',
    description: 'Sponsored content card in the article sidebar.' },

  { slug: 'article_inline',              surface: 'articles', category: 'in-article',
    label: 'Article — In-body ad break (mid-article)',
    whereItAppears: 'On any article page, inserted into the article body around the midpoint. Wide block that breaks up long copy.',
    description: 'In-body ad break inserted into the article body flow.' },

  { slug: 'article_header_sponsor',      surface: 'articles', category: 'sponsor',
    label: 'Article — Header sponsor strip (top of article)',
    whereItAppears: 'On any article page, thin strip directly above the article title. "Presented by [advertiser]" treatment.',
    description: 'Sponsor strip at the top of an article.',
    allowsImageMode: false },

  { slug: 'article_inline_recommendation', surface: 'articles', category: 'in-article',
    label: 'Article — In-body recommendation card',
    whereItAppears: 'On any article page, in-body, styled as a "You might like" recommendation card with the advertiser\'s pitch.',
    description: 'In-body "you might like" sponsored recommendation.' },

  { slug: 'article_footer_listings',     surface: 'articles', category: 'footer',
    label: 'Article — Footer listings strip',
    whereItAppears: 'On any article page, at the very bottom beneath the body. Listings strip of partner businesses.',
    description: 'Listings strip at the bottom of an article.' },

  // ── Guides ───────────────────────────────────────────────────────────────
  { slug: 'guide_sidebar_sticky',        surface: 'guides', category: 'sidebar',
    label: 'Guide — Sticky sidebar (detail pages)',
    whereItAppears: 'On guide detail pages (e.g. /healthy-kids-guide/listings/dentistry-for-children), right sidebar, sticky while scrolling.',
    description: 'Sticky sidebar ad on guide detail pages.' },

  { slug: 'guide_inline',                surface: 'guides', category: 'inline',
    label: 'Guide — In-feed ad (guide pages)',
    whereItAppears: 'On a guide landing page (e.g. /healthy-kids-guide), in the listing feed. Mixed in with category listings.',
    description: 'In-feed ad on guide pages.' },

  { slug: 'guide_inline_sponsored',      surface: 'guides', category: 'inline',
    label: 'Guide — Sponsored content (in-feed)',
    whereItAppears: 'On a guide landing page, styled to look like editorial content with a "sponsored" tag, woven into the feed.',
    description: 'Sponsored content card woven into a guide feed.' },

  { slug: 'guide_featured_strip',        surface: 'guides', category: 'inline',
    label: 'Guide — Featured partner strip',
    whereItAppears: 'On a guide landing page, full-width horizontal strip across the page. Usually mid-page above category grids.',
    description: 'Featured-partner strip across a guide page.' },

  { slug: 'guide_directory_inline_ad',   surface: 'guides', category: 'inline',
    label: 'Guide — Directory grid card',
    whereItAppears: 'On a guide directory page, woven into the business listing grid. Visually styled like a listing card so it blends in.',
    description: 'Ad woven into the directory listing grid on guide pages.' },

  { slug: 'guides_index_ad',             surface: 'guides', category: 'inline',
    label: 'Guides Index — Featured partner card',
    whereItAppears: 'On /local-guides (the Family Resource Guide landing page that lists every guide), featured-partner card woven into the guide tile grid.',
    description: 'Sponsored card on the Local Guides index. Catches readers who are browsing what guide to visit.' },

  // ── Page sponsor (verticals + columns "presented by") ────────────────────
  { slug: 'section_sponsor',             surface: 'verticals', category: 'sponsor',
    label: 'Page sponsor — Top of section / column',
    whereItAppears: 'At the top of a vertical landing page, guide landing page, or community column. "[Page] presented by [advertiser]" treatment.',
    description: 'Top-of-page presenting sponsor. The context_slug field scopes which page this sponsor owns (e.g. family-resource-guide, mom-to-mom, calendar).',
    allowsImageMode: false },

  // ── Calendar ─────────────────────────────────────────────────────────────
  { slug: 'calendar_top_banner',         surface: 'calendar', category: 'inline',
    label: 'Calendar — Top banner (above events)',
    whereItAppears: 'On /calendar, wide banner directly under the filter bar, ABOVE the first event row. First thing readers see when they land on the calendar.',
    description: 'Top-of-page calendar banner. Sells as exclusive or rotates among up to 3 advertisers.' },

  { slug: 'calendar_bottom_banner',      surface: 'calendar', category: 'footer',
    label: 'Calendar — Bottom banner (under Load More)',
    whereItAppears: 'On /calendar, wide banner BENEATH the event grid + "Load more events" button. Catches readers who scrolled the full list.',
    description: 'Bottom-of-page calendar banner. Lower CPM than top but higher intent — sells as exclusive or rotates among up to 3.' },

  { slug: 'calendar_inline_promotion',   surface: 'calendar', category: 'inline',
    label: 'Calendar — In-grid rotating promotion',
    whereItAppears: 'On /calendar, mixed into the event grid every ~6 events. Up to 4 advertisers rotate per batch — same advertiser won\'t appear twice within a single batch of 12 events.',
    description: 'Promo woven into the calendar grid. Up to 4 in the rotation pool; the renderer enforces "no advertiser twice per batch" so impressions feel curated, not spammy.' },

  { slug: 'calendar_featured_event',     surface: 'calendar', category: 'inline',
    label: 'Calendar — Featured event (legacy)',
    whereItAppears: 'Legacy slot — used to power both top and bottom banner before they were split. The calendar page still renders these as a fallback (oldest = top, newest = bottom) until you migrate them.',
    description: 'DEPRECATED. Use calendar_top_banner or calendar_bottom_banner for new bookings.' },

  // ── Newsletter ───────────────────────────────────────────────────────────
  { slug: 'newsletter_sponsor',          surface: 'newsletter', category: 'sponsor',
    label: 'Newsletter — Sponsor block (in email)',
    whereItAppears: 'In the weekly River Region Parents email newsletter. Sponsor block beneath the top stories.',
    description: 'Sponsor block inside the weekly email newsletter.',
    allowsImageMode: false },

  // ── Site-wide ────────────────────────────────────────────────────────────
  { slug: 'site_footer_partners',        surface: 'site', category: 'footer',
    label: 'Site — Footer partner logos',
    whereItAppears: 'In the site footer on EVERY page. Row of partner logos at the bottom, beneath the navigation links.',
    description: 'Footer strip of partner logos.',
    allowsImageMode: false },
]

export const PLACEMENT_TYPE_SLUGS = PLACEMENT_TYPES.map(p => p.slug)

// ── Pages × Slots registry ─────────────────────────────────────────────────
//
// Every real page on the site that can carry ads. Pairs with PAGE_SLOTS
// below to drive the /admin/ads slot list — for each entry here, we
// expand into one row per (placement_type, context_slug) so the editor
// sees ALL inventory (booked + empty + hidden) in one paginated list.
//
// Adding a new page: add a PAGE entry + a PAGE_SLOTS entry. Adding a
// new placement_type to an existing page: just edit PAGE_SLOTS.

export interface PageDef {
  key:           string
  label:         string
  /** Optional ad_placements.context_slug for slots scoped to this page. */
  context_slug:  string | null
  /** Display grouping in the Page dropdown. */
  group:         'Homepage' | 'Verticals' | 'Guides' | 'Columns' | 'Cross-page'
}

export const PAGES: PageDef[] = [
  // Homepage
  { key: 'homepage',              label: 'Homepage',                           context_slug: null,                       group: 'Homepage' },

  // Verticals — themed top-level landing pages
  { key: 'school-zone',           label: 'School Zone',                        context_slug: 'school-zone',              group: 'Verticals' },
  { key: 'school-bits',           label: 'School Bits',                        context_slug: 'school-bits',              group: 'Verticals' },
  { key: 'mom-knows-best',        label: 'Mom Knows Best',                     context_slug: 'mom-knows-best',           group: 'Verticals' },
  { key: 'games',                 label: 'Brain Games',                        context_slug: 'games',                    group: 'Verticals' },
  { key: 'family-resource-guide', label: 'Family Resource Guide (vertical)',   context_slug: 'family-resource-guide',    group: 'Verticals' },

  // Specific guides under FRG vertical
  { key: 'private-school-guide',  label: 'Private School Guide',               context_slug: 'private-school-guide',     group: 'Guides' },
  { key: 'special-needs-guide',   label: 'Special Needs Guide',                context_slug: 'special-needs-guide',      group: 'Guides' },
  { key: 'afterschool-guide',     label: 'Afterschool Guide',                  context_slug: 'afterschool-guide',        group: 'Guides' },
  { key: 'healthy-kids-guide',    label: 'Healthy Kids Guide',                 context_slug: 'healthy-kids-guide',       group: 'Guides' },
  { key: 'summer-camp-guide',     label: 'Summer Camp Guide',                  context_slug: 'summer-camp-guide',        group: 'Guides' },
  { key: 'childcare-guide',       label: 'Childcare Guide',                    context_slug: 'childcare-guide',          group: 'Guides' },
  { key: 'birthday-party-guide',  label: 'Birthday Party Guide',               context_slug: 'birthday-party-guide',     group: 'Guides' },
  { key: 'summer-fun-guide',      label: 'Summer Fun Guide',                   context_slug: 'summer-fun-guide',         group: 'Guides' },
  { key: 'newcomer-guide',        label: 'Newcomer Guide',                     context_slug: 'newcomer-guide',           group: 'Guides' },
  { key: 'best-of-region',        label: 'Best of the Region',                 context_slug: 'best-of',                  group: 'Guides' },
  { key: 'local-guides-index',    label: 'Local Guides — index',               context_slug: null,                       group: 'Guides' },

  // Community columns (page sponsor scoped to one column)
  { key: 'mom-to-mom',            label: 'Mom to Mom (column)',                context_slug: 'mom-to-mom',               group: 'Columns' },
  { key: 'teacher-of-month',      label: 'Teacher of the Month (column)',      context_slug: 'teacher-of-month',         group: 'Columns' },
  { key: 'grands-greatest',       label: 'Grands Are the Greatest (column)',   context_slug: 'grands-greatest',          group: 'Columns' },
  { key: 'play-ball',             label: 'Play Ball (column)',                 context_slug: 'play-ball',                group: 'Columns' },

  // Cross-page surfaces
  { key: 'articles',              label: 'Articles (any column)',              context_slug: null,                       group: 'Cross-page' },
  { key: 'calendar',              label: 'Calendar',                           context_slug: null,                       group: 'Cross-page' },
  { key: 'newsletter',            label: 'Newsletter',                         context_slug: null,                       group: 'Cross-page' },
  { key: 'site',                  label: 'Site footer (every page)',           context_slug: null,                       group: 'Cross-page' },
]

// Which placement_type slugs can appear on each page. Drives the slot
// list — for each PAGE × each placement_type in PAGE_SLOTS[page], we
// generate one row in the admin /admin/ads list.
export const PAGE_SLOTS: Record<string, string[]> = {
  homepage: [
    'homepage_inline_ad', 'homepage_sidebar_ad', 'homepage_business_spotlight',
    'homepage_bottom_ad', 'homepage_hero_rotator',
  ],
  'school-zone':           ['section_sponsor'],
  'school-bits':           ['school_bits_sponsor', 'school_bits_inline', 'school_bits_transition', 'section_sponsor'],
  'mom-knows-best':        ['section_sponsor'],
  'games':                 ['section_sponsor'],
  'family-resource-guide': ['section_sponsor'],

  // Specific guides all share the same slot inventory
  'private-school-guide':  ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'special-needs-guide':   ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'afterschool-guide':     ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'healthy-kids-guide':    ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'summer-camp-guide':     ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'childcare-guide':       ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'birthday-party-guide':  ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'summer-fun-guide':      ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'newcomer-guide':        ['guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip', 'guide_directory_inline_ad', 'section_sponsor'],
  'best-of-region':        ['guide_sidebar_sticky', 'guide_inline', 'section_sponsor'],
  'local-guides-index':    ['guides_index_ad'],

  // Community columns — page sponsor only (the article-level slots are
  // covered under the Articles cross-page entry).
  'mom-to-mom':       ['section_sponsor'],
  'teacher-of-month': ['section_sponsor'],
  'grands-greatest':  ['section_sponsor'],
  'play-ball':        ['section_sponsor'],

  // Cross-page surfaces
  articles: ['article_sidebar_sticky', 'article_sidebar_sponsored', 'article_inline', 'article_header_sponsor', 'article_inline_recommendation', 'article_footer_listings'],
  calendar: ['calendar_top_banner', 'calendar_bottom_banner', 'calendar_inline_promotion', 'calendar_featured_event', 'section_sponsor'],
  newsletter: ['newsletter_sponsor'],
  site:     ['site_footer_partners'],
}

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
