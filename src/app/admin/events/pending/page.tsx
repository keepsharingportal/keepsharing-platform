// /admin/events/pending
// Review queue for events submitted via /calendar/submit. Lists all events
// where status='pending', with approve/reject actions inline.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { Inbox } from 'lucide-react'
import { PendingEventsClient } from './PendingEventsClient'

export const metadata = { title: 'Pending Events — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

export interface PendingEvent {
  id:            string
  title:         string
  slug:          string | null
  description:   string | null
  start_date:    string
  end_date:      string | null
  start_time:    string | null
  end_time:      string | null
  location_name: string | null
  address:       string | null
  city:          string | null
  email:         string | null
  phone:         string | null
  age_range:     string | null
  cost_text:     string | null
  is_free:       boolean | null
  hero_image_url: string | null
  status:        string
  created_at:    string
}

export default async function PendingEventsPage() {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, slug, description, start_date, end_date, start_time, end_time, location_name, address, city, email, phone, age_range, cost_text, is_free, hero_image_url, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) console.error('[admin/events/pending] load error:', error)
  const rows = (events ?? []) as PendingEvent[]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-blue-600" />
          Pending Events
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Events submitted by the community via{' '}
          <Link href="/calendar/submit" className="text-blue-600 hover:underline">/calendar/submit</Link>.
          Approve to publish, or reject with reason.
        </p>
      </div>

      <section>
        <AdminSectionHeader title="Submissions" count={rows.length} />
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
            <p className="text-sm text-gray-500">No pending submissions right now.</p>
            <p className="text-xs text-gray-400 mt-1">New submissions will appear here automatically.</p>
          </div>
        ) : (
          <PendingEventsClient events={rows} />
        )}
      </section>
    </div>
  )
}
