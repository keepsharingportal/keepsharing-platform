// /admin/events/pending
// Review queue for events submitted via /calendar/submit. Lists all events
// where status='pending', with approve/reject actions inline.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { Inbox } from 'lucide-react'
import { PendingEventsClient } from './PendingEventsClient'

export const metadata = { title: 'Pending Events — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

export interface PendingEvent {
  id:               string
  title:            string
  slug:             string | null
  description:      string | null
  start_date:       string
  end_date:         string | null
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  address:          string | null
  city:             string | null
  email:            string | null
  phone:            string | null
  age_range:        string | null
  cost_text:        string | null
  is_free:          boolean | null
  hero_image_url:   string | null
  category:         string | null
  status:           string
  created_at:       string
  // New in migration 077 — may be null on older rows or absent if migration not applied
  registration_url?: string | null
  organizer_name?:   string | null
  tags?:             string[] | null
  source_type?:      string | null
  source_name?:      string | null
  source_url?:       string | null
  discovery_notes?:  string | null
}

export default async function PendingEventsPage() {
  const supabase = createAdminClient()

  // Try the rich select first; fall back to the legacy column set if
  // migration 077 hasn't been applied yet. The two selects produce
  // different inferred row shapes, so we hold the result in an
  // explicitly-typed local instead of letting TS infer from the first
  // query and then choke on the fallback.
  const richCols = 'id, title, slug, description, start_date, end_date, start_time, end_time, location_name, address, city, email, phone, age_range, cost_text, is_free, hero_image_url, category, status, created_at, registration_url, organizer_name, tags, source_type, source_name, discovery_notes'
  const baseCols = 'id, title, slug, description, start_date, end_date, start_time, end_time, location_name, address, city, email, phone, age_range, cost_text, is_free, hero_image_url, category, status, created_at'

  let events: PendingEvent[] | null = null
  let error: { message: string } | null = null

  const rich = await supabase
    .from('calendar_events')
    .select(richCols)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  events = (rich.data ?? null) as PendingEvent[] | null
  error  = rich.error

  if (error && /column .* does not exist/i.test(error.message)) {
    const base = await supabase
      .from('calendar_events')
      .select(baseCols)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    events = (base.data ?? null) as PendingEvent[] | null
    error  = base.error
  }

  if (error) console.error('[admin/events/pending] load error:', error)
  const rows = events ?? []

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-portal-text flex items-center gap-2">
          <Inbox className="h-5 w-5 text-portal-blue" />
          Pending Events
        </h1>
        <p className="text-sm text-portal-sub mt-0.5">
          Events submitted by the community via{' '}
          <Link href="/admin/go/calendar/submit" className="text-portal-blue hover:underline">/calendar/submit</Link>.
          Approve to publish, or reject with reason.
        </p>
      </div>

      <section>
        <AdminSectionHeader title="Submissions" count={rows.length} />
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
            <p className="text-sm text-portal-sub">No pending submissions right now.</p>
            <p className="text-xs text-portal-muted mt-1">New submissions will appear here automatically.</p>
          </div>
        ) : (
          <PendingEventsClient events={rows} />
        )}
      </section>
    </div>
  )
}
