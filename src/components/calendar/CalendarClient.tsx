'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Clock, LayoutGrid, List, Search, ChevronRight } from 'lucide-react'
import { EventCard } from '@/components/theme'

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
                    ? 'bg-primary text-primary-foreground'
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
