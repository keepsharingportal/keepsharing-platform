// Fifty-plus brand homepage. Pure server component — fetches all data,
// assembles the props, and renders the page tree. Embedded inside the
// existing `.fifty-plus-page` wrapper so all Tailwind color tokens
// resolve to the navy/amber palette (see globals.css).
//
// Ports the layout the publisher built in their Vite project (Index.tsx)
// to Next.js. Sections (in order):
//   1. Hero carousel — dynamic greeting slide + editor-picked article slots
//   2. Main column
//      a. Today's Challenges (links into existing /games surface)
//      b. Community Spotlight (Neighbor of the Week — column_slug)
//      c. Local Tails (column_slug='local-tails')
//      d. Latest Updates (featured article + 2-col grid)
//   3. Sidebar
//      a. Current Issue widget (magazine_issues)
//      b. Happening This Week (calendar_events)
//      c. Weekly Poll (anonymous voting)
//      d. Newsletter mini widget (Subscribe Free)

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain, Trophy, Users, MessageCircle, MapPin, CalendarDays, ChevronRight,
} from 'lucide-react'
import { articleHref } from '@/lib/articles/slug'
import { articleBrandFilter, type BrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'
import { FiftyPlusNavigation } from './Navigation'
import { FiftyPlusFooter } from './Footer'
import { FiftyPlusHeroCarousel, type HeroSlide } from './HeroCarousel'
import { FiftyPlusPollWidget, type PollData } from './PollWidget'
import { FiftyPlusNewsletterCardForm } from './NewsletterCardForm'

interface Props {
  brandCtx: BrandContext
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

type FpArticle = {
  id:             string
  title:          string
  slug:           string
  hero_image_url: string | null
  profile_image_url?: string | null
  excerpt:        string | null
  column_slug:    string | null
  author_name:    string | null
  published_at:   string | null
}

type FpEvent = {
  id:             string
  slug:           string | null
  title:          string
  start_date:     string | null
  start_time:     string | null
  location_name:  string | null
  hero_image_url: string | null
}

type FpMagazineIssue = {
  id: string
  label: string
  cover_url: string | null
  issuu_url: string
}

// ── Time-of-day greeting for hero slot 1 ────────────────────────────────
function todayGreeting(regionLabel: string): { eyebrow: string; icon: 'sun' | 'coffee' | 'moon'; ctaLabel: string; ctaIcon: 'coffee' | null } {
  const h = new Date().getHours()
  if (h < 11)  return { eyebrow: `Good Morning, ${regionLabel}!`,   icon: 'coffee', ctaLabel: 'Join the Morning Chat', ctaIcon: 'coffee' }
  if (h < 17)  return { eyebrow: `Good Afternoon, ${regionLabel}!`, icon: 'sun',    ctaLabel: 'See What\'s Happening', ctaIcon: null }
  return { eyebrow: `Good Evening, ${regionLabel}!`, icon: 'moon', ctaLabel: 'Read Tonight\'s Picks', ctaIcon: null }
}

// ── Slide assembly ─────────────────────────────────────────────────────
function buildHeroSlides(
  regionLabel: string,
  heroArticles: FpArticle[],
): HeroSlide[] {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const greeting = todayGreeting(regionLabel)

  const slides: HeroSlide[] = [
    {
      id:                 'slot-1-greeting',
      eyebrow:            greeting.eyebrow,
      eyebrowIcon:        'sun',
      eyebrowStyle:       'amber-on-glass',
      headline:           'Your Daily Local Hub',
      description:        `${today} — local stories, events, and good company.`,
      ctaLabel:           greeting.ctaLabel,
      ctaHref:            '/articles',
      ctaIcon:            greeting.ctaIcon,
      ctaStyle:           'tertiary',
      backgroundImageUrl: heroArticles[0]?.hero_image_url ?? null,
      alt:                regionLabel,
    },
  ]

  for (const a of heroArticles) {
    if (!a) continue
    const colTitle = (a.column_slug ?? '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    slides.push({
      id:                 `slot-${a.id}`,
      eyebrow:            colTitle || 'Featured',
      eyebrowIcon:        'map-pin',
      eyebrowStyle:       'amber-solid',
      headline:           a.title,
      description:        a.excerpt ?? null,
      ctaLabel:           'Read the Story',
      ctaHref:            articleHref(a),
      ctaIcon:            'arrow-right',
      ctaStyle:           'amber',
      backgroundImageUrl: a.hero_image_url,
      alt:                a.title,
    })
  }
  return slides
}

// ── Event date pill ────────────────────────────────────────────────────
function eventDatePill(start: string | null): { label: string } {
  if (!start) return { label: 'TBA' }
  const dt = new Date(start + 'T12:00:00')
  return { label: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() }
}

export async function FiftyPlusHomePage({ brandCtx }: Props) {
  const supabase = getSupabase()
  const chrome   = chromeForBrand(brandCtx.brand)
  const brandFilter = articleBrandFilter(brandCtx.slug)
  const today = new Date().toISOString().split('T')[0]

  // Run all data fetches in parallel. Each one is migration-tolerant —
  // a missing table or column returns empty, and the section degrades
  // to its empty state instead of throwing.
  const [
    heroSlotRowsRes,
    spotlightRes,
    localTailsRes,
    latestRes,
    eventsRes,
    pollRes,
    currentIssueRes,
  ] = await Promise.all([
    // Hero slots 2-4 for this brand. The join walks article_hero_slots
    // and pulls in the article row so we have everything for rendering.
    supabase.from('article_hero_slots')
      .select(`
        slot_number,
        article:guide_articles ( id, title, slug, hero_image_url, excerpt, column_slug, author_name, published_at, published )
      `)
      .eq('brand_slug', brandCtx.slug)
      .order('slot_number'),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, profile_image_url, excerpt, column_slug, author_name, published_at')
      .eq('column_slug', 'neighbor-of-the-week')
      .eq('published', true)
      .or(brandFilter)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, column_slug, author_name, published_at')
      .eq('column_slug', 'local-tails')
      .eq('published', true)
      .or(brandFilter)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, column_slug, author_name, published_at')
      .eq('published', true)
      .or(brandFilter)
      .not('column_slug', 'in', '(neighbor-of-the-week,local-tails)')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase.from('calendar_events')
      .select('id, slug, title, start_date, start_time, location_name, hero_image_url')
      .eq('status', 'published').gte('start_date', today)
      .order('start_date').limit(3),
    // Active weekly poll: brand-scoped first, then all-brands fallback.
    supabase.from('weekly_polls')
      .select('id, question, options, vote_counts, total_votes, closes_at, brand_slug')
      .eq('is_active', true)
      .or(`brand_slug.eq.${brandCtx.slug},brand_slug.is.null`)
      .lte('opens_at', new Date().toISOString())
      .order('opens_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Current digital issue cover for the sidebar widget.
    supabase.from('magazine_issues')
      .select('id, label, cover_url, issuu_url, is_current, issue_month')
      .eq('market', brandCtx.slug)
      .order('is_current', { ascending: false })
      .order('issue_month', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Materialize hero articles in slot order. Skip slots whose article is
  // unpublished / missing (admin should have caught this but we degrade
  // gracefully).
  type HeroRow = { slot_number: number; article: FpArticle & { published?: boolean } | null }
  const heroSlotRows = (heroSlotRowsRes.data ?? []) as unknown as HeroRow[]
  const heroArticles: FpArticle[] = heroSlotRows
    .map(r => r.article)
    .filter((a): a is FpArticle & { published?: boolean } => !!a && a.published !== false)

  const heroSlides = buildHeroSlides(brandCtx.market.regionLabel, heroArticles)

  const spotlight  = (spotlightRes.data  ?? null) as FpArticle | null
  const localTails = (localTailsRes.data ?? null) as FpArticle | null
  const latest     = (latestRes.data     ?? []) as FpArticle[]
  const events     = (eventsRes.data     ?? []) as FpEvent[]
  const poll       = (pollRes.data       ?? null) as (PollData & { brand_slug: string | null }) | null
  const currentIssue = (currentIssueRes.data ?? null) as FpMagazineIssue | null

  // Featured article = first of latest; remaining 6 fill the secondary grid
  const featuredArticle = latest[0] ?? null
  const restLatest      = latest.slice(1, 7)

  const eyebrow = chrome.wordmarkEyebrow ?? brandCtx.market.displayName.split(' ').slice(0, -1).join(' ')
  const accent  = chrome.wordmarkAccent  ?? brandCtx.market.displayName.split(' ').slice(-1)[0]

  return (
    <div className="fifty-plus-page min-h-screen">
      <FiftyPlusNavigation chrome={chrome} displayName={brandCtx.market.displayName} />

      {/* Hero carousel — client component for autoplay */}
      {heroSlides.length > 0 && <FiftyPlusHeroCarousel slides={heroSlides} />}

      {/* Main portal layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT/MAIN COLUMN */}
          <div className="lg:col-span-8 space-y-8">

            {/* Today's Challenges */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
                  <Brain className="w-6 h-6 text-secondary" />
                  Today&rsquo;s Challenges
                </h2>
                <Link href="/games" className="text-sm font-semibold text-primary hover:text-secondary flex items-center">
                  View Leaderboard <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-primary to-primary/90 text-white border-none shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">Daily Trivia</Badge>
                      <Trophy className="w-5 h-5 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{brandCtx.market.regionLabel} History</h3>
                    <p className="text-white/80 text-sm mb-4">Test your knowledge of our local landmarks. 5 questions.</p>
                    <Button asChild className="w-full font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      <Link href="/games/trivia">Play Now</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className="bg-white border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-primary border-primary">Word Puzzle</Badge>
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">Local Scramble</h3>
                    <p className="text-muted-foreground text-sm mb-4">Unscramble the names of popular local spots.</p>
                    <Button asChild className="w-full font-bold">
                      <Link href="/games/scramble">Solve Puzzle</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Community Spotlight — Neighbor of the Week */}
            {spotlight && (
              <section>
                <h2 className="text-2xl font-heading font-bold text-primary mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-secondary" />
                  Community Spotlight
                </h2>
                <Card className="overflow-hidden border-none shadow-md">
                  <div className="md:flex">
                    <div className="md:w-2/5 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={spotlight.hero_image_url ?? spotlight.profile_image_url ?? ''}
                        alt={spotlight.title}
                        className="h-full w-full object-cover aspect-square md:aspect-auto object-top"
                      />
                      <Badge className="absolute top-4 left-4 bg-tertiary text-tertiary-foreground hover:bg-tertiary">Featured</Badge>
                    </div>
                    <div className="p-6 md:w-3/5 flex flex-col justify-center bg-white">
                      <div className="text-sm text-secondary font-bold mb-2 tracking-wide uppercase">Neighbor of the Week</div>
                      <h3 className="text-2xl font-heading font-bold text-primary mb-3">{spotlight.title}</h3>
                      {spotlight.excerpt && (
                        <p className="text-muted-foreground mb-4 font-serif">{spotlight.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 mt-auto">
                        <Button asChild variant="outline">
                          <Link href={articleHref(spotlight)}>Read Interview</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {/* Local Tails */}
            {localTails && (
              <section className="mt-8 mb-8">
                <Card className="overflow-hidden border-none shadow-lg bg-tertiary/10 relative">
                  <div className="md:flex">
                    <div className="p-6 md:p-8 md:w-1/2 flex flex-col justify-center relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-tertiary text-tertiary-foreground w-10 h-10 rounded-full flex items-center justify-center shadow-md font-heading font-bold">LT</div>
                        <h3 className="text-2xl font-heading font-extrabold text-primary uppercase tracking-wider">Local Tails</h3>
                      </div>
                      <h4 className="text-3xl font-serif font-bold text-primary mb-3 leading-tight">{localTails.title}</h4>
                      {localTails.excerpt && (
                        <p className="text-primary/80 mb-6 font-medium">{localTails.excerpt}</p>
                      )}
                      <Button asChild className="w-fit bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6">
                        <Link href={articleHref(localTails)}>Read the Story</Link>
                      </Button>
                    </div>
                    <div className="md:w-1/2 relative min-h-[260px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={localTails.hero_image_url ?? ''}
                        alt={localTails.title}
                        className="absolute inset-0 w-full h-full object-cover rounded-tl-3xl md:rounded-tl-none md:rounded-bl-3xl"
                      />
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {/* Latest Updates */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-heading font-bold text-primary">Latest Updates</h2>
                <Link href="/articles" className="text-sm font-semibold text-primary hover:text-secondary flex items-center">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {featuredArticle && (
                <Link href={articleHref(featuredArticle)} className="group block mb-6">
                  <Card className="overflow-hidden border-none shadow-md cursor-pointer relative rounded-2xl">
                    <div className="aspect-[2/1] md:aspect-[21/9] w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredArticle.hero_image_url ?? ''}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      {featuredArticle.column_slug && (
                        <Badge className="mb-3 bg-secondary text-secondary-foreground hover:bg-secondary border-none font-bold">
                          {featuredArticle.column_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Badge>
                      )}
                      <h3 className="text-2xl md:text-3xl font-heading font-bold text-white leading-tight mb-2">
                        {featuredArticle.title}
                      </h3>
                      {featuredArticle.excerpt && (
                        <p className="text-white/85 line-clamp-2 md:line-clamp-none max-w-2xl mb-2">{featuredArticle.excerpt}</p>
                      )}
                    </div>
                  </Card>
                </Link>
              )}

              {restLatest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {restLatest.map(a => (
                    <Link key={a.id} href={articleHref(a)} className="group block">
                      <Card className="overflow-hidden hover:shadow-md transition-all border-border/50 cursor-pointer flex flex-col h-full">
                        <div className="relative aspect-video overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.hero_image_url ?? ''}
                            alt={a.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {a.column_slug && (
                            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-none">
                              {a.column_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </Badge>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h4 className="font-bold text-lg text-primary leading-tight mb-2 group-hover:text-secondary transition-colors">
                            {a.title}
                          </h4>
                          {a.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{a.excerpt}</p>
                          )}
                          {a.published_at && (
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {latest.length === 0 && (
                <div className="text-center py-12 rounded-2xl bg-muted/40 border border-dashed border-border">
                  <p className="text-muted-foreground font-serif">
                    Fresh stories from the {brandCtx.market.regionLabel} community will land here as they&rsquo;re published.
                  </p>
                </div>
              )}
            </section>

          </div>

          {/* RIGHT COLUMN / SIDEBAR */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Current Issue */}
            {currentIssue && (
              <Card className="border-none shadow-md bg-white overflow-hidden">
                <div className="bg-primary text-primary-foreground p-4 text-center border-b-4 border-secondary">
                  <h3 className="font-heading font-bold text-lg tracking-wide uppercase">Read the Current Issue</h3>
                </div>
                <CardContent className="p-6 flex flex-col items-center bg-muted/10 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full -z-0" />
                  {currentIssue.cover_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={currentIssue.cover_url}
                      alt={currentIssue.label}
                      className="w-full max-w-[220px] h-auto rounded-sm shadow-xl mb-6 relative z-10 border border-border/50"
                    />
                  )}
                  <Button asChild className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                    <a href={currentIssue.issuu_url} target="_blank" rel="noopener noreferrer">View Digital Edition</a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Happening This Week */}
            <Card className="border-none shadow-md bg-white overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-primary to-primary/80 p-4 flex items-end">
                <CardTitle className="text-xl font-heading flex items-center gap-2 text-white">
                  <CalendarDays className="w-5 h-5 text-secondary" />
                  Happening This Week
                </CardTitle>
              </div>
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <p className="font-serif">No events this week — yet.</p>
                    <Link href="/calendar/submit" className="text-primary font-semibold hover:underline mt-2 inline-block">
                      Submit an event →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {events.map(ev => {
                      const pill = eventDatePill(ev.start_date)
                      const href = `/calendar/events/${ev.slug ?? ev.id}`
                      return (
                        <Link key={ev.id} href={href} className="p-4 hover:bg-muted/30 transition-colors group flex gap-4 items-center">
                          {ev.hero_image_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={ev.hero_image_url} alt={ev.title} className="w-16 h-16 rounded-md object-cover flex-shrink-0 shadow-sm" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-secondary mb-1">{pill.label}</div>
                            <h4 className="font-bold text-primary group-hover:text-secondary transition-colors leading-tight mb-1 line-clamp-2">{ev.title}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                              {ev.start_time && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {ev.start_time}</span>}
                              {ev.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location_name}</span>}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 border-t bg-muted/10">
                <Button asChild variant="outline" className="w-full text-sm">
                  <Link href="/calendar">View Full Calendar</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Weekly Poll */}
            {poll && (
              <FiftyPlusPollWidget poll={{
                id:          poll.id,
                question:    poll.question,
                options:     poll.options,
                vote_counts: poll.vote_counts ?? [],
                total_votes: poll.total_votes ?? 0,
                closes_at:   poll.closes_at,
              }} />
            )}

            {/* Newsletter mini widget */}
            <Card id="newsletter" className="border-none shadow-md overflow-hidden relative text-white">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-primary" />
                {heroArticles[0]?.hero_image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={heroArticles[0].hero_image_url} alt="" className="w-full h-full object-cover opacity-30" />
                )}
                <div className="absolute inset-0 bg-primary/85" />
              </div>
              <CardContent className="p-7 text-center relative z-10">
                <div className="flex flex-col items-center justify-center mb-5">
                  <div className="flex flex-col w-fit pb-2 mx-auto">
                    <span className="font-heading text-4xl font-extrabold tracking-tighter leading-none flex items-baseline gap-1">
                      <span className="text-white text-2xl">{eyebrow}</span>
                      <span className="text-secondary">{accent}</span>
                    </span>
                    {chrome.tagline && (
                      <span className="w-full text-left text-[9px] font-serif text-white/90 font-medium tracking-[0.25em] mt-2 uppercase pl-1">
                        {chrome.tagline}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-heading font-bold text-2xl mb-2">Get the Weekly Digest</h3>
                <p className="text-white/90 text-sm mb-5 font-serif">
                  Local news, stories, and trivia delivered Sunday morning.
                </p>
                <FiftyPlusNewsletterCardForm brandSlug={brandCtx.slug} />
              </CardContent>
            </Card>

          </aside>
        </div>
      </div>

      <FiftyPlusFooter chrome={chrome} displayName={brandCtx.market.displayName} regionLabel={brandCtx.market.regionLabel} />
    </div>
  )
}
