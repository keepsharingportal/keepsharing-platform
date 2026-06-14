// Event detail page — public-facing.
//
// Layout matches the River Region Parents calendar mockup:
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ Hero with title overlay + category chip + featured badge           │
//   ├──────────────────────────────────────────┬─────────────────────────┤
//   │ [Date]  [Time]  [Cost]                   │ Attend This Event       │
//   │                                          │ ┌─────────────────────┐ │
//   │ About This Event                         │ │ Sponsor slot        │ │
//   │   Long-form description                  │ ├─────────────────────┤
//   │                                          │ │ Submit Your Event   │ │
//   │ Location                                 │ ├─────────────────────┤
//   │   Address + Google Maps embed            │ │ Subscribe (newsletter)│
//   │                                          │ ├─────────────────────┤
//   │ Event Organizer                          │ │ Sponsor slot 2      │ │
//   │   Name + contact + website               │ └─────────────────────┘ │
//   │                                          │                         │
//   │ More Happening Around Town               │                         │
//   │   3 related EventCards                   │                         │
//   └──────────────────────────────────────────┴─────────────────────────┘
//
// Color/font choices use brand tokens so this looks consistent with the
// rest of the site — coral for primary CTAs and dates, gold for hover,
// sage for the "Free" chip, navy text on cream backgrounds. The right
// rail is sticky on desktop so the Attend This Event panel stays visible
// while a reader scrolls through About + Location + Organizer.

import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EventCard } from '@/components/theme'
import { categoryLabel } from '@/lib/calendar-taxonomy'
import { shouldSkipNextOptimizer } from '@/lib/images'
import {
  ArrowLeft, Calendar, Clock, MapPin, Mail, Phone, Globe, ExternalLink,
  Heart, Share2, Star, Sparkles, Send,
} from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 1800

interface Props {
  params: Promise<{ slug: string }>
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function loadEventByParam<T>(
  supabase: ReturnType<typeof getSupabase>,
  param: string,
  cols: string,
): Promise<T | null> {
  // Slug lookup is the common case
  const bySlug = await supabase
    .from('calendar_events')
    .select(cols)
    .eq('slug', param)
    .maybeSingle()
  if (bySlug.data) return bySlug.data as unknown as T
  // Fall back to id only if it actually looks like a UUID
  if (!UUID_RE.test(param)) return null
  const byId = await supabase
    .from('calendar_events')
    .select(cols)
    .eq('id', param)
    .maybeSingle()
  return (byId.data ?? null) as unknown as T | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await loadEventByParam<{
    title: string; description: string | null; hero_image_url: string | null;
  }>(
    getSupabase(),
    slug,
    'title, description, hero_image_url',
  )
  if (!data) return { title: 'Event Not Found' }
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       data.title,
    description: data.description?.slice(0, 200) ?? `Family event in the River Region — ${data.title}.`,
    path:        `/calendar/events/${slug}`,
    image:       data.hero_image_url,
    type:        'article',
  })
}

function fmtLongDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}
function fmtShortDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}
function fmtTime(t: string | null | undefined): string | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEvent = any

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabase()

  const ev = await loadEventByParam<AnyEvent>(supabase, slug, '*')
  if (!ev || ev.status === 'cancelled' || ev.status === 'archived') notFound()

  const today = new Date().toISOString().split('T')[0]

  // Related events — prefer same-category upcoming; fall back to next coming
  // up if there aren't enough peers in the same bucket.
  let { data: related } = await supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, end_date, start_time, end_time, location_name, category, hero_image_url, is_free, is_featured')
    .eq('status', 'published')
    .neq('id', ev.id)
    .gte('start_date', today)
    .eq('category', ev.category)
    .order('start_date', { ascending: true })
    .limit(3)
  if (!related || related.length < 3) {
    const { data: backfill } = await supabase
      .from('calendar_events')
      .select('id, slug, title, start_date, end_date, start_time, end_time, location_name, category, hero_image_url, is_free, is_featured')
      .eq('status', 'published')
      .neq('id', ev.id)
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(3)
    related = [
      ...(related ?? []),
      ...((backfill ?? []).filter(b => !(related ?? []).some(r => r.id === b.id))),
    ].slice(0, 3)
  }

  const startTime = fmtTime(ev.start_time)
  const endTime   = fmtTime(ev.end_time)
  // display_time_override (migration 109) lets editors write the time
  // line verbatim — used when start/end can't describe the event ("10 AM
  // & 1 PM", "Doors at 6:30", "Drop in 10–4"). Falls back to the
  // auto-computed start/end line.
  const overrideTime = (ev.display_time_override as string | null | undefined)?.trim()
  const timeLine  = overrideTime
    ? overrideTime
    : startTime
      ? (endTime ? `${startTime} – ${endTime}` : startTime)
      : 'All day'
  const costLine  = ev.is_free ? 'Free' : (ev.cost_text || 'See details')

  // Map embed — prefer "Venue Name, Address" in the query so Google's
  // geocoder hits the actual business listing (which drops a real pin
  // with the business chip) instead of the legacy address-only geocode
  // that sometimes lands on the centroid with no marker. z=15 keeps
  // the pin centered. Falls back to address-only or location-only when
  // only one is set.
  const mapQuery = ev.location_name && ev.address
    ? `${ev.location_name}, ${ev.address}`
    : (ev.address || ev.location_name || null)
  const mapEmbed = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`
    : null
  const mapLink = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`
    : null

  // ── Event JSON-LD + Breadcrumb structured data ────────────────────────
  // schema.org/Event so Google can surface this in event-rich results
  // (Knowledge Graph card, date/time/location in SERP). Breadcrumb LD
  // mirrors the visible breadcrumb trail.
  const { eventJsonLd, breadcrumbJsonLd, jsonLdScript } = await import('@/lib/seo/jsonld')
  const { loadBrandContext: _loadBrand } = await import('@/lib/brand-context')
  const _seoCtx = await _loadBrand()
  const startIso = `${ev.start_date}${ev.start_time ? `T${ev.start_time}` : ''}`
  const endIso   = ev.end_date
    ? `${ev.end_date}${ev.end_time ? `T${ev.end_time}` : ''}`
    : undefined
  const eventLd = eventJsonLd({
    name:            ev.title,
    description:     ev.description ?? `Family event in the River Region — ${ev.title}.`,
    url:             `${_seoCtx.publicOrigin}/calendar/events/${slug}`,
    startDate:       startIso,
    endDate:         endIso,
    imageUrl:        ev.hero_image_url ?? null,
    locationName:    ev.location_name ?? undefined,
    locationAddress: ev.address ?? undefined,
    locationCity:    ev.city ?? undefined,
    locationState:   'AL',
    isFree:          ev.is_free === true,
    costText:        ev.cost_text ?? undefined,
    organizerName:   ev.organizer_name ?? undefined,
  })
  const eventBreadcrumbLd = breadcrumbJsonLd(
    [
      { name: 'Home',     path: '/' },
      { name: 'Calendar', path: '/calendar' },
      { name: ev.title,   path: `/calendar/events/${slug}` },
    ],
    _seoCtx.publicOrigin,
  )

  return (
    <div className="min-h-screen bg-background public-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventBreadcrumbLd) }}
      />
      <Navigation />

      {/* Breadcrumb trail — Home > Calendar > [Event Title]. Sits in a
          thin strip above the hero band. Reusable site-wide; rolling
          out to article, guide, and spotlight detail pages next. */}
      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home',     href: '/'         },
              { label: 'Calendar', href: '/calendar' },
              { label: ev.title },
            ]}
          />
        </div>
      </div>

      <main className="container py-8 md:py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 lg:items-start">

          {/* Main column — title block now lives inline (no cream band
              above) so the sidebar can start at the top of the page
              alongside the title instead of below a full-width hero. */}
          <div className="lg:col-span-8 space-y-6">

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {ev.category && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                  {categoryLabel(ev.category)}
                </span>
              )}
              {ev.is_featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </span>
              )}
              {ev.is_free && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-background ring-1 ring-border text-foreground text-xs font-bold">
                  Free
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-[1.1]">
              {ev.title}
            </h1>

            {/* Inline meta — date · time · venue at-a-glance, anchored
                to the title so a reader sees the essentials before they
                scroll past the photo. */}
            {ev.start_date && (
              <p className="text-foreground/85 text-sm md:text-base font-semibold inline-flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" /> {fmtLongDate(ev.start_date)}
                </span>
                {(ev.start_time || (ev.display_time_override as string | null | undefined)?.trim()) && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" /> {timeLine}
                    </span>
                  </>
                )}
                {(ev.location_name || ev.address) && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" /> {ev.location_name || ev.address}
                    </span>
                  </>
                )}
              </p>
            )}

            {/* Event photo — full-width, rounded, no white frame so it
                reads as part of the main column flow. object-contain
                keeps poster artwork from getting cropped at the edges
                (the bg-muted fills any letterbox space). */}
            {ev.hero_image_url && (
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl bg-muted shadow-[0_12px_30px_rgba(8,38,74,0.10)] ring-1 ring-border/40">
                <Image
                  src={ev.hero_image_url}
                  alt={ev.title}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 768px) 100vw, 720px"
                  unoptimized={shouldSkipNextOptimizer(ev.hero_image_url)}
                  priority
                />
              </div>
            )}

            {/* Actions row — Back to Calendar (yellow accent button)
                on the left, Save and Share outlined pills on the
                right. Sits right under the photo. */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border/40">
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-bold hover:brightness-95 transition-all shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Calendar
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background ring-1 ring-border text-foreground text-xs font-bold hover:ring-foreground/30 transition"
                  aria-label="Save event"
                >
                  <Heart className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background ring-1 ring-border text-foreground text-xs font-bold hover:ring-foreground/30 transition"
                  aria-label="Share event"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              </div>
            </div>

            {/* Chip row — only show chips that have real content. Empty
                fields (no time, no cost line, no venue) hide entirely
                rather than rendering placeholders like "All day" or
                "See details". Date always shows since start_date is a
                required field. */}
            {(() => {
              const chips: React.ReactNode[] = []
              if (ev.start_date) {
                chips.push(
                  <DetailChip
                    key="date"
                    icon={<Calendar className="h-5 w-5" />}
                    label="Date"
                    value={fmtShortDate(ev.start_date)}
                    tone="coral"
                  />,
                )
              }
              // Time chip — render if the editor set start_time OR a
              // display override. "All day" alone isn't worth a chip
              // since the absence of time is its own signal.
              const hasTime = !!(ev.start_time || (ev.display_time_override as string | null | undefined)?.trim())
              if (hasTime) {
                chips.push(
                  <DetailChip
                    key="time"
                    icon={<Clock className="h-5 w-5" />}
                    label="Time"
                    value={timeLine}
                    tone="navy"
                  />,
                )
              }
              // Cost chip — render if Free OR an explicit cost was given.
              if (ev.is_free || (ev.cost_text && ev.cost_text.trim())) {
                chips.push(
                  <DetailChip
                    key="cost"
                    icon={<Sparkles className="h-5 w-5" />}
                    label={ev.is_free ? 'Admission' : 'Cost'}
                    value={costLine}
                    tone={ev.is_free ? 'sage' : 'navy'}
                  />,
                )
              }
              // Location chip — venue OR address. Shows venue when both
              // exist, falls back to address otherwise.
              const locationValue = (ev.location_name || ev.address || '').trim()
              if (locationValue) {
                chips.push(
                  <DetailChip
                    key="location"
                    icon={<MapPin className="h-5 w-5" />}
                    label="Where"
                    value={locationValue}
                    tone="coral"
                  />,
                )
              }
              if (chips.length === 0) return null
              const cols = chips.length === 1 ? 'sm:grid-cols-1'
                         : chips.length === 2 ? 'sm:grid-cols-2'
                         : chips.length === 3 ? 'sm:grid-cols-3'
                         : 'sm:grid-cols-2 lg:grid-cols-4'
              return <div className={`grid gap-3 ${cols}`}>{chips}</div>
            })()}

            {/* About */}
            {ev.description && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">About This Event</h2>
                <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                  {ev.description}
                </div>
              </section>
            )}

            {/* Location with map */}
            {(ev.address || ev.location_name) && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3 inline-flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Location
                </h2>
                <div className="rounded-2xl overflow-hidden ring-1 ring-border bg-card">
                  {ev.location_name && (
                    <div className="px-5 py-3 border-b border-border">
                      <p className="font-bold text-foreground">{ev.location_name}</p>
                      {ev.address && <p className="text-sm text-muted-foreground">{ev.address}</p>}
                    </div>
                  )}
                  {mapEmbed && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <iframe
                      src={mapEmbed}
                      className="w-full h-64 md:h-72 border-0"
                      loading="lazy"
                      title={`Map to ${ev.location_name ?? ev.address}`}
                    />
                  )}
                  {mapLink && (
                    <div className="px-5 py-3 border-t border-border">
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-accent-foreground transition-colors"
                      >
                        Get Directions <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Event Organizer */}
            {(ev.organizer_name || ev.organizer_email || ev.phone || ev.website) && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-3">Event Organizer</h2>
                <div className="rounded-2xl bg-card ring-1 ring-border p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {ev.organizer_name && (
                    <p className="font-bold text-foreground text-base">{ev.organizer_name}</p>
                  )}
                  {ev.organizer_email && (
                    <a
                      href={`mailto:${ev.organizer_email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" /> {ev.organizer_email}
                    </a>
                  )}
                  {ev.phone && (
                    <a
                      href={`tel:${ev.phone.replace(/[^0-9]/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" /> {ev.phone}
                    </a>
                  )}
                  {ev.website && (
                    <a
                      href={ev.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[18rem]">{ev.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* More Happening Around Town */}
            {related && related.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
                    More Happening Around Town
                  </h2>
                  <Link href="/calendar" className="text-sm font-bold text-primary hover:underline">
                    Full Calendar →
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {related.map(r => <EventCard key={r.id} event={r} />)}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — sticky on desktop so Attend stays visible */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 lg:self-start">

            {/* Attend This Event — soft peach card with icon rows and
                two stacked CTAs. Mirrors the screenshot the user
                shared. Save lives in the actions row above the chips
                so this card stays focused on the two key actions:
                add to calendar (or register) + share. */}
            <div className="rounded-2xl bg-[var(--fg-terra-light)] ring-1 ring-primary/15 p-5 md:p-6 shadow-[0_8px_24px_rgba(8,38,74,0.06)]">
              <h3 className="text-lg font-bold text-foreground mb-4">Attend This Event</h3>
              <ul className="space-y-3.5 mb-5">
                {ev.start_date && (
                  <li className="flex items-center gap-3 text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold leading-snug">{fmtLongDate(ev.start_date)}</span>
                  </li>
                )}
                {(ev.start_time || (ev.display_time_override as string | null | undefined)?.trim()) && (
                  <li className="flex items-center gap-3 text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Clock className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold leading-snug">{timeLine}</span>
                  </li>
                )}
                {(ev.location_name || ev.address) && (
                  <li className="flex items-start gap-3 text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary mt-0.5">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold leading-snug">{ev.location_name || ev.address}</span>
                  </li>
                )}
                {(ev.is_free || ev.cost_text) && (
                  <li className="text-sm font-bold text-foreground">
                    {ev.is_free ? 'Free Admission' : ev.cost_text}
                  </li>
                )}
              </ul>

              <div className="space-y-2.5">
                {ev.registration_url ? (
                  <a
                    href={ev.registration_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Register Now
                  </a>
                ) : (
                  <a
                    href={`/api/calendar/feed.ics?event=${ev.id}`}
                    className="block w-full text-center px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Add to My Calendar
                  </a>
                )}
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-accent text-accent-foreground font-bold text-sm hover:brightness-95 transition-all shadow-sm"
                  aria-label="Share event"
                >
                  <Share2 className="h-4 w-4" /> Share Event
                </button>
              </div>
            </div>

            {/* Sponsor slot — placeholder until the ad system wires up.
                Stays sized so the rail layout is stable, doesn't ship visible
                "ad copy" before there's a real advertiser. */}
            <SponsorSlot placement="event-detail-rail-top" />

            {/* Submit Your Event CTA */}
            <div className="rounded-2xl bg-[var(--fg-terra-light)] ring-1 ring-primary/15 p-5">
              <h3 className="text-base font-bold text-foreground mb-1.5 inline-flex items-center gap-1.5">
                <Send className="h-4 w-4 text-primary" /> Have an Event to Share?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                River Region Parents reaches thousands of local families every week. Submit your community event and we&apos;ll get it in front of the right audience.
              </p>
              <Link
                href="/calendar/submit"
                className="block w-full text-center px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Submit Your Event
              </Link>
            </div>

            {/* Newsletter Subscribe */}
            <div className="rounded-2xl bg-card ring-1 ring-border p-5">
              <h3 className="text-base font-bold text-foreground mb-1.5">Know Where to Go?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Get the week&apos;s best family-friendly events delivered to your inbox every Thursday morning.
              </p>
              <form action="/api/newsletter/subscribe" method="post" className="flex gap-2">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Your email address"
                  className="flex-1 px-3 py-2 text-sm rounded-xl bg-background ring-1 ring-border focus:ring-primary outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>

            {/* Second sponsor slot */}
            <SponsorSlot placement="event-detail-rail-bottom" />

            {/* Back to full calendar */}
            <div className="rounded-2xl bg-muted/40 p-4 text-center">
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Full Calendar
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

// ── Building blocks ──────────────────────────────────────────────────────────

function DetailChip({
  icon, label, value, tone,
}: {
  icon:  React.ReactNode
  label: string
  value: string
  tone:  'coral' | 'navy' | 'sage'
}) {
  const cls: Record<'coral' | 'navy' | 'sage', { wrap: string; icon: string; label: string }> = {
    coral: {
      wrap:  'bg-[var(--fg-terra-light)] ring-primary/20',
      icon:  'text-primary',
      label: 'text-primary',
    },
    navy: {
      wrap:  'bg-[var(--fg-sky-light)] ring-[var(--fg-sky)]/20',
      icon:  'text-[var(--fg-sky)]',
      label: 'text-[var(--fg-navy)]',
    },
    sage: {
      wrap:  'bg-[var(--fg-sage-light)] ring-[var(--fg-sage)]/20',
      icon:  'text-[var(--fg-sage)]',
      label: 'text-[var(--fg-sage)]',
    },
  }
  const s = cls[tone]
  return (
    <div className={`rounded-2xl p-4 ring-1 ${s.wrap}`}>
      <div className={`mb-1.5 ${s.icon}`}>{icon}</div>
      <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${s.label}`}>{label}</p>
      <p className="text-sm font-bold text-foreground leading-snug">{value}</p>
    </div>
  )
}

// Sponsor slot placeholder. Sized to occupy the rail position until the ad
// system can fill it; kept neutral so it doesn't shout fake-ad until there's
// a real advertiser. When the ad system is wired in (future turn), this
// component is the single swap point — placement prop already passes through.
function SponsorSlot({ placement }: { placement: string }) {
  return (
    <div className="rounded-2xl ring-1 ring-dashed ring-border bg-muted/30 px-5 py-6 text-center">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mb-1">
        Sponsored
      </p>
      <p className="text-sm text-muted-foreground">
        Your business here. <Link href="/get-media-kit" className="text-primary font-bold hover:underline">Get the media kit →</Link>
      </p>
      {/* Reserved hook for the ad system: data attribute encodes placement so
          wiring it in later only needs to swap this component for the real
          AdSlot, no upstream changes. */}
      <span data-sponsor-placement={placement} aria-hidden="true" />
    </div>
  )
}
