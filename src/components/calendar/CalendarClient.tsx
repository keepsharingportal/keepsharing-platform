'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MapPin, Clock, LayoutGrid, List, Search, ChevronRight,
  Calendar as CalIcon, Download, Filter,
} from 'lucide-react'
import { EventCard } from '@/components/theme'
import { EVENT_CATEGORIES, EVENT_TAGS, categoryLabel } from '@/lib/calendar-taxonomy'

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
}

interface Props {
  initialEvents: CalEvent[]
}

const TIME_WINDOWS = [
  { value: 'upcoming', label: 'All Upcoming' },
  { value: 'today',    label: 'Today'        },
  { value: 'weekend',  label: 'This Weekend' },
  { value: 'week',     label: 'This Week'    },
  { value: 'month',    label: 'This Month'   },
]

// Tags worth showing as one-click chips (subset of the full taxonomy).
const QUICK_TAGS = ['free', 'toddler-friendly', 'teen', 'special-needs-friendly', 'indoor']

function fmtRange(ev: CalEvent): string {
  if (!ev.start_date) return ''
  const s = new Date(ev.start_date + 'T12:00:00')
  const e = ev.end_date && ev.end_date !== ev.start_date ? new Date(ev.end_date + 'T12:00:00') : null
  if (!e) return s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

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
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
            {ev.is_free && <span className="text-primary font-semibold">Free</span>}
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
            <Button asChild size="sm" className="rounded-full">
              <Link href={href}>Full Details →</Link>
            </Button>
            {ev.registration_url && (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <a href={ev.registration_url} target="_blank" rel="noreferrer">Register →</a>
              </Button>
            )}
            {ev.cost_text && !ev.is_free && (
              <Badge variant="outline">{ev.cost_text}</Badge>
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

export function CalendarClient({ initialEvents }: Props) {
  const [view,     setView]     = useState<'grid' | 'list'>('grid')
  const [when,     setWhen]     = useState('upcoming')
  const [category, setCategory] = useState<string>('all')
  const [tag,      setTag]      = useState<string>('')
  const [free,     setFree]     = useState(false)
  const [search,   setSearch]   = useState('')
  const [events,   setEvents]   = useState<CalEvent[]>(initialEvents)
  const [loading,  setLoading]  = useState(false)
  const [dirty,    setDirty]    = useState(false)

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
      if (tag) params.set('tag', tag)
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
  }, [when, category, tag, free, debouncedSearch, dirty])

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  const subscribeUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/api/calendar/feed.ics'
    return `${window.location.origin}/api/calendar/feed.ics`
  }, [])

  // Build a Google Calendar add-by-URL link for one-click subscribe in GCal.
  const googleSubscribeUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`${window.location.host}/api/calendar/feed.ics`)}`
  }, [])

  return (
    <>
      {/* Sticky filter bar — two rows */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container py-3 space-y-2">
          {/* Row 1: time chips + view toggle + subscribe */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex gap-1.5 shrink-0">
              {TIME_WINDOWS.map(t => (
                <button
                  key={t.value}
                  onClick={() => mark(setWhen)(t.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                    when === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.value === 'weekend' && '🌟 '}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search events…"
                  value={search}
                  onChange={e => mark(setSearch)(e.target.value)}
                  className="pl-8 h-8 rounded-full text-sm"
                />
              </div>
              <div className="hidden sm:flex gap-0.5 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setView('grid')}
                  className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: category dropdown + tag chips + Free toggle */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={category}
                onChange={e => mark(setCategory)(e.target.value)}
                className="h-8 text-sm bg-background border border-border rounded-full px-3 hover:border-foreground/30 focus:outline-none focus:border-primary"
              >
                <option value="all">All categories</option>
                {EVENT_CATEGORIES.map(c => (
                  <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => mark(setFree)(!free)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                free
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              💰 Free only
            </button>

            <div className="flex gap-1.5 shrink-0">
              {QUICK_TAGS.map(t => {
                const def = EVENT_TAGS.find(x => x.slug === t)
                const active = tag === t
                return (
                  <button
                    key={t}
                    onClick={() => mark(setTag)(active ? '' : t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {def?.label ?? t}
                  </button>
                )
              })}
            </div>

            <div className="ml-auto shrink-0">
              <div className="relative inline-block">
                <details className="group">
                  <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors">
                    <CalIcon className="h-3.5 w-3.5" />
                    Subscribe
                  </summary>
                  <div className="absolute right-0 mt-2 w-72 bg-background border border-border rounded-xl shadow-lg p-3 z-50 text-sm">
                    <p className="font-bold text-foreground mb-2">Add to your calendar</p>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Subscribe and every new family-friendly event we approve shows up in your calendar automatically.
                    </p>
                    <div className="space-y-1.5">
                      <a
                        href={googleSubscribeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-3 py-2 text-xs font-semibold bg-muted hover:bg-muted/70 rounded-lg"
                      >
                        Add to Google Calendar →
                      </a>
                      <a
                        href={subscribeUrl}
                        className="block px-3 py-2 text-xs font-semibold bg-muted hover:bg-muted/70 rounded-lg inline-flex items-center gap-1.5"
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
      </div>

      {/* Events */}
      <main className="container py-8">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading events…</div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No events match these filters. Try widening the time window or clearing some chips.
            </CardContent>
          </Card>
        ) : view === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        ) : (
          <Card>
            <CardContent className="p-2">
              {events.map(ev => <ListRow key={ev.id} ev={ev} />)}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}

// ── Tiny debounce hook ────────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
