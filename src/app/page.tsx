import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp, CalendarDays, BookOpen, Star,
  ArrowRight, Users, Briefcase, Map, MessageCircle,
} from 'lucide-react'
import { getFallback, getFallbackByContext } from '@/lib/image-fallbacks'
import { columnLabel } from '@/lib/content-taxonomy'
import { IssueSpotlightSidebar } from '@/components/homepage/IssueSpotlightSidebar'
import { SummerFunBlock } from '@/components/homepage/SummerFunBlock'
import { SchoolBitsBlock } from '@/components/homepage/SchoolBitsBlock'
import { ArticleCard, SectionHeader } from '@/components/theme'
import type { Metadata } from 'next'

export const revalidate = 600

// ── Current issue — update these 3 lines each month ──────────────────────────
const CURRENT_ISSUE_COVER  = '/images/issues/may-2026-cover.jpg'
const CURRENT_ISSUE_LABEL  = 'May 2026 Issue'
const CURRENT_ISSUE_TAGLINE = 'Summer Fun Issue: 100+ camps, day trips, and adventures'
const CURRENT_ISSUE_URL    = 'https://issuu.com/keepsharing/docs/river_region_parents_summer_fun_issue_may_2026_'

const FEATURED_CATEGORIES = [
  { title: 'Moms Know Best',        desc: 'Real stories from River Region moms',     href: '/columns/mom-to-mom',     image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80&auto=format&fit=crop' },
  { title: 'School Zone',           desc: 'Student spotlights & school news',        href: '/school-zone',            image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&auto=format&fit=crop' },
  { title: 'Family Resource Guide', desc: 'Local services, health & support',        href: '/family-resource-guide',  image: 'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=800&q=80&auto=format&fit=crop' },
  { title: 'Summer Fun',            desc: 'Camps, splash pads & family adventures',  href: '/summer-fun-guide',       image: 'https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?w=800&q=80&auto=format&fit=crop' },
]

export const metadata: Metadata = {
  title:       'River Region Parents — Local Family Guides & Events',
  description: 'Local guides, community events, and family resources for the River Region. Schools, childcare, camps, health, and more.',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getHomepageData() {
  const supabase = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const [
    trendingRes,
    mainFeatureRes,
    heroFeaturedRes,
    featuredGuideRes,
    spotlightsRes,
    eventsRes,
    articlesRes,
    inlineAdRes,
    sidebarAdRes,
    businessSpotlightRes,
    bottomAdRes,
    momColumnsRes,
  ] = await Promise.all([
    supabase.from('trending_items').select('*').eq('is_active', true).order('display_order'),
    // Priority 2: recent mom-to-mom article (used if no explicit hero is set)
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, column_slug, author_name')
      .eq('column_slug', 'mom-to-mom')
      .eq('published', true)
      .not('hero_image_url', 'is', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1).maybeSingle(),
    // Priority 1: explicitly featured article (marked [homepage_hero] in editorial_notes)
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, column_slug, author_name')
      .eq('published', true)
      .not('hero_image_url', 'is', null)
      .ilike('editorial_notes', '%[homepage_hero]%')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1).maybeSingle(),
    supabase.from('guide_types')
      .select('slug, url_slug, display_name, hero_image_url, pitch')
      .in('slug', ['summer-fun', 'summer-camp'])
      .order('slug', { ascending: true })
      .limit(2),
    supabase.from('community_spotlights')
      .select('*').eq('is_active', true).order('display_order').limit(3),
    supabase.from('calendar_events')
      .select('id, slug, title, start_date, start_time, location_name, hero_image_url, category, is_free')
      .eq('status', 'published').gte('start_date', today)
      .order('start_date').limit(6),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, guide_slug, column_slug, author_name, published_at, created_at')
      .eq('published', true)
      .not('column_slug', 'in', '(mom-to-mom,school-bits,teacher-of-month)')
      .order('published_at', { ascending: false, nullsFirst: false }).limit(8),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug, website_url)')
      .eq('placement_type', 'homepage_inline_ad').eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug, website_url)')
      .eq('placement_type', 'homepage_sidebar_ad').eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug, website_url)')
      .eq('placement_type', 'homepage_business_spotlight').eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug, website_url)')
      .eq('placement_type', 'homepage_bottom_ad').eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('guide_articles')
      .select('id, slug, title, author_name, published_at, hero_image_url')
      .eq('column_slug', 'mom-to-mom')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(4),
  ])

  const guidesData = featuredGuideRes.data ?? []
  // Prefer summer-camp (uses live guide_listings data) over summer-fun (uses legacy summer_fun_guide table)
  const featuredGuide = guidesData.find(g => g.slug === 'summer-camp') ?? guidesData[0] ?? null

  // Hero priority: [homepage_hero] tag > mom-to-mom > any recent published article
  let mainFeature = heroFeaturedRes.data ?? mainFeatureRes.data ?? null
  if (!mainFeature) {
    const { data: fallbackFeature } = await supabase
      .from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, column_slug, author_name')
      .eq('published', true)
      .not('hero_image_url', 'is', null)
      .not('column_slug', 'eq', 'school-bits')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    mainFeature = fallbackFeature ?? null
  }

  return {
    trending:          trendingRes.data ?? [],
    mainFeature,
    momColumns:        momColumnsRes.data ?? [],
    featuredGuide,
    spotlights:        spotlightsRes.data ?? [],
    events:            eventsRes.data ?? [],
    articles:          articlesRes.data ?? [],
    inlineAd:          inlineAdRes.data ?? null,
    sidebarAd:         sidebarAdRes.data ?? null,
    businessSpotlight: businessSpotlightRes.data ?? null,
    bottomAd:          bottomAdRes.data ?? null,
  }
}

function fmtEventDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day:   dt.getDate(),
  }
}

export default async function HomePage() {
  const {
    trending, mainFeature, featuredGuide, spotlights, events, articles,
    inlineAd, sidebarAd, businessSpotlight, bottomAd, momColumns,
  } = await getHomepageData()

  const fallbackTrending = [
    { id: '1', label: 'Summer Camp Guide 2026',           href: '/summer-camp-guide',      emoji: '⛺' },
    { id: '2', label: 'Family Resource Guide',             href: '/family-resource-guide',  emoji: '🏠' },
    { id: '3', label: 'Nominate a Teacher of the Month',  href: '/nominate',               emoji: '🏆' },
    { id: '4', label: 'Upcoming Community Events',         href: '/calendar',               emoji: '📅' },
  ]
  const trendingItems = trending.length > 0 ? trending : fallbackTrending

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Trending ticker */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 overflow-hidden">
        <div className="container">
          <div className="flex items-center gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary whitespace-nowrap shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
              Trending:
            </span>
            <div className="w-px h-3.5 bg-primary/30 shrink-0" />
            {trendingItems.slice(0, 4).map((t: { id?: string; emoji?: string; label?: string; text?: string; href?: string; url?: string }, i) => (
              <Link
                key={t.id ?? i}
                href={t.href ?? t.url ?? '#'}
                className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors shrink-0 whitespace-nowrap"
              >
                {t.emoji && <span>{t.emoji}</span>}
                <span className="font-medium">{t.label ?? t.text}</span>
                {i < 3 && <span className="text-primary/30 ml-2">·</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-8 space-y-10">

        {/* Top Featured Area */}
        <section className="grid lg:grid-cols-12 gap-6">
          {/* Featured story — mom-to-mom preferred, falls back to any article */}
          <div className="lg:col-span-8">
            {mainFeature ? (
              <Link
                href={mainFeature.column_slug && mainFeature.column_slug !== 'school-bits'
                  ? `/columns/${mainFeature.column_slug}/${mainFeature.slug.replace(new RegExp(`^${mainFeature.column_slug}-`), '')}`
                  : `/articles/${mainFeature.slug}`}
                className="relative rounded-3xl overflow-hidden block group cursor-pointer aspect-[16/9] lg:aspect-auto h-full lg:min-h-[500px] bg-foreground/10"
              >
                <Image
                  src={mainFeature.hero_image_url || getFallbackByContext('parenting', mainFeature.slug ?? 'mom-to-mom')}
                  alt={mainFeature.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                  sizes="900px"
                  priority
                  className="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                  <Badge className="bg-primary text-primary-foreground border-none mb-4 font-semibold">
                    {mainFeature.column_slug ? columnLabel(mainFeature.column_slug) : 'Feature Story'}
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {mainFeature.title}
                  </h1>
                  {mainFeature.excerpt && (
                    <p className="text-white/90 text-lg max-w-2xl hidden md:block" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {mainFeature.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="relative rounded-3xl overflow-hidden aspect-[16/9] lg:aspect-auto h-full lg:min-h-[500px] bg-foreground/10">
                <Image src={getFallbackByContext('parenting', 'mom-to-mom-empty')} alt="Mom to Mom" fill style={{ objectFit: 'cover' }} unoptimized sizes="900px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                  <Badge className="bg-primary text-primary-foreground border-none mb-4 font-semibold">Mom to Mom</Badge>
                  <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    Real stories from River Region moms
                  </h1>
                </div>
              </div>
            )}
          </div>

          {/* Side features */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Featured Guide */}
            <Link
              href={`/${featuredGuide?.url_slug ?? 'summer-fun-guide'}`}
              className="relative rounded-3xl overflow-hidden h-[240px] shrink-0 group cursor-pointer block"
            >
              <Image
                src={featuredGuide?.hero_image_url || getFallbackByContext('summer-fun', 'featured-guide')}
                alt={featuredGuide?.display_name ?? 'Featured Guide'}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
                sizes="400px"
                className="group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center text-accent-foreground mb-3 shadow-lg">
                  <Map className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {featuredGuide?.display_name ?? 'Summer Fun Guide'}
                </h3>
                <p className="text-white/80 text-sm mt-1 mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {featuredGuide?.pitch ?? 'Your ultimate bucket list for family adventures this season.'}
                </p>
                <div className="flex items-center text-sm font-bold text-accent">
                  Explore Guide <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Community Spotlights */}
            <div className="flex-1 bg-card rounded-3xl border border-border/50 p-6 flex flex-col shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary" />
                  Community Spotlights
                </h2>
              </div>
              <div className="flex flex-col gap-4 justify-center flex-1">
                {spotlights.length > 0 ? spotlights.map((sp) => {
                  const cardBg = sp.spotlight_type === 'teacher'  ? 'bg-primary/5 border-primary/10 hover:bg-primary/10'
                               : sp.spotlight_type === 'student'  ? 'bg-secondary/5 border-secondary/10 hover:bg-secondary/10'
                               : sp.spotlight_type === 'grands'   ? 'bg-accent/10 border-accent/20 hover:bg-accent/20'
                               : 'bg-primary/5 border-primary/10 hover:bg-primary/10'
                  const labelClasses = sp.spotlight_type === 'teacher' ? 'text-primary border-primary/30 bg-background/50'
                                     : sp.spotlight_type === 'student' ? 'text-secondary border-secondary/30 bg-background/50'
                                     : sp.spotlight_type === 'grands'  ? 'text-foreground border-accent/40 bg-background/50'
                                     : 'text-primary border-primary/30 bg-background/50'
                  const hoverColor = sp.spotlight_type === 'teacher' ? 'group-hover:text-primary'
                                   : sp.spotlight_type === 'student' ? 'group-hover:text-secondary'
                                   : sp.spotlight_type === 'grands'  ? 'group-hover:text-accent-foreground'
                                   : 'group-hover:text-primary'
                  const labelText = sp.spotlight_type === 'teacher'  ? 'Teacher of the Month'
                                  : sp.spotlight_type === 'student'  ? 'Play Ball'
                                  : sp.spotlight_type === 'grands'   ? 'Grands are the Greatest'
                                  : 'Community Spotlight'
                  const avatarSrc = sp.hero_image_url || getFallback(
                    sp.spotlight_type === 'grands'  ? 'person_grandparent'
                      : sp.spotlight_type === 'student' ? 'person_kid'
                      : 'person_woman',
                    sp.id,
                  )
                  return (
                    <div key={sp.id} className={`flex items-center gap-3 md:gap-5 group cursor-pointer p-3 md:p-4 rounded-2xl border transition-all ${cardBg}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarSrc}
                        alt={sp.honoree_name}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover group-hover:scale-105 transition-transform border-2 md:border-4 border-background shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${labelClasses}`}>
                          {labelText}
                        </Badge>
                        <h3 className={`font-bold text-lg md:text-2xl leading-tight mb-0.5 text-foreground transition-colors ${hoverColor}`}>
                          {sp.honoree_name}
                        </h3>
                        {sp.honoree_context && (
                          <p className="text-sm text-muted-foreground font-medium">{sp.honoree_context}</p>
                        )}
                      </div>
                    </div>
                  )
                }) : (
                  <div className="py-3 space-y-2.5">
                    {[
                      { emoji: '🏆', label: 'Teacher of the Month',      desc: 'Nominate an outstanding River Region educator' },
                      { emoji: '⭐', label: 'Student Achievement',        desc: 'Celebrate a student making a difference'        },
                      { emoji: '❤️', label: 'Grands are the Greatest', desc: 'Honor a grandparent who shapes your family'       },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                        <span className="text-lg shrink-0">{item.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button asChild className="w-full rounded-full mt-4">
                <Link href="/nominate">Nominate Someone</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Categories — overlay text, magazine-style */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {FEATURED_CATEGORIES.map((cat) => (
            <Link href={cat.href} key={cat.title} className="group block">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <h3 className="font-bold text-sm md:text-base text-white leading-tight drop-shadow">{cat.title}</h3>
                  <p className="text-[11px] md:text-xs text-white/75 mt-0.5 leading-snug hidden sm:block">{cat.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Summer Fun Block */}
        <SummerFunBlock />

        {/* School Zone — full-width featured block above the portal */}
        <SchoolBitsBlock />

        {/* Two-column portal */}
        <div className="grid lg:grid-cols-12 gap-10">

          {/* MAIN CONTENT */}
          <div className="lg:col-span-8 space-y-10">

            {/* Happening Around Town — always visible; shows CTA cards when no events */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  Happening Around Town!
                </h2>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                    <Link href="/calendar">Full Calendar</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="hidden sm:flex rounded-full">
                    <Link href="/calendar/submit">Submit Event</Link>
                  </Button>
                </div>
              </div>

              {events.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((ev) => {
                    const date   = ev.start_date ? fmtEventDate(ev.start_date) : null
                    const imgSrc = ev.hero_image_url || getFallbackByContext(ev.category, ev.slug ?? ev.id)
                    return (
                      <Link
                        key={ev.id}
                        href={`/calendar/events/${ev.slug ?? ev.id}`}
                        className="group flex flex-col rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-md transition-all bg-card"
                      >
                        <div className="relative h-32 overflow-hidden bg-primary/5 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgSrc} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                          {date && (
                            <div className="absolute bottom-2.5 left-2.5 bg-white rounded-xl px-2.5 py-1.5 text-center shadow-sm">
                              <div className="text-[9px] font-bold text-primary uppercase leading-none">{date.month}</div>
                              <div className="text-lg font-black text-foreground leading-none mt-0.5">{date.day}</div>
                            </div>
                          )}
                          {ev.is_free && (
                            <div className="absolute top-2.5 right-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500 text-white">Free</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3.5">
                          <h4 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{ev.title}</h4>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                            {ev.start_time && <span>{ev.start_time}</span>}
                            {ev.start_time && ev.location_name && <span>·</span>}
                            {ev.location_name && <span className="truncate">{ev.location_name}</span>}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Link href="/calendar/submit" className="group flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/3 hover:border-primary/40 hover:bg-primary/6 transition-all min-h-[100px]">
                    <CalendarDays className="h-7 w-7 text-primary/50 mb-2.5" />
                    <p className="font-bold text-sm text-foreground mb-1">Submit an Event</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Share your upcoming event with River Region families</p>
                  </Link>
                  <Link href="/calendar" className="group flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all min-h-[100px]">
                    <span className="text-2xl mb-2">📅</span>
                    <p className="font-bold text-sm text-foreground mb-0.5">Browse Calendar</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">See all upcoming community events</p>
                  </Link>
                  <Link href="/school-zone" className="group flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all min-h-[100px]">
                    <span className="text-2xl mb-2">🎓</span>
                    <p className="font-bold text-sm text-foreground mb-0.5">School Events</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Concerts, games, fundraisers & more</p>
                  </Link>
                </div>
              )}
            </section>

            {/* In-Feed Sponsored Ad */}
            {inlineAd && inlineAd.ad_link && (
              <Link
                href={inlineAd.ad_link}
                className="bg-muted/50 border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 z-10 bg-background border shadow-sm">
                  {inlineAd.ad_image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={inlineAd.ad_image_url}
                      alt={inlineAd.ad_headline ?? 'Sponsored'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Star className="h-8 w-8 text-secondary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left z-10 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">{inlineAd.ad_eyebrow ?? 'Sponsored'}</span>
                  {inlineAd.ad_headline && <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{inlineAd.ad_headline}</h4>}
                  {inlineAd.ad_description && <p className="text-sm text-muted-foreground line-clamp-2">{inlineAd.ad_description}</p>}
                </div>
                {inlineAd.ad_cta_label && (
                  <span className="shrink-0 z-10 inline-flex items-center justify-center px-4 py-2 bg-background border rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                    {inlineAd.ad_cta_label}
                  </span>
                )}
              </Link>
            )}

            {/* Latest Stories — always visible, 3-col grid */}
            <section>
              <SectionHeader
                title="Latest Stories"
                icon={BookOpen}
                iconColor="primary"
                action={
                  <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                    <Link href="/articles">View All</Link>
                  </Button>
                }
              />
              {articles.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {articles.slice(0, 8).map(a => (
                    <ArticleCard key={a.id} article={a as Parameters<typeof ArticleCard>[0]['article']} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-border bg-muted/20">
                  <p className="text-muted-foreground text-sm mb-3 max-w-sm leading-relaxed">
                    Articles from River Region moms, educators, and community members will appear here as they&apos;re published.
                  </p>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/articles">Browse All Articles</Link>
                  </Button>
                </div>
              )}
            </section>

            {/* Guide discovery strip */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Family Resource Guides
                </h2>
                <Link href="/local-guides" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  View All Guides →
                </Link>
              </div>
              <div className="flex overflow-x-auto gap-2.5 pb-1" style={{ scrollbarWidth: 'none' }}>
                {[
                  { emoji: '🏠', label: 'Family Resource', href: '/family-resource-guide' },
                  { emoji: '⛺', label: 'Summer Camps',    href: '/summer-camp-guide' },
                  { emoji: '🎓', label: 'Private Schools', href: '/private-school-guide' },
                  { emoji: '👶', label: 'Childcare',       href: '/childcare-guide' },
                  { emoji: '🏃', label: 'After-School',    href: '/afterschool-guide' },
                  { emoji: '💪', label: 'Healthy Kids',    href: '/healthy-kids-guide' },
                  { emoji: '🎂', label: 'Birthday Party',  href: '/birthday-party-guide' },
                  { emoji: '⭐', label: 'Special Needs',   href: '/special-needs-guide' },
                ].map(g => (
                  <Link
                    key={g.href}
                    href={g.href}
                    className="shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 bg-card border border-border/50 rounded-xl hover:border-primary/40 hover:shadow-sm hover:bg-primary/5 transition-all w-[100px] text-center"
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-[11px] font-semibold text-foreground leading-tight">{g.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Bottom Ad — bigger image (208×160 desktop) */}
            {(bottomAd && bottomAd.ad_link) ? (
              <Link
                href={bottomAd.ad_link}
                className="bg-gradient-to-r from-secondary/10 to-primary/10 border border-border/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-primary/30 hover:shadow-md transition-all"
              >
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4 right-6">{bottomAd.ad_eyebrow ?? 'Advertisement'}</span>
                {bottomAd.ad_image_url && (
                  <div className="w-full md:w-52 h-40 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bottomAd.ad_image_url}
                      alt={bottomAd.ad_headline ?? 'Advertisement'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="flex-1 text-center md:text-left">
                  {bottomAd.ad_headline && <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{bottomAd.ad_headline}</h3>}
                  {bottomAd.ad_description && <p className="text-muted-foreground">{bottomAd.ad_description}</p>}
                </div>
                {bottomAd.ad_cta_label && (
                  <span className="shrink-0 inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-full text-base font-semibold hover:bg-primary/90 transition-colors">
                    {bottomAd.ad_cta_label}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/advertise"
                className="bg-gradient-to-r from-primary/6 via-secondary/4 to-accent/6 border-2 border-dashed border-primary/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4 right-6">Partner Opportunity</span>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">River Region Parents</p>
                  <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Advertise to Thousands of Local Families
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Homepage feature placements, guide sponsorships, and section takeovers available.
                    First-come, first-served for founding advertisers.
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-base font-bold group-hover:bg-primary/90 transition-colors shadow-md whitespace-nowrap">
                  See Opportunities <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:col-span-4 space-y-8">

            {/* Sidebar Ad — full image with overlay text */}
            {sidebarAd && sidebarAd.ad_image_url && sidebarAd.ad_link ? (
              <Link
                href={sidebarAd.ad_link}
                className="block aspect-square rounded-3xl overflow-hidden relative group cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sidebarAd.ad_image_url}
                  alt={sidebarAd.ad_headline ?? 'Advertisement'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                    {sidebarAd.ad_eyebrow ?? 'Advertisement'}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  {sidebarAd.ad_headline && (
                    <h3 className="text-xl font-bold text-white mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {sidebarAd.ad_headline}
                    </h3>
                  )}
                  {sidebarAd.ad_description && (
                    <p className="text-sm text-white/90 mb-4 line-clamp-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {sidebarAd.ad_description}
                    </p>
                  )}
                  {sidebarAd.ad_cta_label && (
                    <span className="inline-block px-4 py-2 bg-white text-foreground rounded-full text-sm font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {sidebarAd.ad_cta_label}
                    </span>
                  )}
                </div>
              </Link>
            ) : sidebarAd ? (
              <div className="bg-muted aspect-square rounded-3xl border border-border/50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden hover:border-primary/30 transition-colors">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4">{sidebarAd.ad_eyebrow ?? 'Advertisement'}</span>
                <div className="w-20 h-20 bg-background rounded-2xl shadow-sm flex items-center justify-center mb-4 mt-4">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                {sidebarAd.ad_headline && <h3 className="text-xl font-bold mb-2">{sidebarAd.ad_headline}</h3>}
                {sidebarAd.ad_description && <p className="text-sm text-muted-foreground mb-6">{sidebarAd.ad_description}</p>}
                {sidebarAd.ad_cta_label && sidebarAd.ad_link && (
                  <Button asChild className="w-full rounded-full">
                    <Link href={sidebarAd.ad_link}>{sidebarAd.ad_cta_label}</Link>
                  </Button>
                )}
              </div>
            ) : (
              <Link
                href="/advertise"
                className="bg-gradient-to-br from-primary/8 via-background to-secondary/6 aspect-square rounded-3xl border-2 border-dashed border-primary/25 flex flex-col items-center justify-center p-7 text-center relative overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4">Premium Placement</span>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mt-2 group-hover:scale-105 transition-transform">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">Reach River Region Families</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  This premium sidebar placement reaches every River Region Parents visitor. One advertiser. Maximum visibility.
                </p>
                <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold group-hover:bg-primary/90 transition-colors shadow-sm">
                  Claim This Spot <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}

            <IssueSpotlightSidebar
              coverImageUrl={CURRENT_ISSUE_COVER}
              issueLabel={CURRENT_ISSUE_LABEL}
              issueTagline={CURRENT_ISSUE_TAGLINE}
              issuuUrl={CURRENT_ISSUE_URL}
            />

            {/* Mom to Mom column — shows real articles when published, clean CTA when empty */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Mom to Mom
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {momColumns.length > 0 ? (
                  <>
                    <div className="divide-y divide-border/50">
                      {momColumns.map((article) => {
                        const articleSlug = article.slug.replace(/^mom-to-mom-/, '')
                        const dateLabel = article.published_at
                          ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : ''
                        return (
                          <Link
                            key={article.id}
                            href={`/columns/mom-to-mom/${articleSlug}`}
                            className="p-4 hover:bg-muted/50 transition-colors group flex gap-3 items-start"
                          >
                            {article.hero_image_url && (
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-primary/5">
                                <Image
                                  src={article.hero_image_url}
                                  alt={article.title}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  sizes="56px"
                                  unoptimized
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                {article.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {article.author_name && <span className="font-medium">{article.author_name}</span>}
                                {article.author_name && dateLabel && <span> · </span>}
                                {dateLabel}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                    <div className="p-4 border-t border-border/50 bg-muted/10">
                      <Button asChild variant="outline" className="w-full text-sm rounded-full">
                        <Link href="/columns/mom-to-mom">View All Mom to Mom Posts</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-semibold text-sm text-foreground mb-1">Community Columns</p>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      Local mom perspectives, real stories, and family advice — published monthly.
                    </p>
                    <Button asChild variant="outline" size="sm" className="rounded-full w-full">
                      <Link href="/columns/mom-to-mom">Explore the Column</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Spotlight */}
            {businessSpotlight ? (
              <Card className="bg-foreground text-background border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                {businessSpotlight.ad_image_url && (
                  <div className="relative h-32 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={businessSpotlight.ad_image_url}
                      alt={businessSpotlight.ad_headline ?? 'Business Spotlight'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
                  </div>
                )}
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Business Spotlight</span>
                  </div>
                  {businessSpotlight.ad_headline && <CardTitle className="text-xl text-background">{businessSpotlight.ad_headline}</CardTitle>}
                </CardHeader>
                <CardContent className="relative z-10">
                  {businessSpotlight.ad_description && <p className="text-sm text-background/80 mb-4">{businessSpotlight.ad_description}</p>}
                  {businessSpotlight.ad_link && (
                    <Link href={businessSpotlight.ad_link} className="flex items-center text-sm font-medium text-primary cursor-pointer hover:text-primary/80 transition-colors">
                      Read their story <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-foreground text-background border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Business Spotlight</span>
                  </div>
                  <CardTitle className="text-xl text-background">Feature Your Business</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-sm text-background/80 mb-4">The Business Spotlight reaches River Region families who are actively looking for local services.</p>
                  <Link href="/advertise" className="flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    Learn about sponsorship <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Newsletter */}
            <Card className="border-primary/20 bg-primary/5 shadow-none" id="newsletter">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Join the Community
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Get the best local family events and stories delivered weekly.</p>
                <NewsletterSignup variant="inline" source="homepage-sidebar" />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}