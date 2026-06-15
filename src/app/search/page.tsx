// ── /search — sitewide search ─────────────────────────────────────────────
//
// Fulfills the WebSite SearchAction promise we register in root JSON-LD
// — Google can offer a sitelinks search box that calls /search?q=… and
// gets real results back. Also gives readers a real way to find what
// they're looking for instead of relying on Google to do it for them.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Search as SearchIcon, ArrowRight } from 'lucide-react'
import { articleHref } from '@/lib/articles/slug'
import { getFallbackByContext } from '@/lib/image-fallbacks'

export const revalidate = 60

interface SearchParams { q?: string }
interface Props { searchParams: Promise<SearchParams> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  const title = q ? `Search results for "${q}"` : 'Search'
  return buildPageMetadata({
    title,
    description: q
      ? `Stories, guides, events, and resources matching "${q}" from River Region Parents.`
      : 'Search River Region Parents for local family stories, events, guides, and resources.',
    path:        `/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    type:        'website',
    // Results pages should not be indexed — only the search hub itself.
    noIndex:     !!q,
  })
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface ArticleHit {
  id:             string
  title:          string
  slug:           string
  column_slug:    string | null
  excerpt:        string | null
  dek:            string | null
  hero_image_url: string | null
  author_name:    string | null
  published_at:   string | null
}

async function searchArticles(q: string): Promise<ArticleHit[]> {
  const sb = supabase()
  // Simple ilike across title + excerpt + dek + body. Full-text search
  // could use plainto_tsquery against a stored tsvector column when we
  // add one — this is the no-migration variant that already works.
  const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
  const { data } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, excerpt, dek, hero_image_url, author_name, published_at')
    .eq('status', 'published')
    .or(`title.ilike.${like},excerpt.ilike.${like},dek.ilike.${like}`)
    .order('published_at', { ascending: false })
    .limit(40)
  return (data ?? []) as ArticleHit[]
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const hits  = query ? await searchArticles(query) : []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-10 md:py-14 max-w-4xl">

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Search</p>
        <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-2">
          {query ? `Results for "${query}"` : 'Search River Region Parents'}
        </h1>
        <p className="text-base text-muted-foreground mb-6">
          {query
            ? `${hits.length} ${hits.length === 1 ? 'match' : 'matches'} from our archive of local stories and guides.`
            : 'Find articles, events, guides, and resources — type a topic, school, neighborhood, or person\'s name.'}
        </p>

        {/* Search form — submits as GET so the URL holds the query +
            we can render server-side results. */}
        <form action="/search" method="GET" role="search" className="mb-10">
          <label htmlFor="q" className="sr-only">Search</label>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Topic, school, neighborhood, name…"
              className="w-full pl-11 pr-32 py-3.5 text-base border border-border rounded-2xl bg-card outline-none focus:border-primary"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Search <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {query && hits.length === 0 && (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
            <p className="text-base font-bold text-foreground mb-2">No matches.</p>
            <p className="text-sm text-muted-foreground">
              Try a different word, a school name, or a person&apos;s name. The archive grows weekly.
            </p>
          </div>
        )}

        {hits.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hits.map(h => {
              const href    = articleHref({ slug: h.slug, title: h.title, column_slug: h.column_slug })
              const heroFb  = h.hero_image_url ?? (h.column_slug ? getFallbackByContext(h.column_slug, h.id) : null)
              const excerpt = h.excerpt ?? h.dek ?? ''
              return (
                <Link
                  key={h.id}
                  href={href}
                  className="group flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
                >
                  {heroFb && (
                    <div className="relative w-full aspect-[16/10] bg-muted/40">
                      <Image src={heroFb} alt={h.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-[1.02] transition-transform" />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-base font-bold text-foreground leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">{h.title}</h3>
                    {excerpt && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{excerpt}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </main>
      <PublicFooter />
    </div>
  )
}
