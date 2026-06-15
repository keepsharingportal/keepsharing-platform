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
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'
import { GAMES } from '@/lib/games/types'
import { authorNameToSlug } from '@/lib/seo/author-slug'

// ── Static-route discovery ───────────────────────────────────────────────────
// Walks src/app at build time and emits one URL per static page.tsx /
// page.ts / page.mdx file. Means: any new top-level hub page added to
// the codebase automatically lands in the sitemap without anyone having
// to remember to update this file.
//
// Skipped:
//   - dynamic segments like [slug] (those are handled by per-content
//     DB queries below)
//   - parallel routes (@modal, etc.)
//   - route groups ((marketing), etc.) — they don't change the URL
//   - api routes
//   - admin / auth / private surfaces (matched against PRIVATE_PREFIXES
//     so they never accidentally end up in the public sitemap even if
//     someone forgets robots.txt)

const PUBLIC_HUB_PRIORITY = 0.6
const PRIVATE_PREFIXES = [
  '/admin', '/api', '/auth', '/login', '/onboard', '/proposal', '/renew',
  '/update', '/r', '/distribution', '/advertiser-portal', '/partners/',
  '/columns/',  // handled by per-DB-row article entries below
  '/calendar/events/',
  '/family-resource-guide/listings/',
  '/family-resource-guide/town/',
  '/authors/',
  '/healthy-kids-guide/listings/',
  '/summer-camp-guide/listings/',
  '/summer-fun-guide/',
  '/private-school-guide/listings/',
  '/special-needs-guide/listings/',
  '/newcomer-guide/articles/',
  '/newcomer-guide/listings/',
  '/local-guides/',
  '/columns/',
  '/games/',
  '/articles/',
  '/share/',
  '/go/',
  '/interview/',
  '/contribute/',
  '/nominate/',
]
const SKIP_DIR_PREFIX = ['_', '(', '@']

function discoverStaticRoutes(): string[] {
  // process.cwd() is the project root at build time on Vercel +
  // locally. The repo layout puts pages under src/app.
  const root = path.join(process.cwd(), 'src', 'app')
  if (!fs.existsSync(root)) return []
  const out: string[] = []

  function visit(dir: string, route: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    let hasPage = false
    for (const e of entries) {
      if (!e.isFile()) continue
      if (e.name === 'page.tsx' || e.name === 'page.ts' || e.name === 'page.mdx') {
        hasPage = true; break
      }
    }
    if (hasPage) {
      const r = route || '/'
      // Filter against private prefixes — covers nested admin/api etc.
      const isPrivate = PRIVATE_PREFIXES.some(p => r === p || r.startsWith(p) || r === p.replace(/\/$/, ''))
      if (!isPrivate) out.push(r)
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const name = e.name
      // Skip private-folder conventions, dynamic segments (those are
      // handled by per-content DB queries below — putting [slug] in
      // the sitemap literally would emit "/columns/[column]" which is
      // useless to crawlers).
      if (SKIP_DIR_PREFIX.some(p => name.startsWith(p))) continue
      if (name.startsWith('[')) continue
      visit(path.join(dir, name), `${route}/${name}`)
    }
  }
  visit(root, '')
  return Array.from(new Set(out)).sort()
}

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

  // ── Auto-discovered hubs ──────────────────────────────────────────
  // Anything NEW added to src/app as page.tsx (a wellness guide, a
  // fall events vertical, etc.) lands here automatically without a
  // sitemap.ts edit. URLs already in `hubs` (with hand-tuned priority +
  // changefreq) take precedence; the discovery pass fills in gaps.
  const knownUrls = new Set(hubs.map(h => h.url))
  const autoHubs: MetadataRoute.Sitemap = discoverStaticRoutes()
    .map(r => `${origin}${r === '/' ? '' : r}`)
    .filter(u => !knownUrls.has(u))
    .map(u => ({
      url:            u,
      lastModified:   now,
      changeFrequency: 'weekly' as const,
      priority:       PUBLIC_HUB_PRIORITY,
    }))

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
    .eq('published', true)
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
    .eq('published', true)
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
    .eq('published', true)
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
    ...autoHubs,        // anything new added under src/app, auto-discovered
    ...games,
    ...articleEntries,
    ...eventEntries,
    ...townEntries,
    ...authorEntries,
  ]
}
