// Async server component that pulls the most recent published articles
// in a vertical and renders them as cards. Used on individual article
// pages ("more like this from School Zone") and as a tail-block on
// vertical landing pages.
//
// Self-contained — pass it a verticalSlug + optional exclusion id and
// it renders nothing if the vertical has no other published articles.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { ArrowRight } from 'lucide-react'
import { articleHref } from '@/lib/articles/slug'
import { getFallback } from '@/lib/image-fallbacks'

interface Props {
  verticalSlug:       string
  /** Article id to exclude (so it doesn't appear in its own related block) */
  excludeId?:         string
  /** Override the header text. Defaults to "More from <verticalDisplayName>". */
  title?:             string
  /** Number of articles to show. Defaults to 3. */
  limit?:             number
  /** Optional CSS class on the outer wrapper. */
  className?:         string
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function RelatedFromVertical({
  verticalSlug,
  excludeId,
  title,
  limit = 3,
  className = '',
}: Props) {
  const supabase = getSupabase()

  const [{ data: vertical }, { data: articles }] = await Promise.all([
    supabase.from('verticals')
      .select('slug, display_name')
      .eq('slug', verticalSlug)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at, author_name')
      .eq('vertical_slug', verticalSlug)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit + (excludeId ? 1 : 0)),
  ])

  if (!articles || articles.length === 0) return null

  const filtered = excludeId ? articles.filter(a => a.id !== excludeId).slice(0, limit) : articles.slice(0, limit)
  if (filtered.length === 0) return null

  const verticalLabel = vertical?.display_name ?? verticalSlug
  const heading       = title ?? `More from ${verticalLabel}`
  const verticalHref  = `/${verticalSlug}`

  return (
    <section className={`rounded-2xl border border-border/40 bg-card p-5 md:p-7 ${className}`}>
      <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">From the vertical</p>
          <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight">{heading}</h2>
        </div>
        <Link
          href={verticalHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          All {verticalLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(a => {
          const img = a.hero_image_url || getFallback('school_zone', a.id)
          return (
            <Link
              key={a.id}
              href={articleHref(a)}
              className="group flex flex-col bg-background rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-primary/5 shrink-0">
                <Image
                  src={img}
                  alt={a.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
              <div className="flex flex-col flex-1 p-3">
                <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{a.excerpt}</p>
                )}
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {a.author_name || fmtDate(a.published_at)}
                  </span>
                  <span className="text-[11px] font-bold text-primary inline-flex items-center gap-0.5 shrink-0">
                    Read <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
