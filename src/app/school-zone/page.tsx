import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { SponsorPlaceholder } from '@/components/ads/ContextualSponsorCard'
import { VerticalSponsorBanner } from '@/components/verticals/VerticalSponsorBanner'
import { getFallback } from '@/lib/image-fallbacks'
import {
  GraduationCap, ArrowRight, Star, BookOpen, Heart,
  Users, Calendar, Trophy,
} from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'School Zone — River Region Parents',
  description: 'Celebrating student achievements, sharing district news, and keeping you connected to education across the River Region.',
}

// ── Education-specific Unsplash images ───────────────────────────────────────

const HERO_BG = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80&auto=format&fit=crop'

const AREA_CARDS = [
  {
    slug:    'montgomery-county',
    label:   'Montgomery County',
    region:  'montgomery-county',
    image:   'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80&auto=format&fit=crop',
    accent:  'from-blue-900/80 to-blue-800/70',
  },
  {
    slug:    'autauga-prattville',
    label:   'Autauga & Elmore',
    region:  'autauga-prattville',
    image:   'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&auto=format&fit=crop',
    accent:  'from-orange-900/80 to-orange-700/70',
  },
  {
    slug:    'pike-road',
    label:   'Pike Road',
    region:  'pike-road',
    image:   'https://images.unsplash.com/photo-1543269864-e3c379c29469?w=800&q=80&auto=format&fit=crop',
    accent:  'from-green-900/80 to-green-700/70',
  },
  {
    slug:    'private-schools',
    label:   'Private Schools',
    region:  'private-schools',
    image:   'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&auto=format&fit=crop',
    accent:  'from-indigo-900/80 to-indigo-700/70',
  },
]

const ED_RESOURCES = [
  { label: 'Private School Guide', href: '/private-school-guide',  desc: 'Faith-based & independent schools'   },
  { label: 'After-School Guide',   href: '/afterschool-guide',     desc: 'Programs & enrichment activities'    },
  { label: 'Childcare Guide',      href: '/childcare-guide',       desc: 'Daycares, preschools & care options' },
  { label: 'Summer Camp Guide',    href: '/summer-camp-guide',     desc: 'Camps & summer learning programs'    },
]

// ── Data layer ────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function extractRegion(notes: string | null): string | null {
  if (!notes) return null
  const m = notes.match(/School region:\s*([a-z-]+)/i)
  return m ? m[1].toLowerCase() : null
}

