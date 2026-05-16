// ComingUpEvents — the next few published calendar_events for the FRG
// page. Compact row-style list (not full grid cards) so the section
// stays tight. Pairs with the Annual Rhythm block to cover both
// "what to expect this year" and "what's happening this week".

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calendar, MapPin, Clock, Send } from 'lucide-react'

interface CalendarEvent {
  id:             string
  slug:           string
  title:          string
  start_date:     string | null
  start_time:     string | null
  location_name:  string | null
  hero_image_url: string | null
  category:       string | null
  is_free:        boolean | null
}

interface Props {
  events: CalendarEvent[]
}

function fmtDate(iso: string | null) {
  if (!iso) return { mo: '', day: '' }
  const d = new Date(iso)
  return {
    mo:  d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate().toString(),
  }
}

function fmtTime(time: string | null) {
  if (!time) return null
  // Accepts "HH:MM" or "HH:MM:SS"
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return null
  const hour12  = ((h + 11) % 12) + 1
  const period  = h < 12 ? 'am' : 'pm'
  const minutes = m && m > 0 ? `:${String(m).padStart(2, '0')}` : ''
  return `${hour12}${minutes}${period}`
}

export function ComingUpEvents({ events }: Props) {
  if (events.length === 0) {
    return (
      <section className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-6 text-center">
        <Calendar className="h-6 w-6 text-primary/40 mx-auto mb-2" />
        <p className="text-sm font-bold text-foreground mb-1">No upcoming events posted yet</p>
        <p className="text-xs text-muted-foreground mb-3 max-w-md mx-auto">
          When events are added to the calendar, the next six will show up here.
        </p>
        <Link
          href="/calendar/submit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-primary/40 text-primary rounded-full hover:bg-primary/5 transition-colors"
        >
          <Send className="h-3 w-3" /> Submit an Event
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Coming Up
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            What&apos;s happening this week
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/40 rounded-full hover:bg-primary/5 transition-colors"
          >
            <Calendar className="h-3 w-3" /> Full Calendar
          </Link>
          <Link
            href="/calendar/submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground border border-border rounded-full hover:bg-muted/30 transition-colors"
          >
            <Send className="h-3 w-3" /> Submit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map(ev => {
          const { mo, day } = fmtDate(ev.start_date)
          const time        = fmtTime(ev.start_time)
          return (
            <Link
              key={ev.id}
              href={`/calendar/events/${ev.slug}`}
              className="group flex gap-3 bg-card border border-border/40 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {/* Date box on left */}
              <div className="shrink-0 w-16 bg-primary/10 flex flex-col items-center justify-center py-3 border-r border-border/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">{mo}</span>
                <span className="text-2xl font-black text-primary leading-none mt-0.5" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
                  {day}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-2.5 pr-3 flex flex-col justify-center">
                <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {ev.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  {time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {time}
                    </span>
                  )}
                  {ev.location_name && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{ev.location_name}</span>
                    </span>
                  )}
                  {ev.is_free && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                      Free
                    </span>
                  )}
                </div>
              </div>

              {/* Hero thumb on right if available */}
              {ev.hero_image_url && (
                <div className="hidden sm:block relative w-20 shrink-0 overflow-hidden bg-primary/5">
                  <Image
                    src={ev.hero_image_url}
                    alt=""
                    fill
                    sizes="80px"
                    style={{ objectFit: 'cover' }}
                    className="group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-2 transition-all"
        >
          View full calendar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
