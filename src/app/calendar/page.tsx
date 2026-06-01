import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { SplitColoredTitle } from '@/components/verticals/SplitColoredTitle'
import { HeroSponsorCard, type HeroSponsor } from '@/components/verticals/HeroSponsorCard'
import { getActiveAds, type ActiveAd } from '@/lib/get-active-ads'
import { expandRecurrences, type ExpandableEvent } from '@/lib/calendar/expand-recurrences'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'Family Calendar | River Region Parents',
  description: 'Events, festivals, workshops, and activities for River Region families — updated weekly.',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function CalendarPage() {
  const supabase = getSupabase()
  const today    = new Date().toISOString().split('T')[0]
  const monthEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Probe rich columns first; if migration 077 isn't applied yet, fall back
  // to the legacy set so the page still renders.
  const richCols = 'id, slug, title, start_date, end_date, start_time, end_time, location_name, address, is_free, cost_text, description, category, hero_image_url, is_featured, organizer_name, recurrence_rule'
  const baseCols = 'id, slug, title, start_date, end_date, start_time, end_time, location_name, address, is_free, cost_text, description, category, hero_image_url'

  // Type erasure here is intentional — the rich vs base column selectors
  // produce different inferred row shapes, but CalendarClient's CalEvent
  // type marks every event field as optional so either is structurally fine.
  // The row type extends ExpandableEvent so the expansion helper preserves
  // every column when it builds virtual occurrences.
  type CalRow = ExpandableEvent & {
    id:               string
    slug?:            string | null
    title:            string
    end_date?:        string | null
    end_time?:        string | null
    location_name?:   string | null
    address?:         string | null
    is_free?:         boolean | null
    cost_text?:       string | null
    description?:     string | null
    category?:        string | null
    hero_image_url?:  string | null
    is_featured?:     boolean | null
    organizer_name?:  string | null
  }
  let data: CalRow[] | null = null

  // In-window query + a separate fetch for recurring rows whose template
  // start_date sits BEFORE the window (their occurrences can still fall
  // inside). expandRecurrences merges and turns recurring rows into
  // virtual one-off rows for [today, monthEnd].
  const [rich, recurringPast] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(richCols)
      .eq('status', 'published')
      .gte('start_date', today)
      .lte('start_date', monthEnd)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(100),
    supabase
      .from('calendar_events')
      .select(richCols)
      .eq('status', 'published')
      .not('recurrence_rule', 'is', null)
      .lt('start_date', today)
      .limit(200),
  ])

  if (rich.error && /column .* does not exist/i.test(rich.error.message ?? '')) {
    // Pre-077 schema (no recurrence_rule column yet). Fall back to the
    // base column set and skip the recurring-past union.
    const base = await supabase
      .from('calendar_events')
      .select(baseCols)
      .eq('status', 'published')
      .gte('start_date', today)
      .lte('start_date', monthEnd)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(50)
    data = (base.data ?? null) as CalRow[] | null
  } else {
    data = [
      ...((rich.data          ?? []) as unknown as CalRow[]),
      ...((recurringPast.data ?? []) as unknown as CalRow[]),
    ]
  }

  // Expand recurring templates into virtual occurrences in the window,
  // then cap at 50 for the initial server-rendered list (the calendar
  // client paginates the rest).
  const expanded = data
    ? expandRecurrences<CalRow>(
        data,
        new Date(`${today}T00:00:00Z`),
        new Date(`${monthEnd}T23:59:59Z`),
      )
    : []
  const initialEvents = expanded.slice(0, 50)

  // ── Ad lookups (all use the existing ad_placements system) ──────────────
  // Hero sponsor: uses the shared 'section_sponsor' placement with
  // context_slug='calendar' — same pattern School Zone / Mom Knows Best use.
  // Banner + inline ads: use the calendar-specific placement types.
  const [heroAds, bannerAds, inlineAds] = await Promise.all([
    getActiveAds('section_sponsor',           'calendar', 1),
    getActiveAds('calendar_featured_event',   'calendar', 2),
    getActiveAds('calendar_inline_promotion', 'calendar', 4),
  ])

  // Transform hero ad into the HeroSponsorCard shape
  const heroSponsor: HeroSponsor | null = heroAds[0]?.advertiser_name
    ? {
        businessName: heroAds[0].advertiser_name,
        slug:         heroAds[0].advertiser_slug ?? null,
        headline:     heroAds[0].ad_headline ?? null,
        placementId:  heroAds[0].id,
      }
    : null

  // Split banners: first = top, second = bottom
  const topBannerAd:    ActiveAd | null = bannerAds[0] ?? null
  const bottomBannerAd: ActiveAd | null = bannerAds[1] ?? null

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Photo hero — matches the School Zone / Mom Knows Best / Brain Games
          hero pattern: full-width background image, centered text overlay,
          eyebrow badge, big two-tone title, subtitle, and a sponsor card at
          the bottom so the calendar reads as part of the same magazine, not a
          utility page someone bolted on. ────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80&auto=format&fit=crop"
            alt="Family Calendar"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
            sizes="100vw"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/35 to-black/20" />
        </div>

        <div className="relative container py-14 md:py-20 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-1.5 rounded-full mb-5 shadow-sm">
            <CalendarIcon className="h-3.5 w-3.5" />
            Community Calendar
          </div>

          {/* Two-tone title — "Family" white, "Calendar" coral */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-4 drop-shadow-sm">
            <SplitColoredTitle title="Family Calendar" />
          </h1>
          <p className="text-base md:text-lg text-white/90 leading-snug max-w-2xl mx-auto mb-10 md:mb-12">
            Local Events, Festivals, and Activities for River Region Families — Updated Weekly.
          </p>

          {/* Sponsor card — reads from ad_placements via getActiveAds, same
              system School Zone + Mom Knows Best use. When no sponsor is
              booked, renders the "Your Business Here" placeholder. */}
          <HeroSponsorCard
            sponsor={heroSponsor}
            sponsorLabel="Proudly Presented By"
            verticalSlug="calendar"
            placeholderName="Your Business Here"
            placeholderTagline="Own the Family Calendar for a Year — Your Business Anchors Every Page River Region Families Check for Weekend Plans."
            placeholderCtaLabel="Claim This Spot"
          />
        </div>
      </div>

      {/* SSR event list for crawlers — visible without JavaScript */}
      <noscript>
        <ul className="container py-8 space-y-4 list-none">
          {initialEvents.map(ev => (
            <li key={ev.id} className="border-b pb-4">
              <a href={`/calendar/events/${ev.slug ?? ev.id}`} className="font-bold text-foreground">
                {ev.title}
              </a>
              {ev.start_date && (
                <span className="ml-2 text-sm text-muted-foreground">
                  — {new Date(ev.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              )}
              {ev.location_name && (
                <span className="ml-2 text-sm text-muted-foreground">at {ev.location_name}</span>
              )}
            </li>
          ))}
        </ul>
      </noscript>

      {/* Client component: filters + interactive view. Starts with SSR-provided events.
          CalEvent on the client uses `boolean | undefined` for is_free/is_featured;
          DB rows come back as `boolean | null`. The cast is structurally safe — the
          client treats both null and undefined the same way at the render boundary. */}
      <CalendarClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialEvents={initialEvents as any}
        topBannerAd={topBannerAd}
        bottomBannerAd={bottomBannerAd}
        inlineAds={inlineAds}
      />

      <PublicFooter />
    </div>
  )
}
