// Homepage School Zone promotion block.
// Shows: featured School Bits article + 3 supporting cards + CTA to School Zone hub.
// Server component. Surfaces image-bearing articles first.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { GraduationCap, ArrowRight, Trophy, Star } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'

// ── Types ─────────────────────────────────────────────────────────────────────

type Article = {
  id: string; slug: string; title: string; excerpt: string | null
  hero_image_url: string | null; published_at: string | null
  column_slug: string | null; editorial_notes: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSchoolArticles(): Promise<Article[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at, column_slug, editorial_notes')
      .in('column_slug', ['school-bits', 'teacher-of-month', 'student-spotlights'])
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(16)

    if (!data?.length) return []
    // Surface image-bearing articles first
    const withImg = data.filter(a => a.hero_image_url)
    const noImg   = data.filter(a => !a.hero_image_url)
    return [...withImg, ...noImg].slice(0, 5)
  } catch { return [] }
}

function articleHref(slug: string, columnSlug: string | null): string {
  if (columnSlug && columnSlug !== 'school-bits') {
    return `/columns/${columnSlug}/${slug.replace(new RegExp(`^${columnSlug}-`), '')}`
  }
  return `/articles/${slug}`
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function columnChip(col: string | null): { label: string; cls: string } | null {
  if (col === 'teacher-of-month')   return { label: 'Teacher of the Month', cls: 'bg-amber-500 text-white' }
  if (col === 'student-spotlights') return { label: 'Student Spotlight',    cls: 'bg-blue-600 text-white'  }
  return null
}

// ── Featured card ─────────────────────────────────────────────────────────────

function FeaturedCard({ article }: { article: Article }) {
  const imgSrc = article.hero_image_url || getFallback('school_zone', article.id)
  const chip   = columnChip(article.column_slug)

  return (
    <Link
      href={articleHref(article.slug, article.column_slug)}
      className="group relative flex flex-col justify-end rounded-2xl overflow-hidden min-h-[320px] md:min-h-[380px]"
    >
      <Image src={imgSrc} alt={article.title} fill style={{ objectFit: 'cover', objectPosition: 'center top' }}
        sizes="(max-width: 768px) 100vw, 58vw"
        className="group-hover:scale-105 transition-transform duration-700" unoptimized />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="relative p-5 md:p-6 z-10">
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          {chip ? (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${chip.cls}`}>
              {chip.label}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
              School Bits
            </span>
          )}
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight mb-2 line-clamp-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-white/75 text-sm leading-relaxed line-clamp-2 hidden sm:block mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-white/60 text-xs">
          <span>{fmtDate(article.published_at)}</span>
          <span className="flex items-center gap-1 text-white font-bold group-hover:gap-1.5 transition-all ml-auto">
            Read Story <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Small supporting card ─────────────────────────────────────────────────────

function SmallCard({ article }: { article: Article }) {
  const imgSrc = article.hero_image_url || getFallback('school_zone', article.id)
  const chip   = columnChip(article.column_slug)

  const chipIcon = article.column_slug === 'teacher-of-month'
    ? <Trophy className="h-3 w-3" />
    : article.column_slug === 'student-spotlights'
      ? <Star className="h-3 w-3" />
      : <GraduationCap className="h-3 w-3" />

  return (
    <Link
      href={articleHref(article.slug, article.column_slug)}
      className="group flex gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-muted/20 transition-all"
    >
      <div className="relative shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-primary/5">
        <Image src={imgSrc} alt={article.title} fill style={{ objectFit: 'cover', objectPosition: 'center top' }}
          sizes="72px" className="group-hover:scale-105 transition-transform duration-500" unoptimized />
      </div>
      <div className="flex flex-col justify-center min-w-0 flex-1">
        {chip && (
          <div className="flex items-center gap-1 mb-1">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${chip.cls}`}>
              {chipIcon} {chip.label}
            </span>
          </div>
        )}
        <h4 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h4>
        <span className="text-[11px] text-muted-foreground mt-1">{fmtDate(article.published_at)}</span>
      </div>
    </Link>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export async function SchoolBitsBlock() {
  const articles = await getSchoolArticles()

  if (articles.length === 0) {
    return (
      <section className="border border-dashed border-primary/20 rounded-3xl p-8 md:p-10 bg-primary/4">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">School Zone</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">River Region School News</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-md leading-relaxed">
          Student spotlights, teacher recognitions, and school news from across the River Region — published monthly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/school-zone" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors">
            Explore School Zone <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/nominate" className="inline-flex items-center gap-1.5 px-4 py-2 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors">
            Nominate a Teacher
          </Link>
        </div>
      </section>
    )
  }

  const [featured, ...supporting] = articles

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <GraduationCap className="h-6 w-6 text-primary" />
          School Zone
        </h2>
        <Link href="/school-zone" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          Explore School Zone <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Featured + supporting */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Featured — 3/5 cols */}
        <div className="md:col-span-3">
          <FeaturedCard article={featured} />
        </div>

        {/* Supporting — 2/5 cols */}
        <div className="md:col-span-2 flex flex-col gap-2.5">
          {supporting.slice(0, 3).map(a => (
            <SmallCard key={a.id} article={a} />
          ))}
          <Link
            href="/school-zone"
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-primary/25 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors mt-auto"
          >
            <GraduationCap className="h-4 w-4" />
            All School Zone Stories →
          </Link>
        </div>
      </div>
    </section>
  )
}
