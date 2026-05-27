'use client'

// CalendarClient — the public calendar grid + filter chrome.
//
// Designed to match the River Region Parents calendar mockup: a clean
// single-row chip strip (All Events + top categories with actual events),
// Grid/List toggle on the right, and a compact secondary row for time-
// window, free-only, search, and subscribe. The card grid does the heavy
// lifting via <EventCard>.

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  MapPin, Clock, LayoutGrid, List, Search, ChevronRight,
  Calendar as CalIcon, Download, X,
} from 'lucide-react'
import { EventCard } from '@/components/theme'
import { EVENT_CATEGORIES, categoryLabel } from '@/lib/calendar-taxonomy'
import { RecurringEventRow, isRoutineRecurring } from './RecurringEventRow'
import { CalendarAdCard, SponsorAdBanner } from './CalendarAds'
import type { ActiveAd } from '@/lib/get-active-ads'

export interface CalEvent {
  id:               string
  slug?:            string | null
  title:            string
  start_date?:      string | null
  end_date?:        string | null
  start_time?:      string | null
  end_time?:        string | null
  location_name?:   string | null
  address?:         string | null
  city?:            string | null
  is_free?:         boolean
  cost_text?:       string | null
  description?:     string | null
  category?:        string | null
  hero_image_url?:  string | null
  registration_url?: string | null
  organizer_name?:   string | null
  is_featured?:      boolean
  recurrence_rule?:  string | null
}

interface Props {
  initialEvents:  CalEvent[]
  topBannerAd?:   ActiveAd | null
  bottomBannerAd?: ActiveAd | null
  inlineAds?:     ActiveAd[]
}

const TIME_WINDOWS = [
  { value: 'upcoming', label: 'All Upcoming' },
  { value: 'today',    label: 'Today'        },
  { value: 'weekend',  label: 'This Weekend' },
  { value: 'week',     label: 'This Week'    },
  { value: 'month',    label: 'This Month'   },
]

// How many category chips to surface inline before they tuck behind a
// "More" dropdown. Hyperlocal calendars are usually weighted toward a few
// categories — surfacing the long tail in a dropdown keeps the strip clean
// without losing access.
const VISIBLE_CHIPS = 5

