// RecurringEventRow — compact single-line row for routine events.
//
// Why a separate component: storytime every Tuesday + Friday movie nights
// + weekly yoga + library readings = a LOT of cards if every occurrence
// renders as a full hero card. That floods the grid and pushes festivals
// and one-off events out of view. The right UX is to surface these
// routine events as a compact "Weekly Picks" list at the bottom of the
// calendar where parents can scan them in a single column without
// hijacking attention from one-off events.
//
// Rendered by CalendarClient in a separate stack below the main grid;
// shares the click-anywhere-on-the-row affordance with the EventCard.

import Link from 'next/link'
import { Calendar, Clock, MapPin, Repeat } from 'lucide-react'
import { categoryLabel } from '@/lib/calendar-taxonomy'
import { effectiveCategory } from '@/lib/calendar/classify'
import type { CalEvent } from './CalendarClient'
import { formatEventTime as fmtTime } from '@/lib/calendar/format'

interface Props {
  event: CalEvent
}

function fmtShortDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function RecurringEventRow({ event }: Props) {
  const href = `/calendar/events/${event.slug ?? event.id}`
  const startT = fmtTime(event.start_time)
  const cat = effectiveCategory(event.category, event.title)

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/30 hover:bg-muted/30 transition-all"
    >
      {/* Date pill — small, structured, scannable */}
      {event.start_date && (
        <div className="shrink-0 text-center w-12">
          <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
            {new Date(event.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="text-xl font-bold text-foreground leading-none">
            {new Date(event.start_date + 'T12:00:00').getDate()}
          </p>
        </div>
      )}

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {event.title}
          </p>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Repeat className="h-2.5 w-2.5" />
            recurring
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground mt-0.5">
          {event.start_date && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {fmtShortDate(event.start_date)}
            </span>
          )}
          {startT && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {startT}
            </span>
          )}
          {event.location_name && (
            <span className="inline-flex items-center gap-1 truncate max-w-[18rem]">
              <MapPin className="h-3 w-3 text-primary" />
              <span className="truncate">{event.location_name}</span>
            </span>
          )}
          {cat && (
            <span className="opacity-60">· {categoryLabel(cat)}</span>
          )}
          {event.is_free && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--fg-sage-light)] text-[var(--fg-sage)] text-[10px] font-bold">
              Free
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Recurring detection ─────────────────────────────────────────────────────
// A "recurring routine" event is one of:
//   1. has recurrence_rule set on its row (true recurring via iCal RRULE,
//      from migration 077)
//   2. its title matches a routine-event keyword (storytime, weekly yoga,
//      family movie night, etc.) — covers events that ARE recurring but
//      came in as individual rows from a CSV or staff entry rather than as
//      a parent + occurrences.
//
// Centralized here so the calendar AND the admin's "More" tooling can agree
// on what's "routine" without duplicating regexes.
const ROUTINE_TITLE_PATTERNS: RegExp[] = [
  /storytime|story time/i,
  /toddler time|baby time/i,
  /preschool playtime|playgroup/i,
  /weekly (yoga|fitness|workout|class)/i,
  /family movie night/i,
  /open play|drop.in/i,
  /every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /weekly|biweekly|monthly meeting/i,
]

export function isRoutineRecurring(event: CalEvent & { recurrence_rule?: string | null }): boolean {
  if (event.recurrence_rule) return true
  if (!event.title) return false
  return ROUTINE_TITLE_PATTERNS.some(p => p.test(event.title))
}
