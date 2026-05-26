import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 600

const COLUMN_ACCENT: Record<string, { badge: string; border: string; header: string }> = {
  'mom-to-mom':          { badge: 'bg-rose-500 text-white',    border: 'border-rose-200',    header: 'from-rose-50 to-background' },
  'teacher-of-month':    { badge: 'bg-amber-500 text-white',   border: 'border-amber-200',   header: 'from-amber-50 to-background' },
  'grands-greatest':     { badge: 'bg-purple-500 text-white',  border: 'border-purple-200',  header: 'from-purple-50 to-background' },
  'dave-says':           { badge: 'bg-slate-600 text-white',   border: 'border-slate-200',   header: 'from-slate-50 to-background' },
  'meeting-kids':        { badge: 'bg-teal-600 text-white',    border: 'border-teal-200',    header: 'from-teal-50 to-background' },
  'teens-tweens-screens':{ badge: 'bg-indigo-600 text-white',  border: 'border-indigo-200',  header: 'from-indigo-50 to-background' },
  'school-bits':         { badge: 'bg-blue-600 text-white',    border: 'border-blue-200',    header: 'from-blue-50 to-background' },
  'education-matters':   { badge: 'bg-green-600 text-white',   border: 'border-green-200',   header: 'from-green-50 to-background' },
  'summer-fun':          { badge: 'bg-amber-400 text-amber-950', border: 'border-amber-200', header: 'from-amber-50 to-background' },
}

const DEFAULT_ACCENT = { badge: 'bg-primary text-primary-foreground', border: 'border-border', header: 'from-primary/5 to-background' }

const COLUMN_CTA: Record<string, { label: string; href: string }> = {
  'teacher-of-month': { label: 'Nominate a Teacher', href: '/nominate/teacher' },
  'mom-to-mom':       { label: 'Get Involved',        href: '/advertise' },
}
const DEFAULT_CTA = { label: 'Submit School News', href: '/calendar/submit' }

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageParams {
  params: Promise<{ column: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { column } = await params
  const supabase = getSupabase()
  const { data } = await supabase.from('monthly_columns').select('display_name, description').eq('slug', column).maybeSingle()
  if (!data) return { title: 'Column — River Region Parents' }
  return {
    title:       `${data.display_name} — River Region Parents`,
    description: data.description ?? undefined,
  }
}

export default async function ColumnLandingPage({ params }: PageParams) {
  const { column } = await params
  const supabase = getSupabase()

  const [columnRes, articlesRes] = await Promise.all([
    supabase.from('monthly_columns').select('*').eq('slug', column).maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, excerpt, hero_image_url, author_name, published_at')
      .eq('column_slug', column)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false }),
  ])

  const articles   = articlesRes.data ?? []

  // Tolerate missing monthly_columns metadata — some editorial buckets
  // (frg-best-of, frg-newcomer, etc.) don't have monthly_columns rows
  // because they aren't recurring contributor columns. Fall back to a
  // synthesized identity from the slug so the page renders instead of
  // 404ing. If there are also no articles, then 404 (truly nothing here).
  if (!columnRes.data && articles.length === 0) notFound()

  // Pretty default name from slug — "frg-best-of" → "Best of the Region"
  // for the well-known FRG buckets; everything else gets a Title Cased
  // version of the slug.
  const SLUG_DISPLAY: Record<string, string> = {
    'frg-best-of':   'Best of the Region',
    'frg-newcomer':  'Newcomer Stories',
    'feature':       'Featured Articles',
  }
  const slugDisplay = SLUG_DISPLAY[column]
    ?? column.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const columnData = columnRes.data ?? {
    slug:         column,
    display_name: slugDisplay,
    description:  null,
    short_description: null,
    hero_image_url:    null,
  }
  const accent     = COLUMN_ACCENT[column] ?? DEFAULT_ACCENT
  const cta        = COLUMN_CTA[column] ?? DEFAULT_CTA

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Column identity header */}
      <div className={`border-b bg-gradient-to-b ${accent.header} ${accent.border}`}>
        <div className="container py-8 md:py-12">
          <div className="flex items-start gap-3 mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${accent.badge}`}>
              Column
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-3">
            {columnData.display_name}
          </h1>
          {columnData.description && (
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-4">
              {columnData.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {columnData.default_author && (
              <span>
                By <span className="font-semibold text-foreground">{columnData.default_author}</span>
              </span>
            )}
            {articles.length > 0 && (
              <span className="text-muted-foreground/60">·</span>
            )}
            {articles.length > 0 && (
              <span>{articles.length} {articles.length === 1 ? 'article' : 'articles'} published</span>
            )}
          </div>
        </div>
      </div>

      <main className="container py-8 md:py-12">
        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {articles.map((a) => {
              const articleUrl = `/columns/${column}/${a.slug.replace(new RegExp(`^${column}-`), '')}`
              const heroUrl    = a.hero_image_url || getFallbackByContext(column, a.id)
              const dateLabel  = a.published_at
                ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : ''

              return (
                <Link key={a.id} href={articleUrl} className="group flex flex-col gap-3">
                  <div className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-muted">
                    <Image
                      src={heroUrl}
                      alt={a.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                    {/* Column badge on image */}
                    <div className="absolute top-3 left-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm ${accent.badge}`}>
                        {columnData.display_name}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-bold text-base leading-snug group-hover:text-primary transition-colors text-foreground line-clamp-2">
                      {a.title}
                    </h2>
                    {a.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{a.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                      {a.author_name && <span className="font-medium text-foreground/70">{a.author_name}</span>}
                      {a.author_name && dateLabel && <span>·</span>}
                      {dateLabel && <span>{dateLabel}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className={`rounded-2xl border-2 border-dashed p-12 text-center ${accent.border}`}>
            <div className="max-w-md mx-auto">
              <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 ${accent.badge}`}>
                {columnData.display_name}
              </span>
              <p className="text-lg font-bold text-foreground mb-2">
                New {columnData.display_name} articles coming soon
              </p>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {columnData.description ?? `Fresh ${columnData.display_name.toLowerCase()} content is on its way. Check back soon for new stories from the River Region.`}
              </p>
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Back to articles */}
        <div className="mt-10 pt-8 border-t border-border/40">
          <Link href="/articles" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            ← Browse All Articles
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
