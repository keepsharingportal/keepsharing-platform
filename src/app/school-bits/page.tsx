import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { SponsorPlaceholder } from '@/components/ads/ContextualSponsorCard'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'School Bits — River Region Parents',
  description: 'Student spotlights, teacher recognitions, and classroom stories from schools across the River Region.',
}

// ── Region config ─────────────────────────────────────────────────────────────

const REGIONS = [
  { slug: 'all',                label: 'All Stories'       },
  { slug: 'montgomery-county',  label: 'Montgomery County' },
  { slug: 'autauga-prattville', label: 'Autauga & Elmore'  },
  { slug: 'pike-road',          label: 'Pike Road'         },
  { slug: 'private-schools',    label: 'Private Schools'   },
]

const REGION_BADGE: Record<string, { label: string; cls: string }> = {
  'montgomery-county':  { label: 'Montgomery',     cls: 'bg-blue-600 text-white' },
  'autauga-prattville': { label: 'Autauga/Elmore',  cls: 'bg-orange-500 text-white' },
  'pike-road':          { label: 'Pike Road',       cls: 'bg-green-600 text-white' },
  'elmore-county':      { label: 'Elmore County',   cls: 'bg-purple-600 text-white' },
  'private-schools':    { label: 'Private Schools', cls: 'bg-indigo-600 text-white' },
}

// ── Content-type detection ────────────────────────────────────────────────────

type ContentChip = { label: string; cls: string } | null

function detectContentType(title: string): ContentChip {
  const t = title.toLowerCase()
  if (t.includes('teacher') || t.includes('educator'))              return { label: 'Teacher Feature',     cls: 'bg-amber-500/90 text-white' }
  if (t.includes('spotlight') || t.includes('student of'))          return { label: 'Student Spotlight',   cls: 'bg-blue-500/90 text-white'  }
  if (t.includes('honor roll') || t.includes('award') || t.includes('win') || t.includes('champion')) return { label: 'Achievement', cls: 'bg-green-600/90 text-white' }
  if (t.includes('music') || t.includes('band') || t.includes('choir') || t.includes('art')) return { label: 'Arts & Music', cls: 'bg-purple-500/90 text-white' }
  if (t.includes('graduation') || t.includes('graduate'))           return { label: 'Graduation',          cls: 'bg-rose-500/90 text-white'  }
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function extractRegion(notes: string | null): string | null {
  if (!notes) return null
  const m = notes.match(/School region:\s*([a-z-]+)/i)
  return m ? m[1].toLowerCase() : null
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ region?: string }>
}

export default async function SchoolBitsPage({ searchParams }: PageProps) {
  const { region: regionParam } = await searchParams
  const activeRegion = regionParam && REGIONS.some(r => r.slug === regionParam) ? regionParam : 'all'
  const supabase = getSupabase()

  let query = supabase
    .from('guide_articles')
    .select('id, slug, title, excerpt, hero_image_url, published_at, editorial_notes')
    .eq('column_slug', 'school-bits')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(24)

  if (activeRegion !== 'all') {
    query = query.ilike('editorial_notes', `%School region: ${activeRegion}%`)
  }

  const { data: articles } = await query
  const activeLabel = REGIONS.find(r => r.slug === activeRegion)?.label ?? 'All Stories'
  const count = articles?.length ?? 0

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Compact masthead ── */}
      <div className="bg-gradient-to-r from-primary/10 via-background to-secondary/5 border-b border-border/40">
        <div className="container py-7 md:py-9">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">River Region Parents</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">School Bits</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                Student spotlights, teacher recognitions, and classroom stories from across the River Region.
                {count > 0 && <span className="ml-2 font-semibold text-primary">{count} stories</span>}
              </p>
            </div>
            <Link
              href="/school-zone"
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              School Zone Hub <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Sticky filter bar ── */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-[69px] z-40">
        <div className="container">
          <div className="flex items-center gap-1 overflow-x-auto py-2.5" style={{ scrollbarWidth: 'none' }}>
            {REGIONS.map(r => (
              <Link
                key={r.slug}
                href={r.slug === 'all' ? '/school-bits' : `/school-bits?region=${r.slug}`}
                className={[
                  'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                  activeRegion === r.slug
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-8 md:py-10">

        {/* ── Empty state ── */}
        {count === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-lg font-bold text-foreground mb-2">
              {activeRegion !== 'all' ? `No stories yet for ${activeLabel}` : 'Stories coming soon'}
            </p>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {activeRegion !== 'all'
                ? 'Stories for this area will appear here as they\'re published. Browse all stories or share one!'
                : 'School Bits stories from across the River Region are being reviewed and will appear here soon.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {activeRegion !== 'all' && (
                <Link href="/school-bits" className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">
                  All Stories
                </Link>
              )}
              <Link href="/nominate" className="px-4 py-2 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors">
                Nominate a Teacher
              </Link>
              <Link href="/calendar/submit" className="px-4 py-2 border border-border text-muted-foreground rounded-full text-sm font-semibold hover:bg-muted transition-colors">
                Submit School News
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Count + context */}
            <p className="text-xs text-muted-foreground mb-5">
              <span className="font-semibold text-foreground">{count}</span>
              {' '}{count === 1 ? 'story' : 'stories'}
              {activeRegion !== 'all' && <span> in <span className="font-medium">{activeLabel}</span></span>}
              {' '}— newest first
            </p>

            {/* ── Article grid ── */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {(articles ?? []).map((article) => {
                const region  = extractRegion(article.editorial_notes)
                const badge   = region ? REGION_BADGE[region] : null
                const chip    = detectContentType(article.title)
                const date    = fmtDate(article.published_at)
                const imgSrc  = article.hero_image_url || getFallback('school_zone', article.id)

                return (
                  <Link
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className="group flex flex-col bg-card rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden shrink-0">
                      <Image
                        src={imgSrc}
                        alt={article.title}
                        fill
                        style={{ objectFit: 'cover', objectPosition: 'center top' }}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      {/* Gradient for badge readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                      {/* Region badge — bottom-left */}
                      {badge && (
                        <div className="absolute bottom-2 left-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      )}

                      {/* Content-type chip — bottom-right */}
                      {chip && (
                        <div className="absolute bottom-2 right-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${chip.cls}`}>
                            {chip.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-3.5">
                      <h2 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
                        <span className="text-[11px] text-muted-foreground">{date}</span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-primary group-hover:gap-1.5 transition-all">
                          Read <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* ── Inline sponsor placement ── */}
            <div className="mt-10">
              <SponsorPlaceholder context="education" />
            </div>

            {/* ── Back to School Zone ── */}
            <div className="mt-6 flex justify-center">
              <Link href="/school-zone" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                School Zone — Teacher of the Month, Education Matters & more
              </Link>
            </div>
          </>
        )}

        {/* ── Community CTA ── */}
        <div className="mt-12 rounded-2xl border border-dashed border-primary/25 bg-primary/4 p-7 md:p-9 text-center">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Be Part of the Story</p>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Know a student or teacher who deserves recognition?
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-lg mx-auto leading-relaxed">
            We celebrate River Region schools every month. Nominate a teacher, share a student achievement, or tip us off to a great classroom story.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/nominate" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">
              Nominate a Teacher <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/calendar/submit" className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors">
              Submit School News
            </Link>
            <Link href="/calendar" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-muted-foreground rounded-full text-sm font-semibold hover:bg-muted transition-colors">
              View Events Calendar
            </Link>
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}
