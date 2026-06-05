import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { SCHOOL_ZONE_COLUMN_SLUGS, columnLabel } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import { ArrowRight, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'Articles — River Region Parents',
  description: 'Local family stories, monthly columns, and parenting resources from River Region Parents.',
}

// ── Section filters ────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'all',         label: 'All Articles'     },
  { key: 'school-zone', label: 'School Zone'      },
  { key: 'school-bits', label: 'School Bits'      },
  { key: 'summer-fun',  label: 'Summer Fun'       },
  { key: 'mom-to-mom',  label: 'Mom to Mom'       },
  { key: 'education',   label: 'Education'        },
] as const

type SectionKey = typeof SECTIONS[number]['key']

// ── Issue months ───────────────────────────────────────────────────────

const ISSUE_MONTHS = [
  { key: 'all',     label: 'All Issues'  },
  { key: '2026-06', label: 'June 2026'   },
  { key: '2026-05', label: 'May 2026'    },
  { key: '2026-04', label: 'April 2026'  },
  { key: '2026-03', label: 'March 2026'  },
] as const

type MonthKey = typeof ISSUE_MONTHS[number]['key']

// ── Helpers ────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function monthRange(key: string): { start: string; end: string } | null {
  if (key === 'all') return null
  const [y, m] = key.split('-').map(Number)
  const start = new Date(y, m - 1, 1).toISOString()
  const end   = new Date(y, m,     1).toISOString()
  return { start, end }
}

async function fetchArticles(section: SectionKey, month: MonthKey) {
  const supabase = getSupabase()
  let query = supabase
    .from('guide_articles')
    .select('id, title, slug, excerpt, hero_image_url, author_name, published_at, column_slug, guide_slug')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(36)

  switch (section) {
    case 'school-zone':
      query = query.in('column_slug', SCHOOL_ZONE_COLUMN_SLUGS)
      break
    case 'school-bits':
      query = query.eq('column_slug', 'school-bits')
      break
    case 'summer-fun':
      query = query.or(`column_slug.eq.summer-fun,guide_slug.eq.summer-fun-guide`)
      break
    case 'mom-to-mom':
      query = query.eq('column_slug', 'mom-to-mom')
      break
    case 'education':
      query = query.in('column_slug', ['education-matters', 'teacher-of-month', 'superintendent-updates'])
      break
  }

  const range = monthRange(month)
  if (range) {
    query = query.gte('published_at', range.start).lt('published_at', range.end)
  }

  const { data } = await query
  return data ?? []
}

// ── Article card ───────────────────────────────────────────────────────

// Article URL builder lives in @/lib/articles/slug — imported above.

function categoryDisplay(a: { column_slug: string | null; guide_slug: string | null }): string {
  if (a.column_slug) return columnLabel(a.column_slug)
  if (a.guide_slug)  return a.guide_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return 'Feature'
}

