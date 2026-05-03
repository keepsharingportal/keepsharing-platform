import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin } from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'

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
}

interface Props {
  event: EventData
}

function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }),
    day: dt.getDate(),
  }
}

export function EventCard({ event }: Props) {
  const href = `/calendar/events/${event.slug ?? event.id}`
  const date = event.start_date ? formatDate(event.start_date) : null
  const heroSrc = event.hero_image_url || getFallbackByContext(event.category, event.slug ?? event.id)

  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all bg-card flex flex-col h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={heroSrc}
            alt={event.title}
            fill
            style={{ objectFit: 'cover' }}
            className="group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 33vw"
            unoptimized
          />
          {date && (
            <div className="absolute top-3 left-3 bg-background/90 backdrop-blur text-foreground text-xs font-bold px-2.5 py-1 rounded-lg">
              {date.month.toUpperCase()} {date.day}
            </div>
          )}
          {event.is_free && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs">Free</Badge>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          {event.category && (
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{event.category}</p>
          )}
          <h3 className="font-bold text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground mt-auto">
            {event.start_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />{event.start_time}
                {event.end_time && ` – ${event.end_time}`}
              </div>
            )}
            {event.location_name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />{event.location_name}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
