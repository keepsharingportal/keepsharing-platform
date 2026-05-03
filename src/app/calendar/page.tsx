import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { PageHeader } from '@/components/theme'
import type { Metadata } from 'next'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'Family Calendar | River Region Parents',
  description: 'Events, festivals, workshops, and activities for River Region families — updated weekly.',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function CalendarPage() {
  const supabase = getSupabase()
  const today    = new Date().toISOString().split('T')[0]
  const monthEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data } = await supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, end_date, start_time, end_time, location_name, address, is_free, cost_text, description, category, hero_image_url')
    .eq('status', 'published')
    .gte('start_date', today)
    .lte('start_date', monthEnd)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .limit(50)

  const initialEvents = data ?? []

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <PageHeader
        title="Community Calendar"
        subtitle="Find the best local events, festivals, and activities for your family in the River Region."
        variant="primary"
        align="center"
      />

      {/* SSR event list for crawlers — visible without JavaScript */}
      <noscript>
        <ul className="container py-8 space-y-4 list-none">
          {initialEvents.map(ev => (
            <li key={ev.id} className="border-b pb-4">
              <a href={`/calendar/events/${ev.slug ?? ev.id}`} className="font-bold text-foreground">
                {ev.title}
              </a>
              {ev.start_date && (
                <span className="ml-2 text-sm text-muted-foreground">
                  — {new Date(ev.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              )}
              {ev.location_name && (
                <span className="ml-2 text-sm text-muted-foreground">at {ev.location_name}</span>
              )}
            </li>
          ))}
        </ul>
      </noscript>

      {/* Client component: filters + interactive view. Starts with SSR-provided events. */}
      <CalendarClient initialEvents={initialEvents} />

      <PublicFooter />
    </div>
  )
}
