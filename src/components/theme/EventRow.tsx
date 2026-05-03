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
  location_name?:  string | null
  category?:       string | null
  hero_image_url?: string | null
  is_free?:        boolean
}

interface Props {
  event:     EventData
  featured?: boolean
}

function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day:   dt.getDate(),
  }
}

export function EventRow({ event, featured = false }: Props) {
  const href = `/calendar/events/${event.slug ?? event.id}`
  const date = event.start_date ? formatDate(event.start_date) : null
  const heroSrc = event.hero_image_url || getFallbackByContext(event.category, event.slug ?? event.id)

  return (
    <Link href={href} className="group block">
      <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-shadow hover:shadow-sm ${
        featured ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
      }`}>
        {date && (
          <div className="shrink-0 h-20 w-20 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{date.month}</p>
            <p className="text-3xl font-bold text-foreground leading-none">{date.day}</p>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {featured && (
            <Badge className="mb-2 bg-primary text-primary-foreground text-xs">Featured Event</Badge>
          )}
          <h4 className="font-bold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors">
            {event.title}
          </h4>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {event.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{event.start_time}
              </span>
            )}
            {event.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{event.location_name}
              </span>
            )}
            {event.is_free && (
              <Badge className="text-[10px] py-0 bg-primary text-primary-foreground">Free</Badge>
            )}
          </div>
        </div>
        <div className="hidden sm:block shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
          <Image
            src={heroSrc}
            alt=""
            width={80}
            height={80}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
      </div>
    </Link>
  )
}
