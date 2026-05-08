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
import { IssueSpotlightSidebar } from '@/components/homepage/IssueSpotlightSidebar'
import { ArticleCard, SectionHeader } from '@/components/theme'
import type { Metadata } from 'next'

export const revalidate = 1800

const ISSUU_URL = 'https://issuu.com/keepsharing/docs/river_region_parents_summer_fun_issue_may_2026_'
const MAY_COVER_URL = '/images/issues/may-2026-cover.jpg'

const MOM_BLOGGERS = [
  { name: 'Jessica T.', title: 'Surviving the Summer Slide', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop' },
  { name: 'Amanda R.',  title: '5 Easy Weeknight Meals',     avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop' },
  { name: 'Chloe M.',   title: 'Crafts for Rainy Afternoons', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80&auto=format&fit=crop' },
  { name: 'Sarah J.',   title: 'Balancing Work and Play',     avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80&auto=format&fit=crop' },
]

const FEATURED_CATEGORIES = [
  { title: 'Moms Know Best',        desc: 'Local mom bloggers share it all',       href: '/columns/mom-to-mom',     image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80&auto=format&fit=crop' },
  { title: 'Student Spotlights',    desc: 'Celebrating local youth',                href: '/local-guides',           image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&auto=format&fit=crop' },
  { title: 'Family Resource Guide', desc: 'Support, health & services',             href: '/family-resource-guide',  image: 'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=800&q=80&auto=format&fit=crop' },
  { title: 'Business Spotlights',   desc: 'Parent Picks & local favorites',         href: '/local-guides',           image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop' },
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
    featuredGuideRes,
    spotlightsRes,
    eventsRes,
    articlesRes,
    inlineAdRes,
    sidebarAdRes,
    businessSpotlightRes,
    bottomAdRes,
  ] = await Promise.all([
    supabase.from('trending_items').select('*').eq('is_active', true).order('display_order'),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, column_slug, author_name')
      .eq('column_slug', 'mom-to-mom')
      .eq('editorial_review_status', 'approved')
      .order('created_at', { ascending: false })
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
      .order('start_date').limit(3),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, guide_slug, column_slug, author_name, created_at')
      .eq('editorial_review_status', 'approved')
      .or('column_slug.neq.mom-to-mom,column_slug.is.null')
      .order('created_at', { ascending: false }).limit(8),
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
  ])

  const guidesData = featuredGuideRes.data ?? []
  const featuredGuide = guidesData.find(g => g.slug === 'summer-fun') ?? guidesData[0] ?? null

  return {
    trending:          trendingRes.data ?? [],
    mainFeature:       mainFeatureRes.data ?? null,
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
    inlineAd, sidebarAd, businessSpotlight, bottomAd,
  } = await getHomepageData()

  const fallbackTrending = [
    { id: '1', label: '2026 Summer Camp Guide is Live',     href: '/summer-camp-guide',  emoji: '⛺' },
    { id: '2', label: 'May 2026 Digital Issue',              href: '/local-guides',        emoji: '📖' },
    { id: '3', label: 'Nominate a Teacher of the Month',    href: '/nominate',            emoji: '🏆' },
    { id: '4', label: "Mother's Day Weekend Events",         href: '/calendar',            emoji: '🌸' },
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

      <main className="container py-8 space-y-12">

        {/* Top Featured Area */}
        <section className="grid lg:grid-cols-12 gap-6">
          {/* Mom-to-Mom main feature */}
          <div className="lg:col-span-8">
            {mainFeature ? (
              <Link
                href={`/columns/mom-to-mom/${mainFeature.slug.replace(/^mom-to-mom-/, '')}`}
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
                  <Badge className="bg-primary text-primary-foreground border-none mb-4 font-semibold">Mom to Mom</Badge>
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
                    <div key={sp.id} className={`flex items-center gap-5 group cursor-pointer p-4 rounded-2xl border transition-all ${cardBg}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarSrc}
                        alt={sp.honoree_name}
                        className="w-24 h-24 rounded-full object-cover group-hover:scale-105 transition-transform border-4 border-background shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${labelClasses}`}>
                          {labelText}
                        </Badge>
                        <h3 className={`font-bold text-2xl leading-tight mb-1 text-foreground transition-colors ${hoverColor}`}>
                          {sp.honoree_name}
                        </h3>
                        {sp.honoree_context && (
                          <p className="text-sm text-muted-foreground font-medium">{sp.honoree_context}</p>
                        )}
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-muted-foreground py-2">Spotlights coming soon.</p>
                )}
              </div>
              <Button asChild className="w-full rounded-full mt-4">
                <Link href="/nominate">Nominate Someone</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
          {FEATURED_CATEGORIES.map((cat) => (
            <Link href={cat.href} key={cat.title} className="group flex flex-col gap-3">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-border/50">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">{cat.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* Two-column portal */}
        <div className="grid lg:grid-cols-12 gap-10">

          {/* MAIN CONTENT */}
          <div className="lg:col-span-8 space-y-12">

            {/* Happening Around Town */}
            {events.length > 0 && (
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
                <div className="grid gap-4">
                  {events.map((ev, i) => {
                    const date = ev.start_date ? fmtEventDate(ev.start_date) : null
                    const featured = i === 0
                    return (
                      <Link
                        key={ev.id}
                        href={`/calendar/events/${ev.slug ?? ev.id}`}
                        className={`flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all bg-card ${featured ? 'bg-primary/5 border-primary/20' : ''}`}
                      >
                        {date && (
                          <div className="h-20 w-20 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary uppercase">{date.month}</span>
                            <span className="text-2xl font-bold text-foreground">{date.day}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {featured && <Badge className="mb-2 bg-primary text-primary-foreground">Featured Event</Badge>}
                          <h4 className="font-semibold text-lg text-foreground">{ev.title}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                            {ev.start_time && (
                              <span className="flex items-center gap-1">
                                <span className="h-4 w-4 inline-flex items-center justify-center text-primary/70">🕐</span>
                                {ev.start_time}
                              </span>
                            )}
                            {ev.location_name && (
                              <span className="flex items-center gap-1">
                                <span className="h-4 w-4 inline-flex items-center justify-center text-primary/70">📍</span>
                                {ev.location_name}
                              </span>
                            )}
                            {ev.is_free && <Badge className="bg-primary text-primary-foreground text-xs">Free</Badge>}
                          </div>
                        </div>
                        {(ev.hero_image_url || ev.category) && (
                          <div className="hidden sm:block h-20 w-32 rounded-lg overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ev.hero_image_url || getFallbackByContext(ev.category, ev.slug ?? ev.id)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* In-Feed Sponsored Ad */}
            {inlineAd && (
              <Link
                href={inlineAd.ad_link ?? '#'}
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

            {/* Parenting & Lifestyle */}
            {articles.length > 0 && (
              <section>
                <SectionHeader
                  title="Parenting & Lifestyle"
                  icon={BookOpen}
                  iconColor="primary"
                  action={
                    <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                      <Link href="/articles">View All</Link>
                    </Button>
                  }
                />
                <div className="grid sm:grid-cols-2 gap-6">
                  {(() => {
                    const seen = new Set<string>()
                    return articles.filter(a => {
                      const cs = (a as { column_slug?: string | null }).column_slug
                      const key = cs ?? a.id
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    }).slice(0, 6)
                  })().map(a => (
                    <ArticleCard key={a.id} article={a as Parameters<typeof ArticleCard>[0]['article']} />
                  ))}
                </div>
              </section>
            )}

            {/* Bottom Ad — bigger image (208×160 desktop) */}
            {bottomAd ? (
              <Link
                href={bottomAd.ad_link ?? '#'}
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
              <div className="bg-gradient-to-r from-secondary/10 to-primary/10 border border-border/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden hover:border-primary/30 transition-colors">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4 right-6">Advertisement</span>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Reach River Region Families</h3>
                  <p className="text-muted-foreground">Partner with us to put your business in front of thousands of local families every week.</p>
                </div>
                <Button asChild size="lg" className="shrink-0 rounded-full">
                  <Link href="/advertise">Learn More</Link>
                </Button>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:col-span-4 space-y-8">

            {/* Sidebar Ad — full image with overlay text */}
            {sidebarAd && sidebarAd.ad_image_url ? (
              <Link
                href={sidebarAd.ad_link ?? '#'}
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
              <div className="bg-muted aspect-square rounded-3xl border border-border/50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden hover:border-primary/30 transition-colors">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4">Advertisement</span>
                <div className="w-20 h-20 bg-background rounded-2xl shadow-sm flex items-center justify-center mb-4 mt-4">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Your Ad Here</h3>
                <p className="text-sm text-muted-foreground mb-6">Reach River Region families every week.</p>
                <Button asChild className="w-full rounded-full">
                  <Link href="/advertise">Learn More</Link>
                </Button>
              </div>
            )}

            <IssueSpotlightSidebar
              coverImageUrl={MAY_COVER_URL}
              issueLabel="May 2026 Issue"
              issueTagline="Summer Fun Issue: 100+ camps, day trips, and adventures"
              issuuUrl={ISSUU_URL}
            />

            {/* Moms Know Best */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                  <Users className="h-5 w-5 text-primary" />
                  Moms Know Best
                  <span className="text-sm font-normal text-muted-foreground">(Community Blogger Team)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {MOM_BLOGGERS.map((blogger, i) => (
                    <div key={i} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex gap-4 items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={blogger.avatar}
                          alt={blogger.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 group-hover:scale-105 transition-transform shrink-0"
                        />
                        <div>
                          <h4 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">{blogger.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">by {blogger.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border/50 bg-muted/10">
                  <Button asChild variant="outline" className="w-full text-sm rounded-full">
                    <Link href="/columns/mom-to-mom">Read More Posts</Link>
                  </Button>
                </div>
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