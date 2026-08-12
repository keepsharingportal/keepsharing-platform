// Homepage Best-Of promotion block. Same featured + supporting shape
// as SchoolBitsBlock — one lead article + 3 supporting cards + CTA to
// the Best Of column. Pulls articles with column_slug='frg-best-of'.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Star, ArrowRight } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'
import { articleHref } from '@/lib/articles/slug'

interface Article {
  id: string; slug: string; title: string; excerpt: string | null; subtitle: string | null
  hero_image_url: string | null; published_at: string | null
}

async function getBestOfArticles(): Promise<Article[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, subtitle, hero_image_url, published_at')
      .eq('column_slug', 'frg-best-of')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(8)

    if (!data?.length) return []
    const withImg = data.filter(a => a.hero_image_url)
    const noImg   = data.filter(a => !a.hero_image_url)
    return [...withImg, ...noImg].slice(0, 4)
  } catch { return [] }
}

function teaser(a: Article): string | null {
  return (a.excerpt && a.excerpt.trim()) || (a.subtitle && a.subtitle.trim()) || null
}

// ── Featured card ─────────────────────────────────────────────────────────────

function FeaturedCard({ article }: { article: Article }) {
  const imgSrc = article.hero_image_url || getFallback('parenting', article.id)
  const blurb  = teaser(article)
  return (
    <Link
      href={articleHref(article)}
      className="group relative flex flex-col justify-end rounded-2xl overflow-hidden min-h-[320px] md:min-h-[380px] md:h-full"
    >
      <Image
        src={imgSrc}
        alt={article.title}
        fill
        style={{ objectFit: 'cover', objectPosition: 'center top' }}
        sizes="(max-width: 768px) 100vw, 58vw"
        className="group-hover:scale-105 transition-transform duration-700"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="relative p-5 md:p-6 z-10">
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-500 text-white">
            <Star className="h-3 w-3 fill-white" />
            Best Of
          </span>
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight mb-2 line-clamp-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
          {article.title}
        </h3>
        {blurb && (
          <p className="text-white/75 text-sm leading-relaxed line-clamp-2 hidden sm:block mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {blurb}
          </p>
        )}
        {/* No date. These are evergreen "best of" lists, not news — the whole
            set published with the June issue, so stamping "Jun 2026" on a
            parks or coffee-shop roundup made year-round content read as two
            months stale without making it any less useful. */}
        <div className="flex items-center gap-3 text-white/60 text-xs">
          <span className="flex items-center gap-1 text-white font-bold group-hover:gap-1.5 transition-all ml-auto">
            Read the List <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Small supporting card ─────────────────────────────────────────────────────

function SmallCard({ article }: { article: Article }) {
  const imgSrc = article.hero_image_url || getFallback('parenting', article.id)
  return (
    <Link
      href={articleHref(article)}
      className="group flex gap-4 p-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-muted/20 transition-all"
    >
      <div className="relative shrink-0 w-28 h-28 md:w-[140px] md:h-[140px] rounded-xl overflow-hidden bg-primary/5">
        <Image
          src={imgSrc}
          alt={article.title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          sizes="(max-width: 768px) 112px, 140px"
          className="group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
      </div>
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-center gap-1 mb-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500 text-white">
            <Star className="h-3 w-3 fill-white" />
            Best Of
          </span>
        </div>
        {/* Date deliberately omitted — see the note on the featured card. */}
        <h4 className="font-semibold text-sm md:text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3">
          {article.title}
        </h4>
      </div>
    </Link>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export async function BestOfBlock() {
  const articles = await getBestOfArticles()

  if (articles.length === 0) {
    return (
      <section className="border border-dashed border-amber-200 rounded-3xl p-8 md:p-10 bg-amber-50/40">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-5 w-5 text-amber-600 fill-amber-300/60" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Best of the Region</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">The Lists Moms Share</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-md leading-relaxed">
          Best parks, day trips, sweet treats, sports leagues — curated lists from local moms, coming soon.
        </p>
        <Link
          href="/columns/frg-best-of"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          See All Best Of Lists <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    )
  }

  const [featured, ...supporting] = articles

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <Star className="h-6 w-6 text-primary fill-amber-300/60" />
          Best of the Region
        </h2>
        <Link href="/columns/frg-best-of" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          See All Lists <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Featured + supporting */}
      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <FeaturedCard article={featured} />
        </div>

        <div className="md:col-span-2 flex flex-col gap-2.5">
          {supporting.slice(0, 3).map(a => (
            <SmallCard key={a.id} article={a} />
          ))}
          <Link
            href="/columns/frg-best-of"
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-primary/25 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors mt-auto"
          >
            <Star className="h-4 w-4" />
            All Best Of Lists →
          </Link>
        </div>
      </div>
    </section>
  )
}
