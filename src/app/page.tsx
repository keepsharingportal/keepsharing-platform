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
  TrendingUp, CalendarDays, MapPin, Clock, BookOpen, Star,
  ArrowRight, Users, Briefcase, Map,
} from 'lucide-react'
import { getFallback, getFallbackByContext } from '@/lib/image-fallbacks'
import { IssueSpotlightSidebar } from '@/components/homepage/IssueSpotlightSidebar'
import type { Metadata } from 'next'

export const revalidate = 1800

const ISSUU_URL = 'https://issuu.com/keepsharing/docs/river_region_parents_summer_fun_issue_may_2026_'
const MAY_COVER_URL = '/images/issues/may-2026-cover.jpg'

const COLUMN_LABELS: Record<string, string> = {
  'mom-to-mom':           'Mom to Mom',
  'grands-greatest':      'Grands are the Greatest',
  'teacher-of-month':     'Teacher of the Month',
  'meeting-kids':         'Meeting Kids Where They Are',
  'dave-says':            'Dave Says',
  'teens-tweens-screens': 'Teens, Tweens & Screens',
}

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
    summerCampRes,
    spotlightsRes,
    eventsRes,
    articlesRes,
    inlineAdRes,
    sidebarAdRes,
    businessSpotlightRes,
  ] = await Promise.all([
    supabase.from('trending_items').select('*').eq('is_active', true).order('display_order'),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, category, column_slug, author_name')
      .eq('column_slug', 'mom-to-mom')
      .eq('editorial_review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('guide_types')
      .select('slug, url_slug, display_name, hero_image_url, pitch')
      .eq('slug', 'summer-camp').maybeSingle(),
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
  ])

  return {
    trending:          trendingRes.data ?? [],
    mainFeature:       mainFeatureRes.data ?? null,
    summerCamp:        summerCampRes.data ?? null,
    spotlights:        spotlightsRes.data ?? [],
    events:            eventsRes.data ?? [],
    articles:          articlesRes.data ?? [],
    inlineAd:          inlineAdRes.data ?? null,
    sidebarAd:         sidebarAdRes.data ?? null,
    businessSpotlight: businessSpotlightRes.data ?? null,
  }
}

function fmtDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }),
    day:   dt.getDate(),
    full:  dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  }
}


