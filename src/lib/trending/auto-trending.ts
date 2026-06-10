// Auto-trending — derives trending bar entries from page view counts.
//
// The homepage trending bar shows pinned editor picks first, then fills
// remaining slots (cap 4 total) with the most-visited public pages from
// the last 7 days. This module owns the "given a path, what label and
// emoji should we show?" decision.
//
// Strategy:
//   - Known landing pages (Best Of, FRG, Summer Camp Guide, etc.) get a
//     curated label + emoji from the LANDING_PAGES table below.
//   - Article paths under /columns/{col}/{slug} or /articles/{slug} are
//     resolved against guide_articles in one batch lookup → article
//     title becomes the label, emoji defaults to 🔥.
//   - Anything else gets DROPPED. We don't fall back to humanizing the
//     last path segment because that produced vague entries like
//     "Articles" (from /articles index) that look like nav labels rather
//     than recommendations. To add a generic page to the bar, add it to
//     LANDING_PAGES with a deliberate label + emoji.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface AutoTrendingItem {
  id:    string   // synthetic, prefixed `auto:` so it never collides with pinned UUIDs
  label: string
  link:  string
  emoji: string | null
  /** Provenance — useful for the admin's preview / debug tooling later. */
  source:       'auto'
  unique_views: number
}

// Curated labels for evergreen landing pages. The path is the canonical
// site path (no trailing slash); add new ones here as launches happen.
const LANDING_PAGES: Record<string, { emoji: string; label: string }> = {
  '/best-of':                 { emoji: '⭐', label: 'Best of the River Region' },
  '/family-resource-guide':   { emoji: '🏠', label: 'Family Resource Guide'    },
  '/summer-camp-guide':       { emoji: '⛺', label: 'Summer Camp Guide'        },
  '/private-school-guide':    { emoji: '🎓', label: 'Private School Guide'     },
  '/childcare-guide':         { emoji: '👶', label: 'Childcare Guide'           },
  '/afterschool-guide':       { emoji: '🏃', label: 'After-School Programs'     },
  '/healthy-kids-guide':      { emoji: '💪', label: 'Healthy Kids Guide'        },
  '/birthday-party-guide':    { emoji: '🎂', label: 'Birthday Party Guide'      },
  '/special-needs-guide':     { emoji: '⭐', label: 'Special Needs Guide'       },
  '/summer-fun-guide':        { emoji: '☀️', label: 'Summer Fun Guide'          },
  '/calendar':                { emoji: '📅', label: 'Community Calendar'        },
  '/mom-knows-best':          { emoji: '💬', label: 'Mom Knows Best'            },
  '/school-zone':             { emoji: '🎒', label: 'School Zone'               },
  '/nominate':                { emoji: '🏆', label: 'Nominate Someone'          },
}

interface RawTrendingPath {
  path:         string
  unique_views: number
}

interface MinimalArticleRow {
  slug:  string
  title: string
}

/**
 * Resolve raw path counts into trending bar items.
 *
 * - `excludeLinks`: paths/links already covered by pinned items. Pinned
 *   items always win — we never duplicate.
 * - `limit`: max items to return.
 */