function fmtRange(ev: CalEvent): string {
  if (!ev.start_date) return ''
  const s = new Date(ev.start_date + 'T12:00:00')
  const e = ev.end_date && ev.end_date !== ev.start_date ? new Date(ev.end_date + 'T12:00:00') : null
  if (!e) return s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ── List view row ────────────────────────────────────────────────────────────
// Single-line row, expands inline to show description + actions. Used when
// the operator picks "List" instead of "Grid" — denser scanning for power
// users who already know what they're looking for.
function ListRow({ ev }: { ev: CalEvent }) {
  const [open, setOpen] = useState(false)
  const href = `/calendar/events/${ev.slug ?? ev.id}`
  const isMultiDay = ev.end_date && ev.end_date !== ev.start_date

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-4 py-4 hover:bg-muted/50 px-3 rounded-xl transition-colors"
      >
        {ev.start_date && (
          <div className="shrink-0 text-center w-14">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {new Date(ev.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
            </p>
            <p className="text-2xl font-bold text-foreground leading-none">
              {new Date(ev.start_date + 'T12:00:00').getDate()}
            </p>
            {isMultiDay && <p className="text-[9px] font-bold uppercase text-primary mt-0.5">multi-day</p>}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{ev.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
            {isMultiDay && <span className="font-semibold">{fmtRange(ev)}</span>}
            {ev.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.start_time}</span>}
            {ev.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location_name}</span>}
            {ev.is_free && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--fg-sage-light)] text-[var(--fg-sage)] font-bold text-[10px] ring-1 ring-[var(--fg-sage)]/20">
                Free
              </span>
            )}
            {ev.category && <span className="opacity-70">· {categoryLabel(ev.category)}</span>}
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-4 pl-[calc(3.5rem+1rem+0.75rem)]">
          {ev.description && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed line-clamp-4">{ev.description}</p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href={href}
              className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-full bg-muted text-foreground ring-1 ring-border hover:bg-accent hover:text-accent-foreground hover:ring-accent transition-colors"
            >
              View Details →
            </Link>
            {ev.registration_url && (
              <a
                href={ev.registration_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Register →
              </a>
            )}
            {ev.cost_text && !ev.is_free && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">{ev.cost_text}</span>
            )}
            {ev.organizer_name && (
              <span className="text-xs text-muted-foreground">by {ev.organizer_name}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CalendarClient({ initialEvents, topBannerAd, bottomBannerAd, inlineAds }: Props) {
  const [view,        setView]     = useState<'grid' | 'list'>('grid')
  const [when,        setWhen]     = useState('upcoming')
  const [category,    setCategory] = useState<string>('all')
  const [free,        setFree]     = useState(false)
  const [search,      setSearch]   = useState('')
  const [searchOpen,  setSearchOpen] = useState(false)
  const [events,      setEvents]   = useState<CalEvent[]>(initialEvents)
  const [loading,     setLoading]  = useState(false)
  const [dirty,       setDirty]    = useState(false)

  // Debounce search input slightly so we don't spam the API on each keystroke.
  const debouncedSearch = useDebounce(search, 250)

  useEffect(() => {
    if (!dirty) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('when', when)
      if (category !== 'all') params.set('category', category)
      if (free) params.set('is_free', 'true')
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      try {
        const res  = await fetch(`/api/calendar/events?${params}`)
        const data = await res.json()
        if (!cancelled) setEvents(data.events ?? [])
      } catch {
        if (!cancelled) setEvents([])
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [when, category, free, debouncedSearch, dirty])

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  // Surface the categories that actually have events in this dataset first;
  // the rest tuck behind the "More" dropdown so a five-event calendar
  // doesn't show ten empty chips.
  const sortedCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of initialEvents) {
      if (e.category) counts[e.category] = (counts[e.category] ?? 0) + 1
    }
    return [...EVENT_CATEGORIES].sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0))
  }, [initialEvents])

  const visibleCats = sortedCategories.slice(0, VISIBLE_CHIPS)
  const overflowCats = sortedCategories.slice(VISIBLE_CHIPS)

  const subscribeUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/api/calendar/feed.ics'
    return `${window.location.origin}/api/calendar/feed.ics`
  }, [])

  // Build a Google Calendar add-by-URL link for one-click subscribe in GCal.
  const googleSubscribeUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`${window.location.host}/api/calendar/feed.ics`)}`
  }, [])

  const activeFiltersCount =
    (category !== 'all' ? 1 : 0) +
    (free ? 1 : 0) +
    (when !== 'upcoming' ? 1 : 0) +
    (search.trim() ? 1 : 0)

  function clearAll() {
    setCategory('all')
    setFree(false)
    setWhen('upcoming')
    setSearch('')
    setSearchOpen(false)
    setDirty(true)
  }

  return (
    <>
      {/* Sticky filter bar */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container py-3 space-y-2">
          {/* Row 1 — category chips + view toggle (mirrors the mockup) */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => mark(setCategory)('all')}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ring-1 ${
                  category === 'all'
                    ? 'bg-foreground text-background ring-foreground'
                    : 'bg-card text-foreground ring-border hover:bg-muted'
                }`}
              >
                All Events
              </button>
              {visibleCats.map(c => (
                <button
                  key={c.slug}
                  onClick={() => mark(setCategory)(c.slug)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ring-1 ${
                    category === c.slug
                      ? 'bg-foreground text-background ring-foreground'
                      : 'bg-card text-foreground ring-border hover:bg-muted'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              {overflowCats.length > 0 && (
                <select
                  value={overflowCats.some(c => c.slug === category) ? category : ''}
                  onChange={e => mark(setCategory)(e.target.value || 'all')}
                  className="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold bg-card ring-1 ring-border hover:bg-muted cursor-pointer focus:outline-none"
                >
                  <option value="">More…</option>
                  {overflowCats.map(c => (
                    <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Grid / List toggle — coral active background to match the mockup. */}
            <div className="shrink-0 flex items-center gap-0.5 bg-muted rounded-full p-1">
              <button
                onClick={() => setView('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                  view === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                  view === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
            </div>
          </div>

          {/* Row 2 — secondary filters: time window, free, search, subscribe */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Time-window dropdown — collapsed into a small select so the
                chip row above stays the visual headline. */}
            <select
              value={when}
              onChange={e => mark(setWhen)(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold bg-transparent text-muted-foreground hover:text-foreground rounded-full focus:outline-none cursor-pointer"
            >
              {TIME_WINDOWS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <button
              onClick={() => mark(setFree)(!free)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                free
                  ? 'bg-[var(--fg-sage-light)] text-[var(--fg-sage)] ring-1 ring-[var(--fg-sage)]/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Free only
            </button>

            {searchOpen ? (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={search}
                  onChange={e => mark(setSearch)(e.target.value)}
                  onBlur={() => { if (!search) setSearchOpen(false) }}
                  placeholder="Search events…"
                  className="pl-7 pr-2 py-1 text-xs bg-card rounded-full ring-1 ring-border focus:ring-primary outline-none w-48"
                />
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-3 w-3" /> Search
              </button>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}

            <div className="ml-auto">
              <details className="group relative">
                <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  <CalIcon className="h-3 w-3" /> Subscribe
                </summary>
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-lg p-3 z-50 text-sm">
                  <p className="font-bold text-foreground mb-2">Add to your calendar</p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Subscribe and every new family-friendly event we approve shows up in your calendar automatically.
                  </p>
                  <div className="space-y-1.5">
                    <a
                      href={googleSubscribeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-3 py-2 text-xs font-semibold bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                    >
                      Add to Google Calendar →
                    </a>
                    <a
                      href={subscribeUrl}
                      className="block px-3 py-2 text-xs font-semibold bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Download className="h-3 w-3" />
                      Download .ics file
                    </a>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Apple Calendar / Outlook: copy the .ics URL and use “Subscribe to Calendar.”
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Events */}
      <main className="container py-8 space-y-10">
        {/* Top sponsor banner — reads from ad_placements if booked,
            otherwise renders the "Media Kit" placeholder. */}
        <SponsorAdBanner placement="calendar-top" variant="tan" ad={topBannerAd} />

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-border p-12 text-center text-muted-foreground">
            <p className="text-sm">No events match these filters. Try widening the time window or clearing some chips.</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearAll} className="mt-3 text-sm font-bold text-primary hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : view === 'grid' ? (
          <ThreeTierGrid events={events} inlineAds={inlineAds ?? []} bottomBannerAd={bottomBannerAd ?? null} />
        ) : (
          <div className="bg-card rounded-2xl ring-1 ring-border overflow-hidden">
            {events.map(ev => <ListRow key={ev.id} ev={ev} />)}
          </div>
        )}
      </main>
    </>
  )
}

// ── Three-tier grid + paginated standard rail ────────────────────────────────
// Calendar reads top-to-bottom as:
//   1. Featured (curated)
//   2. Standard events, paginated 12 at a time. Two of every 12 visible
//      cards are ad slots (positions 4 + 9, 1-indexed) so the grid stays
//      visually balanced and the ad pacing isn't bunched at the top.
//      "Load More" reveals the next batch + brings the same 4 + 9 ad
//      cadence with it.
//   3. Bottom sponsor row (sits under the Load More button so a slow
//      scroller passes by it)
//   4. Weekly Picks recurring rows (still pinned at the very bottom)

const PAGE_SIZE  = 12       // events per page, ad slots ON TOP of this
const AD_INDICES = [3, 8]   // 0-indexed positions inside each batch of PAGE_SIZE

function ThreeTierGrid({ events, inlineAds, bottomBannerAd }: { events: CalEvent[]; inlineAds: ActiveAd[]; bottomBannerAd: ActiveAd | null }) {
  const featured: CalEvent[] = []
  const standard: CalEvent[] = []
  const routine:  CalEvent[] = []

  for (const ev of events) {
    if (isRoutineRecurring(ev)) {
      routine.push(ev)
    } else if (ev.is_featured) {
      featured.push(ev)
    } else {
      standard.push(ev)
    }
  }

  // How many of the standard events to show right now. Starts at PAGE_SIZE,
  // grows by PAGE_SIZE per Load More click. Resets when the upstream filter
  // changes (new events array identity).
  const [shownStandard, setShownStandard] = useState(PAGE_SIZE)
  useEffect(() => { setShownStandard(PAGE_SIZE) }, [events])

  const visibleStandard = standard.slice(0, shownStandard)
  const hasMore         = shownStandard < standard.length

  // Interleave ads into the visible standard events: every batch of
  // PAGE_SIZE has CalendarAdCards inserted at AD_INDICES so the slots
  // appear at positions 4 and 9 of each page.
  type GridItem =
    | { kind: 'event'; event: CalEvent }
    | { kind: 'ad'; placement: string; ad: ActiveAd | null }

  const gridItems: GridItem[] = []
  for (let i = 0; i < visibleStandard.length; i++) {
    gridItems.push({ kind: 'event', event: visibleStandard[i] })
  }
  // Walk backwards so insertions don't shift later indices.
  // Insert one ad at each AD_INDICES position per page. The inlineAds
  // array from the server is ordered by display_priority — first record
  // fills the first slot, second fills the second, etc.
  let adCursor = 0
  const pages = Math.ceil(visibleStandard.length / PAGE_SIZE)
  for (let p = pages - 1; p >= 0; p--) {
    const pageStart = p * PAGE_SIZE
    for (let i = AD_INDICES.length - 1; i >= 0; i--) {
      const insertAt = pageStart + AD_INDICES[i]
      if (insertAt <= gridItems.length) {
        gridItems.splice(insertAt, 0, {
          kind: 'ad',
          placement: `calendar-grid-page${p + 1}-slot${AD_INDICES[i] + 1}`,
          ad: inlineAds[adCursor++ % Math.max(inlineAds.length, 1)] ?? null,
        })
      }
    }
  }

  return (
    <>
      {featured.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3 inline-flex items-center gap-2">
            <span>⭐ Featured this week</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {featured.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        </section>
      )}

      {standard.length > 0 && (
        <section>
          {featured.length > 0 && (
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              All events
            </h2>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {gridItems.map((item, idx) =>
              item.kind === 'event'
                ? <EventCard key={item.event.id} event={item.event} />
                : <CalendarAdCard key={`ad-${idx}`} placement={item.placement} ad={item.ad} />
            )}
          </div>

          {/* Load More — sized prominently because the user explicitly asked
              for a tap-to-load action. Disabled state matches when there's
              nothing more to reveal. */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShownStandard(n => n + PAGE_SIZE)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card ring-1 ring-border text-sm font-bold text-foreground hover:bg-accent hover:text-accent-foreground hover:ring-accent active:bg-accent active:text-accent-foreground active:ring-accent transition-all shadow-sm hover:shadow-md"
              >
                Tap to Load More Events
                <span className="text-xs text-muted-foreground group-hover:text-accent-foreground">
                  ({standard.length - shownStandard} more)
                </span>
              </button>
            </div>
          )}

          {/* Bottom sponsor — under Load More so a reader who scrolled all
              the way down lands on a paid surface before they bounce. Uses
              the coral variant to differentiate from the cream top banner. */}
          <div className="mt-8">
            <SponsorAdBanner placement="calendar-bottom" variant="coral" ad={bottomBannerAd} />
          </div>
        </section>
      )}

      {routine.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1.5 inline-flex items-center gap-2">
            <span>Weekly picks — recurring favorites</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Storytime, library days, weekly movie nights — the routine stuff parents come back for. Click any row for details and add it to your calendar.
          </p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {routine.map(ev => <RecurringEventRow key={ev.id} event={ev} />)}
          </div>
        </section>
      )}
    </>
  )
}

// ── Tiny debounce hook ───────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
