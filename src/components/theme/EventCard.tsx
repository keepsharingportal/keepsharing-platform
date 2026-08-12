'use client'

// EventCard — the calendar grid card.
//
// Client component because we attach an onError handler to the hero <img>:
// a lot of organizer-hosted images either 404 over time or get blocked by
// hotlink protection. Without the handler, those events render as a broken
// alt-text rectangle ("Exhibition on Screen: Frida Kahlo" with no image).
// With the handler, we silently swap to the deterministic category fallback
// so the grid still reads as curated even when an upstream image dies.
//
// Modeled on the River Region Parents calendar mockup the brand has been
// designed around:
//
//   ┌──────────────────────────────────┐
//   │ [Category]            [Featured] │  ← chips overlay the hero
//   │           hero image             │
//   ├──────────────────────────────────┤
//   │ 📅 Saturday, May 15              │  ← date in coral
//   │ Annual Summer Kickoff Festival   │  ← title, bold navy
//   │ 🕐 10:00 AM – 4:00 PM            │  ← meta in muted
//   │ 📍 Riverfront Park               │
//   │ ┌──────────────────────────────┐ │
//   │ │        View Details          │ │  ← gold on hover
//   │ └──────────────────────────────┘ │
//   └──────────────────────────────────┘
//
// Colors map to brand tokens — coral primary, sage for "Free", gold accent
// on hover. The whole card is one anchor, but the button visually inverts
// on group hover so the affordance reads as a real CTA.

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, MapPin, Star } from 'lucide-react'
import { categoryLabel } from '@/lib/calendar-taxonomy'
import { effectiveCategory } from '@/lib/calendar/classify'
import { CategoryGraphic } from '@/components/calendar/CategoryGraphic'
import { formatEventTime as fmtTime } from '@/lib/calendar/format'

interface EventData {
  id:              string
  slug?:           string | null
  title:           string
  start_date?:     string | null
  start_time?:     string | null
  end_time?:       string | null
  location_name?:  string | null
  category?:       string | null
  hero_image_url?: string | null
  is_free?:        boolean
  is_featured?:    boolean
}

interface Props {
  event: EventData
}

function fmtLongDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

// fmtTime now comes from lib/calendar/format (imported at the top of this
// file) — it was a local copy, and the homepage never got one, which is why
// it rendered raw 24-hour values.

export function EventCard({ event }: Props) {
  const href            = `/calendar/events/${event.slug ?? event.id}`
  // No-hero events get a branded CategoryGraphic (much cleaner than the
  // old random-Unsplash fallback). We still track `failed` so a real hero
  // that 404s can flip back to the graphic at runtime.
  const [failed, setFailed] = useState(false)
  const showGraphic = !event.hero_image_url || failed
  const displayCategory = effectiveCategory(event.category, event.title)
  const dateLine = event.start_date ? fmtLongDate(event.start_date) : null
  const startT   = fmtTime(event.start_time)
  const endT     = fmtTime(event.end_time)
  const timeLine = startT ? (endT ? `${startT} – ${endT}` : startT) : null

  return (
    <Link
      href={href}
      className="group block bg-card rounded-2xl overflow-hidden ring-1 ring-border hover:ring-primary/30 hover:shadow-lg transition-all flex flex-col h-full"
    >
      {/* Hero — object-contain so square posters / portrait flyers fit
          without losing their edges. Cream bg fills the side bands when
          the source isn't 16:10, which reads as intentional framing
          rather than a layout bug. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--fg-cream)]">
        {showGraphic ? (
          <CategoryGraphic category={event.category} title={event.title} />
        ) : (
          <Image
            src={event.hero_image_url!}
            alt={event.title}
            fill
            style={{ objectFit: 'contain' }}
            className="group-hover:scale-[1.03] transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
            onError={() => {
              // Real organizer image died (404, hotlink-blocked, DNS rot,
              // etc.). Swap to the CategoryGraphic so the grid still reads
              // as curated instead of showing a torn-paper alt-text card.
              if (!failed) setFailed(true)
            }}
          />
        )}
        {/* Category pill — only render when we have a real hero. When the
            CategoryGraphic is showing, the category is already the visual
            headline of the card, so a chip on top is redundant. */}
        {!showGraphic && displayCategory && (
          <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[11px] font-semibold text-foreground shadow-sm">
            {categoryLabel(displayCategory)}
          </span>
        )}
        {/* Featured pill — coral, only when actually featured */}
        {event.is_featured && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-sm">
            <Star className="h-3 w-3 fill-current" /> Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        {dateLine && (
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mb-2">
            <Calendar className="h-4 w-4" />
            {dateLine}
          </p>
        )}
        <h3 className="text-lg font-bold text-foreground leading-snug mb-3 line-clamp-2">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-muted-foreground mb-5">
          {timeLine && (
            <p className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {timeLine}
            </p>
          )}
          {event.location_name && (
            <p className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary font-medium">{event.location_name}</span>
            </p>
          )}
          {event.is_free && (
            <p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--fg-sage-light)] text-[var(--fg-sage)] text-[11px] font-bold ring-1 ring-[var(--fg-sage)]/20">
                Free
              </span>
            </p>
          )}
        </div>

        {/* CTA — full width. Gold on hover (desktop) AND on active (mobile
            tap) so the affordance lands on touch devices too, where :hover
            is unreliable. Adds a tiny lift via shadow on hover for extra
            tactile feel. */}
        <span
          className={[
            'mt-auto inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl',
            'bg-muted text-foreground text-sm font-bold ring-1 ring-border',
            'transition-all',
            'group-hover:bg-accent group-hover:text-accent-foreground group-hover:ring-accent group-hover:shadow-md',
            'group-active:bg-accent group-active:text-accent-foreground group-active:ring-accent',
          ].join(' ')}
        >
          View Details
        </span>
      </div>
    </Link>
  )
}
