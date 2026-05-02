import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CalendarDays, MapPin, Clock, BookOpen, Star, ArrowRight,
  ChevronRight,
} from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 1800

export const metadata: Metadata = {
  title:       'River Region Parents — Local Family Guides & Events',
  description: 'Local guides, community events, and family resources for the River Region. Schools, childcare, camps, health, and more.',
}

const GUIDE_EMOJIS: Record<string, string> = {
  newcomer:       '🏡', 'private-school': '📚', 'summer-camp': '⛺',
  childcare:      '🧸', 'healthy-kids': '🩺', 'summer-fun': '☀️',
  'birthday-party':'🎂', afterschool: '🎨', 'special-needs': '💙',
}

const TRENDING = [
  { emoji: '☀️', label: '2026 Summer Camp Guide is Live', href: '/summer-camp-guide' },
  { emoji: '📖', label: 'May 2026 Digital Issue',          href: '/local-guides' },
  { emoji: '🏆', label: 'Nominate a Teacher of the Month', href: '/local-guides' },
  { emoji: '🎪', label: "Mother's Day Weekend Events",    href: '/calendar' },
  { emoji: '🍎', label: 'School Year Wind-Down Tips',      href: '/newcomer-guide/articles' },
]

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function getData() {
  const supabase = getSupabase()
  const today    = new Date().toISOString().split('T')[0]

  const [guidesRes, eventsRes, articlesRes, featuredRes] = await Promise.all([
    supabase
      .from('guide_types')
      .select('slug, url_slug, display_name, short_description, hero_image_url')
      .not('url_slug', 'is', null)
      .order('display_order', { ascending: true })
      .limit(6),
    supabase
      .from('calendar_events')
      .select('id, slug, title, start_date, start_time, location_name, is_free, category')
      .eq('status', 'published')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(4),
    supabase
      .from('guide_articles')
      .select('id, title, slug, hero_image_url, excerpt, category')
      .eq('editorial_review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('guide_listings')
      .select(`
        id, listing_tier, guide_type_slug,
        advertiser_accounts ( slug, business_name, card_hook, hero_photo_url, city_state_zip ),
        guide_types ( display_name, url_slug )
      `)
      .in('listing_tier', ['featured', 'tier-1-featured-listing'])
      .eq('is_published', true)
      .limit(1),
  ])

  return {
    guides:   guidesRes.data ?? [],
    events:   eventsRes.data ?? [],
    articles: articlesRes.data ?? [],
    featured: featuredRes.data ?? [],
  }
}

export default async function HomePage() {
  const { guides, events, articles, featured } = await getData()
  const featuredOne = featured[0] ?? null
  const fa = featuredOne?.advertiser_accounts as unknown as {
    slug: string; business_name: string; card_hook?: string | null;
    hero_photo_url?: string | null; city_state_zip?: string | null
  } | null
  const fg = featuredOne?.guide_types as unknown as { display_name: string; url_slug: string } | null

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Trending ticker */}
      <div className="bg-primary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80 whitespace-nowrap shrink-0">Trending</span>
            <div className="w-px h-4 bg-white/30 shrink-0" />
            {TRENDING.map((t, i) => (
              <Link key={i} href={t.href}
                className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity shrink-0 whitespace-nowrap">
                <span>{t.emoji}</span>
                <span className="font-medium">{t.label}</span>
                {i < TRENDING.length - 1 && <span className="text-white/40 ml-2">·</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="border-b border-border" style={{ background: 'linear-gradient(135deg, rgba(196,98,45,0.06) 0%, rgba(250,248,245,1) 40%, rgba(44,122,123,0.06) 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-5">May 2026 Issue Now Live</Badge>
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-5">
                Everything for
                <span className="block text-primary">River Region Families.</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                Local guides, community events, and trusted recommendations — built by families who actually live here.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/local-guides">Browse All Guides <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href="/calendar">This Month&apos;s Events</Link>
                </Button>
              </div>
            </div>

            {fa && fg ? (
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-muted">
                  {fa.hero_photo_url ? (
                    <Image src={fa.hero_photo_url} alt={fa.business_name} fill style={{ objectFit: 'cover' }} unoptimized sizes="600px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(196,98,45,0.2) 0%, rgba(44,122,123,0.2) 100%)' }}>
                      <span className="text-6xl font-bold text-primary/30">{fa.business_name[0]}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="accent">Featured Partner</Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{fg.display_name}</p>
                  <h3 className="text-xl font-bold text-foreground mb-2">{fa.business_name}</h3>
                  {fa.card_hook && <p className="text-sm text-muted-foreground mb-4">{fa.card_hook}</p>}
                  <Button asChild size="sm" className="rounded-full">
                    <Link href={`/${fg.url_slug}/listings/${fa.slug}`}>View Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="p-10 text-center" style={{ background: 'linear-gradient(135deg, rgba(196,98,45,0.06) 0%, rgba(44,122,123,0.06) 100%)' }}>
                  <BookOpen className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                  <p className="font-bold text-foreground text-lg mb-2">9 Local Guides</p>
                  <p className="text-sm text-muted-foreground mb-5">Schools, childcare, camps, health, activities & more</p>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/local-guides">Browse Guides</Link>
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {events.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/calendar">View all <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {events.map(ev => (
                <Link key={ev.id} href={`/calendar/events/${ev.slug ?? ev.id}`} className="group block">
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {ev.start_date && (
                          <div className="shrink-0 text-center w-12 bg-muted rounded-lg p-1.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {new Date(ev.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                            </p>
                            <p className="text-xl font-bold text-foreground leading-none">
                              {new Date(ev.start_date + 'T12:00:00').getDate()}
                            </p>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-1">{ev.title}</h4>
                          {ev.start_time && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />{ev.start_time}
                            </p>
                          )}
                          {ev.location_name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{ev.location_name}
                            </p>
                          )}
                          {ev.is_free && <Badge className="mt-1.5 text-[10px] py-0">Free</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Local Guides</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/local-guides">All 9 Guides <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.slice(0, 6).map(g => {
              const emoji   = GUIDE_EMOJIS[g.slug] ?? '📖'
              const urlSlug = g.url_slug ?? g.slug
              return (
                <Link key={g.slug} href={`/${urlSlug}`} className="group block">
                  <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="relative h-36 bg-muted overflow-hidden">
                      {g.hero_image_url ? (
                        <Image src={g.hero_image_url} alt={g.display_name} fill style={{ objectFit: 'cover' }}
                          className="group-hover:scale-105 transition-transform duration-500" sizes="400px" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl"
                          style={{ background: 'linear-gradient(135deg, rgba(196,98,45,0.1) 0%, rgba(44,122,123,0.1) 100%)' }}>
                          {emoji}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-foreground mb-1">{g.display_name}</h3>
                        <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{g.short_description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {articles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-accent fill-accent" />
                <h2 className="text-2xl font-bold text-foreground">Latest Articles</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/newcomer-guide/articles">All Articles <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {articles.map(a => (
                <Link key={a.id} href={`/newcomer-guide/articles/${a.slug}`} className="group block">
                  <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                    {a.hero_image_url && (
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        <Image src={a.hero_image_url} alt={a.title} fill style={{ objectFit: 'cover' }}
                          className="group-hover:scale-105 transition-transform duration-500" sizes="320px" />
                      </div>
                    )}
                    <CardContent className="p-4 flex-1">
                      {a.category && <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{a.category}</p>}
                      <h3 className="font-bold text-sm text-foreground line-clamp-3 leading-snug">{a.title}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <Card className="overflow-hidden bg-primary">
            <CardContent className="p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="text-white">
                  <Badge className="mb-4 bg-white/20 text-white border-white/30">Free Newsletter</Badge>
                  <h2 className="text-3xl font-bold mb-3">Join 2,000+ River Region families</h2>
                  <p className="text-white/80 leading-relaxed">
                    What&apos;s happening this weekend. Which guides are freshly updated. Events worth circling. Every week, free.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 h-11 px-4 rounded-full bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                  />
                  <Link
                    href="/newsletter"
                    className="h-11 px-6 rounded-full font-semibold text-sm whitespace-nowrap bg-white text-primary hover:bg-white/90 transition-colors flex items-center justify-center"
                  >
                    Subscribe Free
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}