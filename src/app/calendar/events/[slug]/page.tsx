import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays, MapPin, Clock, Globe, Phone, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 1800

interface Props {
  params: Promise<{ slug: string }>
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await getSupabase()
    .from('calendar_events')
    .select('title, description')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single()
  if (!data) return { title: 'Event Not Found' }
  return {
    title:       `${data.title} | River Region Parents Calendar`,
    description: data.description?.slice(0, 160) ?? undefined,
  }
}

function formatDateFull(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabase()

  const { data: ev } = await supabase
    .from('calendar_events')
    .select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single()

  if (!ev || ev.status === 'cancelled') notFound()

  const today = new Date().toISOString().split('T')[0]
  const { data: related } = await supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, start_time, location_name, category')
    .eq('status', 'published')
    .neq('id', ev.id)
    .gte('start_date', today)
    .limit(4)
    .order('start_date', { ascending: true })

  const mapUrl = ev.address
    ? `https://maps.google.com/?q=${encodeURIComponent(ev.address)}`
    : null

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Hero */}
      {ev.hero_image_url ? (
        <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
          <Image src={ev.hero_image_url} alt={ev.title} fill style={{ objectFit: 'cover' }} className="opacity-80" sizes="100vw" unoptimized priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 container">
            <Link href="/calendar" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3">
              <ArrowLeft className="h-4 w-4" />Back to Calendar
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/10 border-b border-border">
          <div className="container py-8">
            <Link href="/calendar" className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm mb-4">
              <ArrowLeft className="h-4 w-4" />Back to Calendar
            </Link>
          </div>
        </div>
      )}

      <main className="container py-10">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* Main */}
          <div className="lg:col-span-8 space-y-6">
            {ev.category && <Badge>{ev.category}</Badge>}
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">{ev.title}</h1>
            {ev.start_date && (
              <p className="text-xl font-semibold text-primary">{formatDateFull(ev.start_date)}</p>
            )}
            {ev.description && (
              <Card>
                <CardContent className="p-6 md:p-8">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{ev.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Related events */}
            {related && related.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">More Events</h3>
                <div className="space-y-2">
                  {related.map(r => (
                    <Link key={r.id} href={`/calendar/events/${r.slug ?? r.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors">
                      {r.start_date && (
                        <div className="shrink-0 text-center w-12">
                          <p className="text-xs uppercase font-bold text-muted-foreground">
                            {new Date(r.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                          </p>
                          <p className="text-xl font-bold text-foreground leading-none">
                            {new Date(r.start_date + 'T12:00:00').getDate()}
                          </p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{r.title}</p>
                        {r.location_name && <p className="text-xs text-muted-foreground">{r.location_name}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-foreground">Event Details</h3>
                {ev.start_date && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{formatDateFull(ev.start_date)}</p>
                      {ev.start_time && (
                        <p className="text-muted-foreground">
                          {ev.start_time}{ev.end_time && ` – ${ev.end_time}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {ev.location_name && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{ev.location_name}</p>
                      {ev.address && <p className="text-muted-foreground">{ev.address}</p>}
                    </div>
                  </div>
                )}
                {ev.cost_text && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="text-lg shrink-0">💵</span>
                    <p className={ev.is_free ? 'font-semibold text-primary' : 'text-foreground'}>
                      {ev.is_free ? 'Free admission' : ev.cost_text}
                    </p>
                  </div>
                )}
                {ev.phone && (
                  <a href={`tel:${ev.phone.replace(/[^0-9]/g, '')}`}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary">
                    <Phone className="h-4 w-4 text-primary shrink-0" />{ev.phone}
                  </a>
                )}
                {ev.website && (
                  <a href={ev.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-primary hover:text-primary/80">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="truncate">{ev.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                <div className="space-y-2 pt-2">
                  {mapUrl && (
                    <Button variant="outline" className="w-full rounded-full" asChild>
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin className="h-4 w-4" />Get Directions
                      </a>
                    </Button>
                  )}
                  {ev.website && (
                    <Button className="w-full rounded-full" asChild>
                      <a href={ev.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />Visit Event Website
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
