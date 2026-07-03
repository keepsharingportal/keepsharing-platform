import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { SponsorPlaceholder } from '@/components/ads/ContextualSponsorCard'
import { HeroSponsorCard } from '@/components/verticals/HeroSponsorCard'
import { SplitColoredTitle } from '@/components/verticals/SplitColoredTitle'
import { SchoolBitsDiscoveryPanel } from '@/components/school-zone/SchoolBitsDiscoveryPanel'
import { getFallback } from '@/lib/image-fallbacks'
import { articleHref } from '@/lib/articles/slug'
import {
  GraduationCap, ArrowRight, Star, BookOpen, Heart,
  Users, Calendar, Trophy,
} from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'School Zone',
    description: 'Celebrating student achievements, sharing district news, and keeping families connected to education across Montgomery, Autauga, Elmore, Pike Road, and private schools. Submit a School Bit free.',
    path:        '/school-zone',
    type:        'website',
    keywords:    ['River Region schools', 'Montgomery schools', 'student achievements', 'school news', 'Teacher of the Month'],
  })
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

// The main education guide — featured as its own hero block below the portal,
// since it's the on-topic guide for this vertical.
const EDUCATION_GUIDE = {
  label: 'Private & Independent School Guide',
  href:  '/private-school-guide',
  desc:  'Faith-based, independent, magnet, and charter schools across the River Region — tuition ranges, application timelines, and what makes each one distinct.',
  cta:   'Browse schools',
}