export async function buildAutoTrendingItems(
  supabase: SupabaseClient,
  raw: RawTrendingPath[],
  excludeLinks: Set<string>,
  limit: number,
): Promise<AutoTrendingItem[]> {
  // Filter out already-pinned paths and obvious non-content (homepage,
  // submit forms, thank-you pages). We don't want "/" itself in the bar.
  //
  // Index pages (e.g. /articles, /columns) are also blocked — they're
  // navigational landing surfaces, not promotable content. The trending
  // bar should highlight specific things readers want, not labels they
  // already see in the main nav.
  //
  // Advertiser/business listing pages are forbidden from the trending bar
  // for two reasons:
  //   1. They can 404 mid-cycle when an advertiser is removed or their
  //      slug changes — stale links erode trust.
  //   2. They give one advertiser undeserved promo airtime over others
  //      who paid for placement.
  //
  // Listings show up under multiple URL shapes:
  //   /{guide-slug}/listings/{slug}   — the canonical Next.js route
  //   /guide/{guide-slug}/{slug}      — legacy / alternate shape
  // Both get blocked by path filter below. As a defense-in-depth catch
  // for any future URL shape we haven't anticipated, we ALSO look up
  // every active advertiser slug and reject any path whose terminal
  // segment matches one of them.
  const NON_CONTENT_EXACT = new Set([
    '/',
    '/thank-you',
    // Generic index pages — too vague to promote.
    '/articles',
    '/columns',
    '/events',
    '/spotlights',
    '/best-of-results',
  ])
  const NON_CONTENT_PREFIX = ['/submit', '/auth', '/login', '/maintenance', '/guide/']
  let candidates = raw
    .filter(r => !excludeLinks.has(r.path))
    .filter(r => !NON_CONTENT_EXACT.has(r.path))
    .filter(r => !NON_CONTENT_PREFIX.some(p => r.path.startsWith(p)))
    .filter(r => !r.path.includes('/listings/'))

  // Advertiser-slug defense: pull all active advertiser slugs once and
  // reject any candidate whose last path segment matches. The lookup is
  // cheap (one batch query, tens to hundreds of rows) and runs only
  // when there are candidates left to filter.
  if (candidates.length > 0) {
    try {
      const { data: advRows } = await supabase
        .from('advertiser_accounts')
        .select('slug')
        .not('slug', 'is', null)
      const advSlugs = new Set<string>()
      for (const row of (advRows ?? []) as Array<{ slug: string | null }>) {
        if (row.slug) advSlugs.add(row.slug.toLowerCase())
      }
      candidates = candidates.filter(r => {
        const lastSeg = r.path.replace(/\/$/, '').split('/').pop() ?? ''
        return !advSlugs.has(lastSeg.toLowerCase())
      })
    } catch {
      // If the slug lookup fails (e.g., RLS, table missing), fall through
      // with the path-only filter rather than blanking the trending bar.
    }
  }

  if (candidates.length === 0) return []

  // Article-shaped paths whose label needs a title lookup.
  //   /columns/{column}/{slug}
  //   /articles/{slug}
  const articleSlugByPath = new Map<string, string>()
  for (const c of candidates) {
    const m1 = c.path.match(/^\/columns\/[^/]+\/([^/]+)\/?$/)
    const m2 = c.path.match(/^\/articles\/([^/]+)\/?$/)
    const slug = m1?.[1] ?? m2?.[1]
    if (slug) articleSlugByPath.set(c.path, slug)
  }

  // Single batch lookup → title map. If the table is missing or the
  // query fails (RLS, schema drift), we degrade gracefully: just no
  // titles, and the path falls back to its humanized last segment.
  const articleTitleBySlug = new Map<string, string>()
  if (articleSlugByPath.size > 0) {
    const { data } = await supabase
      .from('guide_articles')
      .select('slug, title')
      .in('slug', Array.from(articleSlugByPath.values()))
      .eq('published', true)
    for (const row of (data ?? []) as MinimalArticleRow[]) {
      articleTitleBySlug.set(row.slug, row.title)
    }
  }

  // Strict labeling — we only promote things we can label *well*. The
  // previous humanize-the-last-segment fallback produced vague entries
  // like "Articles" (from /articles) that looked like noise rather than
  // recommendations. Now: if a path doesn't match a curated landing OR a
  // published article slug, it's dropped. To get a generic page into the
  // trending bar, add it to LANDING_PAGES above with a deliberate label
  // + emoji.
  const out: AutoTrendingItem[] = []
  for (const c of candidates) {
    if (out.length >= limit) break

    const landing = LANDING_PAGES[c.path]
    let label: string
    let emoji: string | null = '🔥'

    if (landing) {
      label = landing.label
      emoji = landing.emoji
    } else if (articleSlugByPath.has(c.path)) {
      const slug  = articleSlugByPath.get(c.path)!
      const title = articleTitleBySlug.get(slug)
      if (!title) continue   // article was unpublished/trashed since the view — skip
      label = title
    } else {
      // Not a curated landing and not a resolvable article — skip rather
      // than promote a vague humanized slug.
      continue
    }

    out.push({
      id:           `auto:${c.path}`,
      label,
      link:         c.path,
      emoji,
      source:       'auto',
      unique_views: c.unique_views,
    })
  }

  return out
}
