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
//   - Anything else gets a humanized version of its last path segment
//     ("read-this-now" → "Read This Now") with a 🔥 emoji.

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

function humanize(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
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
  // Also exclude advertiser/business listing pages — those live under
  // /{guide-name}/listings/{slug} and can 404 mid-cycle when an
  // advertiser is removed or their slug changes, leaving stale links
  // in the bar.
  const NON_CONTENT_EXACT = new Set(['/', '/thank-you'])
  const NON_CONTENT_PREFIX = ['/submit', '/auth', '/login', '/maintenance']
  const candidates = raw
    .filter(r => !excludeLinks.has(r.path))
    .filter(r => !NON_CONTENT_EXACT.has(r.path))
    .filter(r => !NON_CONTENT_PREFIX.some(p => r.path.startsWith(p)))
    .filter(r => !r.path.includes('/listings/'))

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
      // Fallback — humanize the last path segment.
      const lastSeg = c.path.replace(/\/$/, '').split('/').pop() ?? ''
      if (!lastSeg) continue
      label = humanize(lastSeg)
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
