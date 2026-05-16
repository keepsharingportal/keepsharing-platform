// ComingUpEvents — full "Happening Around Town" events section for the
// FRG page. Mirrors the home page treatment: 3-column card grid, image
// with date badge overlay + Free pill, title + time + location below.
// Pairs visually with the Annual Rhythm seasonal block.

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Send, CalendarDays } from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { SectionHeader } from '@/components/theme'
import { Button } from '@/components/ui/button'

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

function fmtEventDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day:   d.getDate().toString(),
  }
}

function fmtTime(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return null
  const hour12  = ((h + 11) % 12) + 1
  const period  = h < 12 ? 'am' : 'pm'
  const minutes = m && m > 0 ? `:${String(m).padStart(2, '0')}` : ''
  return `${hour12}${minutes}${period}`
}

export function ComingUpEvents({ events }: Props) {
  return (
    <section>
      <SectionHeader
        title="Happening Around Town!"
        icon={CalendarDays}
        iconColor="primary"
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
              <Link href="/calendar">Full Calendar</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:flex rounded-full">
              <Link href="/calendar/submit">Submit Event</Link>
            </Button>
          </div>
        }
      />

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-10 text-center">
          <CalendarDays className="h-8 w-8 text-primary/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground mb-1">No events posted yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            When events are added to the calendar, the next six will appear here.
          </p>
          <Link
            href="/calendar/submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            <Send className="h-3 w-3" /> Submit an Event
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => {
              const date   = fmtEventDate(ev.start_date)
              const time   = fmtTime(ev.start_time)
              const imgSrc = ev.hero_image_url || getFallbackByContext(ev.category ?? 'parenting', ev.slug ?? ev.id)
              return (
                <Link
                  key={ev.id}
                  href={`/calendar/events/${ev.slug}`}
                  className="group flex flex-col rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-md transition-all bg-card"
                >
                  <div className="relative h-32 overflow-hidden bg-primary/5 shrink-0">
                    <Image
                      src={imgSrc}
                      alt={ev.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      className="group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                    {date && (
                      <div className="absolute bottom-2.5 left-2.5 bg-white rounded-xl px-2.5 py-1.5 text-center shadow-sm">
                        <div className="text-[9px] font-bold text-primary uppercase leading-none">{date.month}</div>
                        <div className="text-lg font-black text-foreground leading-none mt-0.5">
                          {date.day}
                        </div>
                      </div>
                    )}
                    {ev.is_free && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500 text-white shadow-sm">Free</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {ev.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                      {time && <span>{time}</span>}
                      {time && ev.location_name && <span>·</span>}
                      {ev.location_name && <span className="truncate">{ev.location_name}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-5 flex justify-center">
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-2 transition-all"
            >
              View the full calendar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
