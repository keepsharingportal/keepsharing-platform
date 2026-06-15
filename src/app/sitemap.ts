// ── sitemap.xml — Next.js conventional metadata route ──────────────────────
//
// Generates a fresh sitemap on every request (cached by the proxy +
// crawler), listing:
//   1. Static high-value hubs (home, calendar, games, FRG, school zone,
//      mom-knows-best, articles, partners)
//   2. Every published guide_articles row (the article corpus — the
//      bulk of crawlable URLs)
//   3. Every published calendar_events row (for event-rich results)
//   4. Per-game URLs
//
// Cap is set generously high (5,000 URLs); we'll split into multiple
// sitemap files via getSitemaps() when the article+event count crosses
// the sitemap 50k limit.

import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'
import { GAMES } from '@/lib/games/types'
import { authorNameToSlug } from '@/lib/seo/author-slug'

export const revalidate = 3600  // refresh sitemap hourly

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ctx       = await loadBrandContext()
  const origin    = ctx.publicOrigin.replace(/\/$/, '')
  const supabase  = getSupabase()
  const now       = new Date()

  // ── Static hubs ─────────────────────────────────────────────────────
  const hubs: MetadataRoute.Sitemap = [
    { url: `${origin}/`,                       lastModified: now, changeFrequency: 'daily',   priority: 1.0  },
    { url: `${origin}/calendar`,               lastModified: now, changeFrequency: 'daily',   priority: 0.9  },
    { url: `${origin}/calendar/submit`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${origin}/games`,                  lastModified: now, changeFrequency: 'daily',   priority: 0.8  },
    { url: `${origin}/family-resource-guide`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
    { url: `${origin}/school-zone`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
    { url: `${origin}/school-zone/school-bits`,lastModified: now, changeFrequency: 'daily',   priority: 0.8  },
    { url: `${origin}/school-bits/submit`,     lastModified: now, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${origin}/mom-knows-best`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
    { url: `${origin}/articles`,               lastModified: now, changeFrequency: 'daily',   priority: 0.7  },
    { url: `${origin}/local-guides`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/summer-camp-guide`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/summer-fun-guide`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/healthy-kids-guide`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/private-school-guide`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/newcomer-guide`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/special-needs-guide`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${origin}/partners`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.6  },
    { url: `${origin}/submit`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.5  },
    // E-E-A-T pages — referenced from NewsMediaOrganization JSON-LD,
    // need to be in the sitemap so they get indexed.
    { url: `${origin}/about`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${origin}/about/editorial-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${origin}/about/corrections`,      lastModified: now, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${origin}/privacy`,                lastModified: now, changeFrequency: 'yearly',  priority: 0.2  },
    { url: `${origin}/terms`,                  lastModified: now, changeFrequency: 'yearly',  priority: 0.2  },
  ]

  // Per-game URLs
  const games: MetadataRoute.Sitemap = GAMES.map(g => ({
    url:            `${origin}/games/${g.id}`,
    lastModified:   now,
    changeFrequency: 'daily',
    priority:       0.7,
  }))

  // ── Published articles ──────────────────────────────────────────────
  // Pulls `guide_articles` because that's the canonical published-article
  // table the site reads from. Cap at 2,000 for now; bump or split when
  // the corpus grows past it.
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('column_slug, slug, updated_at, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(2000)

  const articleEntries: MetadataRoute.Sitemap = (articles ?? [])
    .filter(a => a.column_slug && a.slug)
    .map(a => ({
      url:            `${origin}/columns/${a.column_slug}/${a.slug}`,
      lastModified:   a.updated_at ?? a.published_at ?? now,
      changeFrequency: 'weekly',
      priority:       0.8,
    }))

  // ── Published events ────────────────────────────────────────────────
  // Future-dated only — past events are still crawlable on direct URL
  // but don't need to clog the sitemap. Cap at 1,000.
  const todayIso = now.toISOString().slice(0, 10)
  const { data: events } = await supabase
    .from('calendar_events')
    .select('slug, updated_at, start_date')
    .eq('status', 'published')
    .gte('start_date', todayIso)
    .order('start_date', { ascending: true })
    .limit(1000)

  const eventEntries: MetadataRoute.Sitemap = (events ?? [])
    .filter(e => e.slug)
    .map(e => ({
      url:            `${origin}/calendar/events/${e.slug}`,
      lastModified:   e.updated_at ?? now,
      changeFrequency: 'weekly',
      priority:       0.7,
    }))

  // ── Town pages — Place-schema-rich local landing pages ─────────────
  const { data: towns } = await supabase
    .from('town_profiles')
    .select('slug, updated_at')
    .eq('is_active', true)
  const townEntries: MetadataRoute.Sitemap = (towns ?? [])
    .filter(t => t.slug)
    .map(t => ({
      url:            `${origin}/family-resource-guide/town/${t.slug}`,
      lastModified:   t.updated_at ?? now,
      changeFrequency: 'monthly',
      priority:       0.7,
    }))

  // ── Author pages — Person-schema-rich attribution pages ────────────
  // Derived from distinct author_name values on published articles.
  // Slug = authorNameToSlug(name). Dedupe in case two name variants
  // resolve to the same slug.
  const { data: authorRows } = await supabase
    .from('guide_articles')
    .select('author_name, updated_at')
    .eq('status', 'published')
    .not('author_name', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5000)
  const seenAuthorSlugs = new Set<string>()
  const authorEntries: MetadataRoute.Sitemap = []
  for (const r of authorRows ?? []) {
    const slug = authorNameToSlug(r.author_name as string | null)
    if (!slug || seenAuthorSlugs.has(slug)) continue
    seenAuthorSlugs.add(slug)
    authorEntries.push({
      url:             `${origin}/authors/${slug}`,
      lastModified:    (r.updated_at as string | null) ?? now,
      changeFrequency: 'weekly',
      priority:        0.5,
    })
  }

  return [
    ...hubs,
    ...games,
    ...articleEntries,
    ...eventEntries,
    ...townEntries,
    ...authorEntries,
  ]
}
