'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CalendarDays, MapPin, Clock, LayoutGrid, List, Search, ChevronRight,
} from 'lucide-react'

export interface CalEvent {
  id: string
  slug?: string | null
  title: string
  start_date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  location_name?: string | null
  address?: string | null
  is_free?: boolean
  cost_text?: string | null
  description?: string | null
  category?: string | null
  hero_image_url?: string | null
}

interface Props {
  initialEvents: CalEvent[]
}

const FILTERS = ['All Events', 'Festivals', 'Education', 'Arts', 'Outdoors', 'Family', 'Sports']

const CATEGORY_GRADIENTS: Record<string, string> = {
  festival:  'from-yellow-100 to-orange-100',
  arts:      'from-purple-100 to-pink-100',
  music:     'from-blue-100 to-cyan-100',
  education: 'from-indigo-100 to-purple-100',
  outdoors:  'from-green-100 to-emerald-100',
  sports:    'from-teal-100 to-green-100',
  family:    'from-rose-100 to-orange-100',
  default:   'from-amber-100 to-yellow-100',
}

function getCategoryGradient(cat?: string | null) {
  if (!cat) return CATEGORY_GRADIENTS.default
  const k = cat.toLowerCase()
  for (const [key, val] of Object.entries(CATEGORY_GRADIENTS)) {
    if (k.includes(key)) return val
  }
  return CATEGORY_GRADIENTS.default
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function EventCardImage({ event }: { event: CalEvent }) {
  const [error, setError] = useState(false)
  if (!event.hero_image_url || error) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(event.category)} flex items-center justify-center`}>
        <CalendarDays className="h-12 w-12 text-foreground/20" />
      </div>
    )
  }
  return (
    <img
      src={event.hero_image_url}
      alt={event.title}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setError(true)}
    />
  )
}

function GridCard({ ev }: { ev: CalEvent }) {
  const href = `/calendar/events/${ev.slug ?? ev.id}`
  return (
    <Link href={href} className="group block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <EventCardImage event={ev} />
          {ev.start_date && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {formatDate(ev.start_date)}
            </div>
          )}
          {ev.is_free && (
            <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Free
            </div>
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          {ev.category && (
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{ev.category}</p>
          )}
          <h3 className="font-bold text-foreground leading-snug mb-2 line-clamp-2">{ev.title}</h3>
          <div className="space-y-1 text-xs text-muted-foreground mb-3">
            {ev.start_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{ev.start_time}{ev.end_time && ` – ${ev.end_time}`}
              </div>
            )}
            {ev.location_name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{ev.location_name}
              </div>
            )}
          </div>
          {!ev.is_free && ev.cost_text && (
            <p className="text-xs text-muted-foreground mt-auto">{ev.cost_text}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function ListRow({ ev }: { ev: CalEvent }) {
  const [open, setOpen] = useState(false)
  const href = `/calendar/events/${ev.slug ?? ev.id}`
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
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{ev.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {ev.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.start_time}</span>}
            {ev.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location_name}</span>}
            {ev.is_free && <span className="text-primary font-semibold">Free</span>}
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-4 pl-[calc(3.5rem+1rem+0.75rem)]">
          {ev.description && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{ev.description}</p>
          )}
          <div className="flex gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href={href}>Full Details →</Link>
            </Button>
            {ev.cost_text && !ev.is_free && (
              <Badge variant="outline">{ev.cost_text}</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CalendarClient({ initialEvents }: Props) {
  const [view,    setView]    = useState<'grid' | 'list'>('grid')
  const [filter,  setFilter]  = useState('All Events')
  const [search,  setSearch]  = useState('')
  const [events,  setEvents]  = useState<CalEvent[]>(initialEvents)
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) return
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'All Events') params.set('category', filter)
      if (search) params.set('search', search)
      params.set('date', 'upcoming')
      try {
        const res  = await fetch(`/api/calendar/events?${params}`)
        const data = await res.json()
        setEvents(data.events ?? [])
      } catch { setEvents([]) }
      setLoading(false)
    }
    load()
  }, [filter, search, isDirty])

  function handleFilterChange(f: string) {
    setFilter(f)
    setIsDirty(true)
  }

  function handleSearchChange(s: string) {
    setSearch(s)
    setIsDirty(true)
  }

  return (
    <>
      {/* Sticky filter bar */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container py-3 flex items-center gap-3 overflow-x-auto">
          <div className="flex gap-2 shrink-0">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative ml-auto shrink-0 w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 h-8 rounded-full text-sm"
            />
          </div>
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <List className="h-4 w-4" />
            </button>
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
              No events found for the selected filters.
            </CardContent>
          </Card>
        ) : view === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(ev => <GridCard key={ev.id} ev={ev} />)}
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