// Secondary guides — hidden until content is ready. Only the Birthday
// Party Guide is publishable right now; keeping the array declaration
// so the surrounding SectionHead + grid layout can render an empty
// array-safe state (see conditional below in the render).
const SECONDARY_GUIDES: Array<{ label: string; href: string; desc: string }> = []

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
    latestBitsRes, teacherRes, educationMattersRes,
    montRes, autaugaRes, pikeRes, privateRes,
    latestNewBitsRes, schoolsRes,
  ] = await Promise.all([
    supabase.from('verticals')
      .select('display_name, subtitle, hero_image_url, primary_cta_label, primary_cta_url, sponsor_label')
      .eq('slug', 'school-zone')
      .eq('is_active', true)
      .maybeSingle(),

    supabase.from('ad_placements')
      .select('id, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%school-zone%')
      .limit(1)
      .maybeSingle(),

    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at, editorial_notes')
      .eq('column_slug', 'school-bits').eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false }).limit(6),

    // Teacher of the Month — pull 4 so we get 1 featured + 3 past for
    // the Community-Spotlights-style sidebar list. Filter trashed
    // articles so removed nominees stop reappearing.
    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at')
      .eq('published', true).eq('column_slug', 'teacher-of-month')
      .is('deleted_at', null)
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

    // NEW school_bits table (cards-style submissions from the new submit flow).
    // Time-gated so future-dated/drip-scheduled bits stay hidden until their moment.
    supabase.from('school_bits')
      .select('id, school_id, school_name, title, blurb, image_web_url, published_at, created_at')
      .eq('market', 'rrp')
      .in('status', ['approved', 'published'])
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at',   { ascending: false })
      .limit(4),

    // Active schools roster — feeds the discovery panel typeahead. Small
    // (low hundreds) so loading the full list up-front is fine.
    supabase.from('schools')
      .select('id, name, area, is_private')
      .eq('market', 'rrp')
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  const latestBits       = latestBitsRes.data ?? []  // legacy guide_articles (long-form)
  const teacherArticles  = teacherRes.data    ?? []
  const educationMatters = educationMattersRes.data ?? []
  // Featured (current) teacher = newest; past = next 3.
  const featuredTeacher  = teacherArticles[0] ?? null
  const pastTeachers     = teacherArticles.slice(1, 4)

  // NEW: card-style school_bits from the new submit flow
  interface NewBit {
    id:            string
    school_id:     string | null
    school_name:   string
    title:         string
    blurb:         string
    image_web_url: string | null
    published_at:  string | null
    created_at:    string
  }
  const latestNewBits = (latestNewBitsRes.data ?? []) as NewBit[]

  // Schools roster — passed into the discovery panel so the typeahead works
  // on first paint without needing a client-side fetch
  interface PanelSchool {
    id:         string
    name:       string
    area:       'montgomery' | 'autauga' | 'elmore' | 'pike-road'
    is_private: boolean
  }
  const panelSchools = (schoolsRes.data ?? []) as PanelSchool[]

  const hasAnyContent = latestBits.length > 0 || teacherArticles.length > 0
    || educationMatters.length > 0
  const totalStories  = latestBits.length + teacherArticles.length + educationMatters.length

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
    id:             string
    ad_headline:    string | null
    ad_description: string | null
    ad_cta_label:   string | null
    ad_link:        string | null
    ad_image_url:   string | null
    advertiser:     { business_name?: string | null; slug?: string | null } | null
  } | null
  const sponsor = sponsorRow?.advertiser?.business_name
    ? {
        businessName: sponsorRow.advertiser.business_name,
        slug:         sponsorRow.advertiser.slug ?? null,
        headline:     sponsorRow.ad_headline ?? null,
        imageUrl:     sponsorRow.ad_image_url ?? null,
        description:  sponsorRow.ad_description ?? null,
        ctaLabel:     sponsorRow.ad_cta_label ?? null,
        link:         sponsorRow.ad_link ?? null,
        placementId:  sponsorRow.id,
      }
    : null

  const heroImage    = vertical?.hero_image_url    || HERO_BG
  const heroTitle    = vertical?.display_name      || 'The School Zone'
  const heroSubtitle = vertical?.subtitle          || 'Celebrating student achievements, sharing district news, and keeping you connected to education across the River Region.'
  const sponsorLabel = vertical?.sponsor_label     || 'Proudly Presented By'

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Photo Hero (Brain-Games-style centered composition over a lighter
            photo overlay) ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/40">
        {/* Background photo — lighter overlay so the classroom warmth shows through */}
        <div className="absolute inset-0">
          <Image src={heroImage} alt={heroTitle} fill style={{ objectFit: 'cover', objectPosition: 'center 30%' }} sizes="100vw" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/35 to-black/20" />
        </div>

        <div className="relative container py-14 md:py-20 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-1.5 rounded-full mb-5 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            Education Hub
          </div>

          {/* Title + subtitle — two-tone matches the "River Region Parents"
              treatment in the nav. Only colors the LAST word so a future
              `display_name` of "Mom Knows Best" / "Summer Fun" stays sensible. */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-4 drop-shadow-sm">
            <SplitColoredTitle title={heroTitle} />
          </h1>
          <p className="text-base md:text-lg text-white/90 leading-snug max-w-2xl mx-auto mb-10 md:mb-12">
            {heroSubtitle}
          </p>

          {/* Centered sponsor card — integrated into the hero */}
          <HeroSponsorCard
            sponsor={sponsor}
            sponsorLabel={sponsorLabel}
            verticalSlug="school-zone"
            placeholderName="Anchor School Zone for the year"
            placeholderTagline="One advertiser owns the education hub — Teacher of the Month, School Bits, district news, and every story families share. Your logo on every page."
            placeholderCtaLabel="Claim This Spot"
          />
        </div>
      </div>

      <main className="container py-8 md:py-12 space-y-10 md:space-y-12">

        {/* ── Magazine-style featured block — big hero bit + sidebar personalization + 3-up below ── */}
        <SchoolBitsDiscoveryPanel
          initialBits={latestNewBits}
          initialSchools={panelSchools}
        />

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

        {/* ── 8/4 Portal — main editorial column + sidebar ────────────────── */}
        <div className="grid lg:grid-cols-12 gap-8 md:gap-10">

          {/* MAIN COLUMN (8/12) — editorial content (School Bits live in the featured block above; this column is now Teacher/Student/Education Matters) */}
          <div className="lg:col-span-8 space-y-10 md:space-y-12">

            {/* ── Teacher of the Month — full-width section ──
                Current honoree gets a big featured hero card on the
                left. Past teachers list on the right uses the same
                avatar-pill treatment as the homepage Community
                Spotlights so the section feels like a continuation of
                that pattern. */}
            <section>
              <SectionHead
                icon={Trophy}
                title="Teacher of the Month"
                href="/columns/teacher-of-month"
                linkLabel="See all"
              />
              {teacherArticles.length === 0 ? (
                <EmptySection
                  message="Know an outstanding River Region educator? Nominations for Teacher of the Month are always open."
                  cta="Nominate a Teacher"
                  href="/nominate/teacher"
                />
              ) : (
                <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-stretch">
                  {/* Featured teacher — big hero card spanning 7/12 */}
                  {featuredTeacher && (
                    <Link
                      href={`/columns/teacher-of-month/${featuredTeacher.slug.replace(/^teacher-of-month-/, '')}`}
                      className="md:col-span-7 group relative rounded-3xl overflow-hidden flex flex-col justify-end min-h-[320px] md:min-h-[420px] bg-foreground/10"
                    >
                      <Image
                        src={featuredTeacher.hero_image_url || getFallback('school_zone', featuredTeacher.id)}
                        alt={featuredTeacher.title}
                        fill
                        style={{ objectFit: 'cover', objectPosition: 'center top' }}
                        sizes="(max-width: 768px) 100vw, 58vw"
                        className="group-hover:scale-[1.02] transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      <div className="relative p-5 md:p-7 z-10">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500 text-white mb-3 shadow-sm">
                          <Trophy className="h-3 w-3" /> Current Teacher of the Month
                        </span>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2 line-clamp-2 drop-shadow-sm">
                          {featuredTeacher.title}
                        </h3>
                        {featuredTeacher.excerpt && (
                          <p className="text-sm md:text-base text-white/90 leading-relaxed line-clamp-2 mb-3 max-w-xl">
                            {featuredTeacher.excerpt}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white text-gray-900 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Read story <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  )}

                  {/* Past teachers — Community-Spotlights-style list,
                      spanning 5/12 on desktop, full-width on mobile. */}
                  <div className="md:col-span-5 bg-card rounded-3xl border border-border/50 p-5 md:p-6 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Past Teachers of the Month
                    </h3>
                    {pastTeachers.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          Past honorees will show here as the program grows.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 justify-center flex-1">
                        {pastTeachers.map(a => (
                          <Link
                            key={a.id}
                            href={`/columns/teacher-of-month/${a.slug.replace(/^teacher-of-month-/, '')}`}
                            className="group flex items-center gap-3 md:gap-4 p-3 md:p-3.5 rounded-2xl border border-border/40 bg-muted/20 hover:bg-amber-50 hover:border-amber-200 transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={a.hero_image_url || getFallback('school_zone', a.id)}
                              alt={a.title}
                              className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover group-hover:scale-105 transition-transform border-2 md:border-4 border-background shadow-sm shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="inline-block rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 px-2 py-0.5 bg-amber-100 text-amber-800">
                                Teacher of the Month
                              </span>
                              <h4 className="font-bold text-sm md:text-base leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                {a.title}
                              </h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(a.published_at)}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    <Link
                      href="/nominate"
                      className="flex items-center justify-center gap-2 mt-4 p-3 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Trophy className="h-4 w-4" /> Nominate a Teacher
                    </Link>
                  </div>
                </div>
              )}
            </section>

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
                <Link key={a.id} href={articleHref(a)}
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
          </div>
          {/* end MAIN COLUMN */}

          {/* SIDEBAR (4/12) — sponsor + CTAs + supplementary widgets */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Inline education sponsor */}
            <SponsorPlaceholder context="education" />

            {/* Contribute card — Submit / Nominate / Spotlight */}
            <section className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Get Involved</h3>
              </div>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/school-bits/submit" className="group flex items-start gap-2.5 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Submit a School Bit</p>
                      <p className="text-xs text-muted-foreground leading-snug">A photo + a paragraph. Awards, championships, ribbon cuttings.</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link href="/nominate/teacher" className="group flex items-start gap-2.5 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    <Trophy className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Nominate a Teacher</p>
                      <p className="text-xs text-muted-foreground leading-snug">Recognize an outstanding River Region educator.</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link href="/submit/student-spotlight" className="group flex items-start gap-2.5 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Spotlight a Student</p>
                      <p className="text-xs text-muted-foreground leading-snug">Athletic, artistic, or academic achievements.</p>
                    </div>
                  </Link>
                </li>
              </ul>
            </section>

            {/* Quick links to deep feeds */}
            <section className="bg-muted/40 border border-border/40 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Browse School Bits</h3>
              <div className="grid grid-cols-2 gap-2">
                {AREA_CARDS.map(a => (
                  <Link key={a.slug} href={`/school-zone/school-bits?area=${a.region.replace('-county', '').replace('-prattville', '').replace('-schools', '')}`}
                    className="text-xs font-semibold text-foreground hover:text-primary px-3 py-2 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors text-center">
                    {a.label}
                  </Link>
                ))}
              </div>
            </section>

          </aside>
        </div>
        {/* end 8/4 portal */}

        {/* ── FEATURED EDUCATION GUIDE — the on-topic guide for this vertical, given hero treatment ── */}
        <section className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/8 via-card to-secondary/5 overflow-hidden">
          <div className="p-6 md:p-10 grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-widest">
                <BookOpen className="h-3.5 w-3.5" /> Featured Guide
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2 leading-tight">
                {EDUCATION_GUIDE.label}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                {EDUCATION_GUIDE.desc}
              </p>
            </div>
            <div className="md:text-right">
              <Link
                href={EDUCATION_GUIDE.href}
                className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                {EDUCATION_GUIDE.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Secondary guides — hidden while SECONDARY_GUIDES is empty.
             Restore by populating that array once the After-School /
             Childcare / Summer Camp guides are content-complete. ── */}
        {SECONDARY_GUIDES.length > 0 && (
          <section>
            <SectionHead icon={Heart} title="More Family Resources" />
            <div className="grid sm:grid-cols-3 gap-4">
              {SECONDARY_GUIDES.map(r => (
                <Link key={r.href} href={r.href}
                  className="group flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-primary" />
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
        )}

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

      <PublicFooter />
    </div>
  )
}

