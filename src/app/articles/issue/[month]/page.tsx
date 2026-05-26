import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { columnLabel } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import { ArrowLeft, ArrowRight, BookOpen, Calendar } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 1800

// ── Known issues ───────────────────────────────────────────────────────

const ISSUE_META: Record<string, { label: string; tagline: string }> = {
  '2026-05': { label: 'May 2026',   tagline: 'Summer Fun Issue — Camps, day trips, and outdoor adventures for River Region families' },
  '2026-04': { label: 'April 2026', tagline: 'Spring into Family Fun — School spotlights, community events, and warm-weather activities' },
  '2026-03': { label: 'March 2026', tagline: 'Spring Season — School stories, teacher features, and family resources' },
  '2026-02': { label: 'Feb 2026',   tagline: 'Winter Edition — Family events, school news, and community spotlights' },
}

const ISSUE_SEQUENCE = ['2026-05', '2026-04', '2026-03', '2026-02']

// ── Data ───────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function parseMonth(slug: string): { year: number; month: number } | null {
  const m = slug.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (year < 2020 || year > 2030 || month < 1 || month > 12) return null
  return { year, month }
}

interface PageParams {
  params: Promise<{ month: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { month } = await params
  const meta = ISSUE_META[month]
  if (!meta) return { title: 'Issue Archive — River Region Parents' }
  return {
    title:       `${meta.label} Issue — River Region Parents`,
    description: meta.tagline,
  }
}

export default async function IssuePage({ params }: PageParams) {
  const { month: monthSlug } = await params
  const parsed = parseMonth(monthSlug)
  if (!parsed) notFound()

  const { year, month } = parsed
  const start = new Date(year, month - 1, 1).toISOString()
  const end   = new Date(year, month, 1).toISOString()

  const supabase = getSupabase()
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, title, slug, excerpt, hero_image_url, author_name, published_at, column_slug, guide_slug')
    .eq('published', true)
    .gte('published_at', start)
    .lt('published_at', end)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(60)

  const meta = ISSUE_META[monthSlug] ?? {
    label:   new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    tagline: `Articles published in ${new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
  }

  // Adjacent issues for prev/next navigation
  const idx  = ISSUE_SEQUENCE.indexOf(monthSlug)
  const prev = idx < ISSUE_SEQUENCE.length - 1 ? ISSUE_SEQUENCE[idx + 1] : null  // older
  const next = idx > 0                         ? ISSUE_SEQUENCE[idx - 1] : null  // newer

  // Group by column/section
  const schoolZone     = (articles ?? []).filter(a => ['school-bits', 'teacher-of-month', 'student-spotlights', 'education-matters', 'superintendent-updates', 'student-athletes', 'counselor-corner'].includes(a.column_slug ?? ''))
  const summerFun      = (articles ?? []).filter(a => a.column_slug === 'summer-fun' || a.guide_slug === 'summer-fun-guide')
  const momLife        = (articles ?? []).filter(a => ['mom-to-mom', 'grumpy-but-grateful'].includes(a.column_slug ?? ''))
  const general        = (articles ?? []).filter(a => !schoolZone.find(x => x.id === a.id) && !summerFun.find(x => x.id === a.id) && !momLife.find(x => x.id === a.id))

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* ── Issue hero ── */}
      <div className="bg-gradient-to-br from-primary/8 via-background to-secondary/5 border-b border-border/40">
        <div className="container py-8 md:py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Link href="/articles" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> All Articles
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">Issue Archive</span>
          </div>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Issue Archive</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">{meta.label}</h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">{meta.tagline}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {(articles ?? []).length} article{(articles ?? []).length !== 1 ? 's' : ''} published this issue
              </p>
            </div>

            {/* Issue prev/next */}
            <div className="flex items-center gap-2">
              {prev && (
                <Link
                  href={`/articles/issue/${prev}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {ISSUE_META[prev]?.label ?? prev}
                </Link>
              )}
              {next && (
                <Link
                  href={`/articles/issue/${next}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {ISSUE_META[next]?.label ?? next}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container py-8 md:py-10">

        {(articles ?? []).length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <BookOpen className="h-10 w-10 text-primary/30 mx-auto mb-4" />
            <p className="text-lg font-bold text-foreground mb-2">Content coming soon</p>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Articles from this issue are being reviewed and will appear here shortly.
            </p>
            <Link href="/articles" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">
              Browse All Articles
            </Link>
          </div>
        ) : (
          <div className="space-y-14">

            {/* School Zone section */}
            {schoolZone.length > 0 && (
              <IssueSection
                title="School Zone"
                emoji="🎓"
                href="/school-zone"
                articles={schoolZone}
                articleHref={articleHref}
              />
            )}

            {/* Summer Fun section */}
            {summerFun.length > 0 && (
              <IssueSection
                title="Summer Fun"
                emoji="☀️"
                href="/summer-fun-guide"
                articles={summerFun}
                articleHref={articleHref}
              />
            )}

            {/* Mom Life section */}
            {momLife.length > 0 && (
              <IssueSection
                title="Mom Life"
                emoji="❤️"
                href="/columns/mom-to-mom"
                articles={momLife}
                articleHref={articleHref}
              />
            )}

            {/* General / Feature articles */}
            {general.length > 0 && (
              <IssueSection
                title="Features & Community"
                emoji="📰"
                href="/articles"
                articles={general}
                articleHref={articleHref}
              />
            )}

          </div>
        )}

        {/* ── Other issues ── */}
        <div className="mt-14 pt-10 border-t border-border/40">
          <h2 className="text-lg font-bold text-foreground mb-5">Other Issues</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {ISSUE_SEQUENCE.filter(k => k !== monthSlug).map(k => {
              const m = ISSUE_META[k] ?? { label: k, tagline: '' }
              return (
                <Link
                  key={k}
                  href={`/articles/issue/${k}`}
                  className="flex items-start justify-between gap-2 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.tagline.split('—')[0].trim()}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}

// ── IssueSection ───────────────────────────────────────────────────────

type ArticleRow = {
  id: string; title: string; slug: string; excerpt: string | null
  hero_image_url: string | null; author_name: string | null
  published_at: string | null; column_slug: string | null; guide_slug: string | null
}

function IssueSection({ title, emoji, href, articles, articleHref }: {
  title: string
  emoji: string
  href: string
  articles: ArticleRow[]
  articleHref: (a: { slug: string; column_slug: string | null }) => string
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span>{emoji}</span> {title}
        </h2>
        <Link href={href} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {articles.slice(0, 6).map(a => {
          const href2   = articleHref(a)
          const cat     = a.column_slug ? columnLabel(a.column_slug) : 'Feature'
          const heroUrl = a.hero_image_url || getFallbackByContext(a.column_slug ?? a.guide_slug ?? 'parenting', a.id)
          const date    = a.published_at
            ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : ''

          return (
            <Link key={a.id} href={href2} className="group flex flex-col gap-3">
              <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-muted">
                <Image
                  src={heroUrl}
                  alt={a.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur text-[10px] font-semibold shadow-sm">
                    {cat}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors text-foreground line-clamp-2">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  {a.author_name && <span className="font-medium">{a.author_name}</span>}
                  {a.author_name && date && <span>·</span>}
                  {date && <span>{date}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