export default async function HomePage() {
  const { trending, mainFeature, summerCamp, spotlights, events, articles, inlineAd, sidebarAd, businessSpotlight } = await getHomepageData()

  const fallbackTrending = [
    { id: '1', label: '2026 Summer Camp Guide is Live',     href: '/summer-camp-guide',  emoji: '⛺' },
    { id: '2', label: 'May 2026 Digital Issue',              href: '/local-guides',        emoji: '📖' },
    { id: '3', label: 'Nominate a Teacher of the Month',    href: '/local-guides',        emoji: '🏆' },
    { id: '4', label: "Mother's Day Weekend Events",         href: '/calendar',            emoji: '🌸' },
  ]
  const trendingItems = trending.length > 0 ? trending : fallbackTrending

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Trending ticker — bg-primary/10 (light peach, NOT solid) ── */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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

      {/* ── Top featured area — 12-col grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Main feature — full-bleed photo with overlay (lg:col-span-8) */}
          <div className="lg:col-span-8">
            <div className="relative rounded-3xl overflow-hidden min-h-[320px] lg:min-h-[500px] bg-foreground/10">
              <Image
                src={mainFeature?.hero_image_url || getFallbackByContext('parenting', mainFeature?.slug ?? 'mom-to-mom')}
                alt={mainFeature?.title ?? 'Mom to Mom'}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
                sizes="900px"
                priority
              />
              {/* Gradient overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Mom-to-Mom badge — top left */}
              <div className="absolute top-4 left-4">
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs font-bold">
                  Mom to Mom
                </Badge>
              </div>

              {/* Content — bottom left */}
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                {mainFeature ? (
                  <>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
                      {mainFeature.category ?? 'Featured Story'}
                    </p>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-2">
                      {mainFeature.title}
                    </h2>
                    {mainFeature.excerpt && (
                      <p className="text-white/80 text-sm leading-relaxed mb-4 max-w-lg line-clamp-2">
                        {mainFeature.excerpt}
                      </p>
                    )}
                    <Button asChild size="sm" className="rounded-full bg-white text-foreground hover:bg-white/90">
                      <Link href={`/columns/mom-to-mom/${mainFeature.slug.replace(/^mom-to-mom-/, '')}`}>
                        Read Story <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 mb-3">
                      Mom to Mom interviews coming soon
                    </Badge>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-2">
                      Real stories from River Region moms
                    </h2>
                    <p className="text-white/80 text-sm mb-4">
                      Subscribe to get notified when our first interview publishes.
                    </p>
                    <Button asChild size="sm" className="rounded-full bg-white text-foreground hover:bg-white/90">
                      <Link href="#newsletter">Subscribe</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Side features — stacked (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Summer Camp Guide card */}
            <div className="relative rounded-3xl overflow-hidden h-[200px] lg:h-[240px] bg-secondary/20 flex-shrink-0">
              <Image
                src={summerCamp?.hero_image_url || getFallbackByContext('summer-camp', 'summer-camp-guide')}
                alt={summerCamp?.display_name ?? 'Summer Camp Guide'}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
                sizes="400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-4 left-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,168,67,0.9)' }}>
                  <Map className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white font-bold text-lg leading-tight mb-1">
                  {summerCamp?.display_name ?? '2026 Summer Camp Guide'}
                </h3>
                <p className="text-white/70 text-xs mb-3 line-clamp-1">
                  {summerCamp?.pitch ?? 'Find the perfect summer camp for your child.'}
                </p>
                <Link
                  href={`/${summerCamp?.url_slug ?? 'summer-camp-guide'}`}
                  className="text-white text-xs font-bold hover:text-accent transition-colors flex items-center gap-1"
                >
                  Explore Guide <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Community Spotlights card */}
            <Card className="flex-1 rounded-3xl border overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Community Spotlights
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {spotlights.length > 0 ? spotlights.map((sp) => {
                  const tint = sp.spotlight_type === 'teacher'       ? 'border-primary/20'
                             : sp.spotlight_type === 'student'       ? 'border-secondary/20'
                             : sp.spotlight_type === 'grands'        ? 'border-accent/30'
                             : 'border-primary/20'
                  const labelTint = sp.spotlight_type === 'teacher'  ? 'text-primary border-primary/30'
                                  : sp.spotlight_type === 'student'  ? 'text-secondary border-secondary/30'
                                  : sp.spotlight_type === 'grands'   ? 'text-foreground border-accent/40 bg-accent/10'
                                  : 'text-primary border-primary/30'
                  const labelText = sp.spotlight_type === 'teacher'  ? 'Teacher of the Month'
                                  : sp.spotlight_type === 'student'  ? 'Student Spotlight'
                                  : sp.spotlight_type === 'grands'   ? 'Grands are the Greatest'
                                  : 'Community Spotlight'
                  const avatarSrc = sp.hero_image_url || getFallback(
                    sp.spotlight_type === 'grands'  ? 'person_grandparent'
                      : sp.spotlight_type === 'student' ? 'person_kid'
                      : 'person_woman',
                    sp.id,
                  )
                  return (
                    <div key={sp.id} className="flex items-center gap-4 group cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarSrc}
                        alt={sp.honoree_name}
                        className={`w-16 h-16 rounded-full object-cover group-hover:scale-105 transition-transform border-2 shrink-0 ${tint}`}
                      />
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className={`text-[10px] mb-1 ${labelTint}`}>{labelText}</Badge>
                        <h3 className="font-bold text-sm leading-none mb-1 truncate">{sp.honoree_name}</h3>
                        {sp.honoree_context && (
                          <p className="text-xs text-muted-foreground truncate">{sp.honoree_context}</p>
                        )}
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-muted-foreground py-2">Spotlights coming soon.</p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full rounded-full mt-2">
                  <Link href="/local-guides">Nominate Someone</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Portal two-column layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main content column (lg:col-span-8) ── */}
          <div className="lg:col-span-8 space-y-10">

            {/* Upcoming Events */}
            {events.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Upcoming Events
                  </h2>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/calendar">Full Calendar <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                </div>
                <div className="space-y-3">
                  {events.map((ev, i) => {
                    const dt = ev.start_date ? fmtDate(ev.start_date) : null
                    const isFirst = i === 0
                    return (
                      <Link
                        key={ev.id}
                        href={`/calendar/events/${ev.slug ?? ev.id}`}
                        className="group block"
                      >
                        <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-shadow hover:shadow-sm ${isFirst ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                          {/* Date stamp box */}
                          {dt && (
                            <div className="shrink-0 h-20 w-20 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-center">
                              <p className="text-xs font-bold uppercase tracking-wider text-primary">{dt.month}</p>
                              <p className="text-3xl font-bold text-foreground leading-none">{dt.day}</p>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {isFirst && (
                              <Badge className="mb-2 bg-primary text-primary-foreground text-xs">Featured Event</Badge>
                            )}
                            <h4 className="font-bold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors">
                              {ev.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {ev.start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />{ev.start_time}
                                </span>
                              )}
                              {ev.location_name && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{ev.location_name}
                                </span>
                              )}
                              {ev.is_free && (
                                <Badge className="text-[10px] py-0">Free</Badge>
                              )}
                            </div>
                          </div>
                          {/* Thumbnail — always shown with Unsplash fallback */}
                          <div className="hidden sm:block shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ev.hero_image_url || getFallbackByContext(ev.category, ev.slug ?? ev.id)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* In-Feed Ad Spot */}
            {inlineAd && (
              <div className="relative bg-muted/50 border border-border rounded-2xl p-6 overflow-hidden">
                {/* Decorative blur */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-card rounded-xl flex items-center justify-center shadow-sm">
                    <Star className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sponsored</p>
                    {inlineAd.ad_headline && (
                      <h3 className="font-bold text-foreground mb-1">{inlineAd.ad_headline}</h3>
                    )}
                    {inlineAd.ad_description && (
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{inlineAd.ad_description}</p>
                    )}
                    {inlineAd.ad_cta_label && inlineAd.ad_link && (
                      <Button asChild size="sm" className="rounded-full">
                        <Link href={inlineAd.ad_link}>{inlineAd.ad_cta_label}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Parenting & Lifestyle — 2×2 article grid */}
            {articles.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5 border-b pb-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Parenting &amp; Lifestyle
                  </h2>
                  <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                    <Link href="/articles">View All</Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Dedupe by column_slug so each column appears at most once */}
                  {(() => {
                    const seen = new Set<string>()
                    return articles.filter(a => {
                      const cs = (a as { column_slug?: string | null }).column_slug
                      const key = cs ?? a.id
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    }).slice(0, 4)
                  })().map(a => {
                    const cs = (a as { column_slug?: string | null }).column_slug
                    const gs = (a as { guide_slug?: string | null }).guide_slug
                    const articleUrl = cs
                      ? `/columns/${cs}/${a.slug.replace(new RegExp(`^${cs}-`), '')}`
                      : `/articles/${a.slug}`
                    const categoryLabel = cs
                      ? (COLUMN_LABELS[cs] ?? cs)
                      : (gs ?? 'Feature')
                    return (
                      <Link key={a.id} href={articleUrl} className="group flex flex-col gap-3 cursor-pointer">
                        <div className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-muted">
                          <Image
                            src={a.hero_image_url || getFallbackByContext(cs ?? gs ?? 'parenting', a.slug ?? a.id)}
                            alt={a.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="group-hover:scale-105 transition-transform duration-500"
                            sizes="400px"
                            unoptimized
                          />
                          <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur text-xs">
                              {categoryLabel}
                            </Badge>
                          </div>
                        </div>
                        <h3 className="font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {a.title}
                        </h3>
                        {a.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
                        )}
                        {(a as { author_name?: string | null }).author_name && (
                          <p className="text-xs text-muted-foreground font-medium">
                            By {(a as { author_name?: string | null }).author_name}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar (lg:col-span-4) ── */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20 lg:self-start">

            {/* Sidebar Ad — aspect-square rounded-3xl */}
            {sidebarAd ? (
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-secondary/10 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Advertisement</p>
                  <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center shadow-sm mb-4">
                    <BookOpen className="h-6 w-6 text-secondary" />
                  </div>
                  {sidebarAd.ad_headline && (
                    <h3 className="font-bold text-foreground mb-2 leading-tight">{sidebarAd.ad_headline}</h3>
                  )}
                  {sidebarAd.ad_description && (
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{sidebarAd.ad_description}</p>
                  )}
                  {sidebarAd.ad_cta_label && sidebarAd.ad_link && (
                    <Button asChild className="w-full rounded-full">
                      <Link href={sidebarAd.ad_link}>{sidebarAd.ad_cta_label}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-3xl bg-secondary/10 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Advertisement</p>
                <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center shadow-sm mb-4">
                  <BookOpen className="h-6 w-6 text-secondary" />
                </div>
                <p className="font-bold text-foreground mb-2">Your Ad Here</p>
                <p className="text-sm text-muted-foreground mb-4">Reach River Region families every week.</p>
                <Button asChild className="w-full rounded-full">
                  <Link href="/advertise">Learn More</Link>
                </Button>
              </div>
            )}

            {/* This Month's Issue — sidebar spotlight */}
            <IssueSpotlightSidebar
              coverImageUrl={MAY_COVER_URL}
              issueLabel="May 2026 Issue"
              issueTagline="Summer Fun Issue: 100+ camps, day trips, and adventures"
              issuuUrl={ISSUU_URL}
            />

            {/* Business Spotlight — dark card */}
            {businessSpotlight ? (
              <div className="relative bg-foreground text-background rounded-3xl p-5 overflow-hidden">
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Business Spotlight</p>
                  </div>
                  {businessSpotlight.ad_headline && (
                    <h3 className="font-bold text-lg text-background mb-1">{businessSpotlight.ad_headline}</h3>
                  )}
                  {businessSpotlight.ad_description && (
                    <p className="text-sm text-background/70 leading-relaxed mb-4">{businessSpotlight.ad_description}</p>
                  )}
                  {businessSpotlight.ad_link && (
                    <Link
                      href={businessSpotlight.ad_link}
                      className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      Read their story <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative bg-foreground text-background rounded-3xl p-5 overflow-hidden">
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Business Spotlight</p>
                  </div>
                  <h3 className="font-bold text-lg text-background mb-1">Feature Your Business</h3>
                  <p className="text-sm text-background/70 leading-relaxed mb-4">
                    The Business Spotlight reaches River Region families who are actively looking for local services.
                  </p>
                  <Link href="/advertise" className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors flex items-center gap-1">
                    Learn about sponsorship <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Newsletter Signup — sidebar variant */}
            <div id="newsletter">
              <NewsletterSignup variant="sidebar" source="homepage-sidebar" />
            </div>
          </aside>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