// ── Search params ──────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ section?: string; month?: string }>
}

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const { section: sParam, month: mParam } = await searchParams
  const activeSection = (SECTIONS.some(s => s.key === sParam) ? sParam : 'all') as SectionKey
  const activeMonth   = (ISSUE_MONTHS.some(m => m.key === mParam) ? mParam : 'all') as MonthKey

  const articles = await fetchArticles(activeSection, activeMonth)

  const activeSectionLabel = SECTIONS.find(s => s.key === activeSection)?.label  ?? 'All Articles'
  const activeMonthLabel   = ISSUE_MONTHS.find(m => m.key === activeMonth)?.label ?? 'All Issues'

  function sectionHref(key: string) {
    const params = new URLSearchParams()
    if (key !== 'all') params.set('section', key)
    if (activeMonth !== 'all') params.set('month', activeMonth)
    const qs = params.toString()
    return `/articles${qs ? `?${qs}` : ''}`
  }

  function monthHref(key: string) {
    const params = new URLSearchParams()
    if (activeSection !== 'all') params.set('section', activeSection)
    if (key !== 'all') params.set('month', key)
    const qs = params.toString()
    return `/articles${qs ? `?${qs}` : ''}`
  }

  const isFiltered = activeSection !== 'all' || activeMonth !== 'all'

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Page header ── */}
      <div className="border-b border-border/40 bg-background">
        <div className="container py-7 md:py-9">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">River Region Parents</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
                {isFiltered
                  ? activeMonth !== 'all'
                    ? `${activeMonthLabel} — ${activeSectionLabel}`
                    : activeSectionLabel
                  : 'All Articles'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {articles.length > 0
                  ? `${articles.length} article${articles.length !== 1 ? 's' : ''} · sorted newest first`
                  : 'No articles match these filters yet'}
              </p>
            </div>

            {/* Issue archive link */}
            <Link
              href="/articles/issue/2026-05"
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Browse by Issue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Sticky filter bar ── */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[69px] z-40">
        <div className="container">
          {/* Section pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-2.5" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.map(s => (
              <Link
                key={s.key}
                href={sectionHref(s.key)}
                className={[
                  'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                  activeSection === s.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {s.label}
              </Link>
            ))}

            <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

            {/* Month pills */}
            {ISSUE_MONTHS.map(m => (
              <Link
                key={m.key}
                href={monthHref(m.key)}
                className={[
                  'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                  activeMonth === m.key
                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-8 md:py-10">

        {/* ── Empty state ── */}
        {articles.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-lg font-bold text-foreground mb-2">No articles yet for this filter</p>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Try a different section or issue month, or browse all articles.
            </p>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              All Articles
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {articles.map((a) => {
              const href    = articleHref(a)
              const cat     = categoryDisplay(a)
              const heroUrl = a.hero_image_url || getFallbackByContext(a.column_slug ?? a.guide_slug ?? 'parenting', a.id)
              const date    = a.published_at
                ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : ''

              return (
                <Link key={a.id} href={href} className="group flex flex-col gap-3">
                  <div className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-muted">
                    <Image
                      src={heroUrl}
                      alt={a.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur text-xs font-semibold shadow-sm">
                        {cat}
                      </Badge>
                    </div>
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
                      {a.author_name && date && <span>·</span>}
                      {date && <span>{date}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Section quick-links ── */}
        {!isFiltered && articles.length > 0 && (
          <div className="mt-14 pt-10 border-t border-border/40">
            <h2 className="text-lg font-bold text-foreground mb-5">Browse by Section</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'School Zone',          href: '/school-zone',        desc: 'Student spotlights, teacher features, school news', emoji: '🎓' },
                { label: 'School Bits',           href: '/school-bits',        desc: 'Roundup stories from schools across the River Region', emoji: '📚' },
                // Summer Fun Guide tile hidden — content not ready yet.
                // Restore the line when ready: { label: 'Summer Fun Guide', href: '/summer-fun-guide', desc: '...', emoji: '☀️' }
                { label: 'Family Resource Guide', href: '/family-resource-guide', desc: 'Local services, health, childcare, and support',  emoji: '🏠' },
                { label: 'Mom to Mom',            href: '/columns/mom-to-mom', desc: 'Real stories from River Region moms',                emoji: '❤️' },
                { label: 'Events Calendar',       href: '/calendar',           desc: 'What\'s happening around the River Region',          emoji: '📅' },
              ].map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <span className="text-2xl shrink-0 mt-0.5">{s.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{s.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors shrink-0 mt-0.5 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Issue archive CTA ── */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border/40">
          <div>
            <p className="text-sm font-bold text-foreground">Browse Past Issues</p>
            <p className="text-xs text-muted-foreground mt-0.5">View articles organized by publication month</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ISSUE_MONTHS.filter(m => m.key !== 'all').map(m => (
              <Link
                key={m.key}
                href={`/articles/issue/${m.key}`}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-border/60 text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}