const REGION_BADGE: Record<string, { label: string; cls: string }> = {
  'montgomery-county':  { label: 'Montgomery',    cls: 'bg-blue-600 text-white' },
  'autauga-prattville': { label: 'Autauga/Elmore', cls: 'bg-orange-500 text-white' },
  'pike-road':          { label: 'Pike Road',      cls: 'bg-green-600 text-white' },
  'elmore-county':      { label: 'Elmore County',  cls: 'bg-purple-600 text-white' },
  'private-schools':    { label: 'Private Schools', cls: 'bg-indigo-600 text-white' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({
  icon: Icon, title, href, linkLabel = 'View All',
}: {
  icon: React.ElementType; title: string; href?: string; linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary shrink-0" />
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

function EmptySection({ message, cta, href }: { message: string; cta: string; href: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-7 text-center">
      <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{message}</p>
      <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SchoolZonePage() {
  const supabase = getSupabase()

  const [
    verticalRes, sponsorRes,
    latestBitsRes, teacherRes, studentRes, educationMattersRes,
    montRes, autaugaRes, pikeRes, privateRes,
  ] = await Promise.all([
    supabase.from('verticals')
      .select('display_name, subtitle, hero_image_url, primary_cta_label, primary_cta_url, sponsor_label')
      .eq('slug', 'school-zone')
      .eq('is_active', true)
      .maybeSingle(),

    supabase.from('ad_placements')
      .select('ad_headline, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%school-zone%')
      .limit(1)
      .maybeSingle(),

    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at, editorial_notes')
      .eq('column_slug', 'school-bits').eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false }).limit(6),

    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at')
      .eq('published', true).eq('column_slug', 'teacher-of-month')
      .order('published_at', { ascending: false, nullsFirst: false }).limit(3),

    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at')
      .eq('published', true)
      .or('column_slug.eq.student-spotlights,title.ilike.%student spotlight%')
      .order('published_at', { ascending: false, nullsFirst: false }).limit(4),

    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, published_at, author_name')
      .eq('published', true)
      .or('column_slug.eq.education-matters,column_slug.eq.superintendent-updates,title.ilike.%education matters%')
      .order('published_at', { ascending: false, nullsFirst: false }).limit(3),

    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('column_slug', 'school-bits').eq('published', true)
      .ilike('editorial_notes', '%montgomery-county%'),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('column_slug', 'school-bits').eq('published', true)
      .ilike('editorial_notes', '%autauga-prattville%'),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('column_slug', 'school-bits').eq('published', true)
      .ilike('editorial_notes', '%pike-road%'),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('column_slug', 'school-bits').eq('published', true)
      .ilike('editorial_notes', '%private-schools%'),
  ])

  const latestBits       = latestBitsRes.data ?? []
  const teacherArticles  = teacherRes.data    ?? []
  const studentArticles  = studentRes.data    ?? []
  const educationMatters = educationMattersRes.data ?? []

  const hasAnyContent = latestBits.length > 0 || teacherArticles.length > 0
    || studentArticles.length > 0 || educationMatters.length > 0
  const totalStories  = latestBits.length + teacherArticles.length + studentArticles.length + educationMatters.length

  const regionCounts: Record<string, number> = {
    'montgomery-county':  montRes.count    ?? 0,
    'autauga-prattville': autaugaRes.count ?? 0,
    'pike-road':          pikeRes.count    ?? 0,
    'private-schools':    privateRes.count ?? 0,
  }

  const vertical = verticalRes.data as {
    display_name:      string | null
    subtitle:          string | null
    hero_image_url:    string | null
    primary_cta_label: string | null
    primary_cta_url:   string | null
    sponsor_label:     string | null
  } | null

  const sponsorRow = sponsorRes.data as {
    ad_headline: string | null
    advertiser:  { business_name?: string | null; slug?: string | null } | null
  } | null
  const sponsor = sponsorRow?.advertiser?.business_name
    ? {
        businessName: sponsorRow.advertiser.business_name,
        slug:         sponsorRow.advertiser.slug ?? null,
        headline:     sponsorRow.ad_headline ?? null,
      }
    : null

  const heroImage    = vertical?.hero_image_url    || HERO_BG
  const heroTitle    = vertical?.display_name      || 'The School Zone'
  const heroSubtitle = vertical?.subtitle          || 'Celebrating student achievements, sharing district news, and keeping you connected to education across the River Region.'
  const sponsorLabel = vertical?.sponsor_label     || 'Proudly Presented By'

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Photo Hero ── */}
      <div className="relative overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <Image src={heroImage} alt={heroTitle} fill style={{ objectFit: 'cover', objectPosition: 'center 30%' }} sizes="100vw" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/88 via-primary/75 to-primary/60" />
        </div>

        <div className="relative container py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                <GraduationCap className="h-3.5 w-3.5" />
                Education Hub
              </div>
              {totalStories > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  {totalStories} stories published
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-3">
              {heroTitle}
            </h1>
            <p className="text-base md:text-lg text-white/85 leading-relaxed max-w-xl mb-7">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/calendar/submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary rounded-full text-sm font-bold hover:bg-white/90 transition-colors shadow-sm">
                Submit School News
              </Link>
              <Link href="/nominate" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 border border-white/30 text-white rounded-full text-sm font-semibold hover:bg-white/25 transition-colors">
                <Trophy className="h-3.5 w-3.5" /> Nominate a Teacher
              </Link>
              <Link href="/school-bits" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 border border-white/30 text-white rounded-full text-sm font-semibold hover:bg-white/25 transition-colors">
                <BookOpen className="h-3.5 w-3.5" /> School Bits Feed
              </Link>
              <Link href="/family-resource-guide" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 border border-white/30 text-white rounded-full text-sm font-semibold hover:bg-white/25 transition-colors">
                <Heart className="h-3.5 w-3.5" /> Education Resources
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-8 md:py-12 space-y-10 md:space-y-12">

        {/* ── All-empty onboarding: only shows when DB has zero School Zone content ── */}
        {!hasAnyContent && (
          <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-secondary/4 p-8 md:p-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Be Part of the Story</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
                School Zone is Coming to Life
              </h2>
              <p className="text-muted-foreground mb-7 leading-relaxed max-w-lg">
                We&apos;re building the River Region&apos;s education hub — and we need your help. Submit a school story,
                nominate a teacher, or share an achievement to put your school on the map.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Link href="/nominate/teacher" className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-primary/20 hover:border-primary/50 hover:shadow-sm transition-all group">
                  <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Nominate a Teacher</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Recognize an outstanding educator in our area</p>
                  </div>
                </Link>
                <Link href="/calendar/submit" className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-secondary/20 hover:border-secondary/50 hover:shadow-sm transition-all group">
                  <Calendar className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-foreground group-hover:text-secondary transition-colors">Submit School News</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Events, achievements, and community stories</p>
                  </div>
                </Link>
                <Link href="/school-bits" className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all group">
                  <BookOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Browse School Bits</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">All published school stories and spotlights</p>
                  </div>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── School Bits by Area — photo cards ── */}
        <section>
          <SectionHead icon={GraduationCap} title="School Bits by Area" href="/school-bits" linkLabel="All Stories" />
          <p className="text-sm text-muted-foreground mb-5 -mt-2">Monthly highlights of students doing great things across our local schools.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {AREA_CARDS.map(area => {
              const count = regionCounts[area.region] ?? 0
              return (
                <Link
                  key={area.slug}
                  href={`/school-bits?region=${area.region}`}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex flex-col justify-end hover:shadow-lg transition-shadow duration-300"
                >
                  <Image
                    src={area.image}
                    alt={area.label}
                    fill
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="group-hover:scale-105 transition-transform duration-700"
                    unoptimized
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${area.accent}`} />
                  <div className="relative p-3 md:p-4 z-10">
                    <p className="font-bold text-white text-sm md:text-base leading-tight">{area.label}</p>
                    {count > 0 ? (
                      <p className="text-white/75 text-xs font-medium flex items-center gap-1 mt-0.5">
                        {count} {count === 1 ? 'story' : 'stories'} <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </p>
                    ) : (
                      <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                        Browse <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Latest School Bits ── */}
        <section>
          <SectionHead icon={BookOpen} title="Latest School Bits" href="/school-bits" linkLabel="View All Stories" />
          {latestBits.length === 0 ? (
            <EmptySection
              message="Help celebrate River Region students! Submit a school story or nominate a teacher — stories appear here monthly."
              cta="Submit a School Story"
              href="/calendar/submit"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestBits.map(a => {
                const region = extractRegion(a.editorial_notes)
                const badge  = region ? REGION_BADGE[region] : null
                const imgSrc = a.hero_image_url || getFallback('school_zone', a.id)
                return (
                  <Link
                    key={a.id}
                    href={`/articles/${a.slug}`}
                    className="group flex flex-col bg-card rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-primary/5 shrink-0">
                      <Image src={imgSrc} alt={a.title} fill style={{ objectFit: 'cover' }}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="group-hover:scale-105 transition-transform duration-500" unoptimized />
                      {badge && (
                        <div className="absolute bottom-2 left-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 p-3.5">
                      <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">{a.title}</h3>
                      {a.excerpt && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">{a.excerpt}</p>}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
                        <span className="text-[11px] text-muted-foreground">{fmtDate(a.published_at)}</span>
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all">
                          Read <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Inline education sponsor ── */}
        <SponsorPlaceholder context="education" />

        {/* ── Teacher + Student side by side ── */}
        <div className="grid md:grid-cols-2 gap-10">

          <section>
            <SectionHead icon={Trophy} title="Teacher of the Month" />
            {teacherArticles.length === 0 ? (
              <EmptySection
                message="Know an outstanding River Region educator? Nominations for Teacher of the Month are always open."
                cta="Nominate a Teacher"
                href="/nominate/teacher"
              />
            ) : (
              <div className="space-y-3">
                {teacherArticles.map(a => (
                  <Link key={a.id} href={`/columns/teacher-of-month/${a.slug.replace(/^teacher-of-month-/, '')}`}
                    className="group flex gap-3.5 p-3.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all">
                    <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-primary/5">
                      <Image src={a.hero_image_url || getFallback('school_zone', a.id)} alt={a.title}
                        fill style={{ objectFit: 'cover' }} sizes="64px" unoptimized />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fmtDate(a.published_at)}</p>
                    </div>
                  </Link>
                ))}
                <Link href="/nominate"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                  <Trophy className="h-4 w-4" /> Nominate a Teacher →
                </Link>
              </div>
            )}
          </section>

          <section>
            <SectionHead icon={Star} title="Student Spotlights" />
            {studentArticles.length === 0 ? (
              <EmptySection
                message="Student athletic, artistic, and academic achievements are featured here monthly. Share a story about a River Region student!"
                cta="Share a Student Story"
                href="/calendar/submit"
              />
            ) : (
              <div className="space-y-2.5">
                {studentArticles.map(a => (
                  <Link key={a.id} href={`/articles/${a.slug}`}
                    className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Star className="h-4 w-4 text-primary fill-primary/20" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(a.published_at)}</p>
                    </div>
                  </Link>
                ))}
                <Link href="/calendar/submit"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                  <Users className="h-4 w-4" /> Submit a Student Story →
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* ── Education Matters ── */}
        <section>
          <SectionHead icon={BookOpen} title="Education Matters" />
          {educationMatters.length === 0 ? (
            <EmptySection
              message="Superintendent updates, district news, and education policy coverage for River Region families."
              cta="Submit School News"
              href="/calendar/submit"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {educationMatters.map(a => (
                <Link key={a.id} href={`/articles/${a.slug}`}
                  className="group flex flex-col gap-2 p-4 rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{a.title}</h3>
                  {a.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">{a.excerpt}</p>}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/40">
                    {a.author_name && <span className="text-xs font-medium text-muted-foreground">{a.author_name}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{fmtDate(a.published_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Education Resources ── */}
        <section>
          <SectionHead icon={Heart} title="Education Resources for Families" />
          <p className="text-sm text-muted-foreground mb-5 -mt-2">Find local schools, programs, and services for your child&apos;s education journey.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ED_RESOURCES.map(r => (
              <Link key={r.href} href={r.href}
                className="group flex flex-col gap-2 p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{r.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                <span className="text-xs font-bold text-primary flex items-center gap-1 mt-auto group-hover:gap-1.5 transition-all">
                  Explore <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Events CTA ── */}
        <section className="rounded-2xl bg-gradient-to-r from-secondary/10 via-primary/5 to-accent/10 border border-border/40 p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Stay Connected</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">School events, performances & more</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Plays, concerts, fundraisers, sports — see what's happening across River Region schools.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3">
              <Link href="/calendar" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors">
                <Calendar className="h-4 w-4" /> Events Calendar
              </Link>
              <Link href="/calendar/submit" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors">
                Submit an Event
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Section sponsor banner ── */}
      <div className="border-t border-border/40 bg-muted/20 py-6">
        <div className="container">
          <VerticalSponsorBanner
            verticalName={heroTitle}
            sponsorLabel={sponsorLabel}
            sponsor={sponsor}
          />
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
