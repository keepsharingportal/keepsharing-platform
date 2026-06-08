// /admin/circulation/emails — Email Center.
//
// Three sections:
//   1. Quick actions  — send on-our-way / reminders, process queue, test send
//   2. Templates       — edit subject/body for the 8 seeded templates
//   3. Schedules       — per-route delivery_start_day / archive_day / late_submit_days
//   4. Queue           — recent 50 emails with status + errors

import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { EmailCenter, type EmailTemplate, type RouteSchedule, type QueueRow } from './EmailCenter'

export const metadata = { title: 'Email Center — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function EmailsPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let templates: EmailTemplate[] = []
  let schedules: RouteSchedule[] = []
  let recent:    QueueRow[]      = []
  let routes:    Array<{ id: string; name: string }> = []
  let queueStats = { pending: 0, sending: 0, sent: 0, failed: 0 }

  try {
    const [tplRes, schedRes, routeRes, queueRes] = await Promise.all([
      sb.from('circulation_email_templates').select('*').eq('market', dbKey).order('id'),
      sb.from('circulation_route_schedules').select('*'),
      sb.from('circulation_routes').select('id, name').eq('market', dbKey).eq('active', true).order('sort_order').order('name'),
      sb.from('circulation_email_queue').select('id, status, to_email, subject, template_key, last_error, attempts, sent_at, created_at').eq('market', dbKey).order('created_at', { ascending: false }).limit(50),
    ])
    templates = (tplRes.data ?? []) as EmailTemplate[]
    routes    = (routeRes.data ?? []) as Array<{ id: string; name: string }>
    const schedByRoute = new Map<string, { delivery_start_day: number; archive_day: number; late_submit_days: number }>()
    for (const s of (schedRes.data ?? []) as Array<{ route_id: string; delivery_start_day: number; archive_day: number; late_submit_days: number }>) {
      schedByRoute.set(s.route_id, s)
    }
    schedules = routes.map(r => {
      const s = schedByRoute.get(r.id)
      return {
        route_id:           r.id,
        route_name:         r.name,
        delivery_start_day: s?.delivery_start_day ?? 1,
        archive_day:        s?.archive_day        ?? 20,
        late_submit_days:   s?.late_submit_days   ?? 10,
      }
    })
    recent = (queueRes.data ?? []) as QueueRow[]
    for (const r of recent) {
      const key = r.status as keyof typeof queueStats
      if (queueStats[key] !== undefined) queueStats[key]++
    }
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Email Center</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <EmailCenter
          market={dbKey}
          initialTemplates={templates}
          initialSchedules={schedules}
          routes={routes}
          recentQueue={recent}
          initialQueueStats={queueStats}
        />
      </div>
    </div>
  )
}
