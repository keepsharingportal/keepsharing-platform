// /admin/circulation/emails — Email Center.
//
// Port of admin/emails.php from the v3_FINAL portal source. Queue stats
// banner, Send Now (driver reminders + on-our-way), per-route schedules,
// templates table with inline editor modal. Send test email button in
// the page header.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { EmailCenterClient, type Template, type RouteSchedule } from './EmailCenterClient'

export const metadata = { title: 'Email Center — Distribution Portal' }
export const dynamic  = 'force-dynamic'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function EmailCenterPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const month  = currentMonth()
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const sb = createAdminClient()

  let templates: Template[] = []
  let routes:    RouteSchedule[] = []
  let driversPending = 0
  let stopsWithEmail = 0
  let queueStats = { pending: 0, sent: 0, failed: 0 }
  let testEmailDefault = ''

  try {
    const [tplRes, routesRes, schedRes, driversRes, monthDelRes, stopsRes, queueRes, settingsRes] = await Promise.all([
      sb.from('circulation_email_templates').select('*').order('id'),
      sb.from('circulation_routes').select('id, name').eq('market', dbKey).eq('active', true).order('sort_order').order('name'),
      sb.from('circulation_route_schedules').select('route_id, delivery_start_day, archive_day, late_submit_days'),
      sb.from('circulation_drivers').select('user_id').eq('market', dbKey).eq('active', true),
      sb.from('circulation_deliveries').select('driver_id, status').eq('market', dbKey).eq('month', month),
      sb.from('circulation_stops').select('id', { count: 'exact', head: true })
        .eq('market', dbKey).eq('active', true).eq('is_pickup', false).not('contact_email', 'is', null),
      sb.from('circulation_email_queue').select('status').eq('market', dbKey),
      sb.from('circulation_settings').select('key, value').eq('market', dbKey).in('key', ['admin_email', 'ops_email']),
    ])

    templates = ((tplRes.data ?? []) as Template[])
    const routesBase = (routesRes.data ?? []) as Array<{ id: string; name: string }>
    const schedules  = (schedRes.data ?? []) as Array<{ route_id: string; delivery_start_day: number; archive_day: number; late_submit_days: number }>
    const schedMap   = new Map(schedules.map(s => [s.route_id, s]))
    routes = routesBase.map(r => {
      const s = schedMap.get(r.id)
      return {
        route_id:           r.id,
        route_name:         r.name,
        delivery_start_day: s?.delivery_start_day ?? 1,
        archive_day:        s?.archive_day        ?? 20,
        late_submit_days:   s?.late_submit_days   ?? 10,
      }
    })

    const allDrivers   = (driversRes.data ?? []) as Array<{ user_id: string }>
    const monthlyDels  = (monthDelRes.data ?? []) as Array<{ driver_id: string; status: string }>
    const submittedSet = new Set(monthlyDels.filter(d => d.status !== 'draft').map(d => d.driver_id))
    driversPending     = allDrivers.filter(d => !submittedSet.has(d.user_id)).length

    stopsWithEmail = stopsRes.count ?? 0

    for (const q of (queueRes.data ?? []) as Array<{ status: string }>) {
      if (q.status === 'pending') queueStats.pending++
      else if (q.status === 'sent') queueStats.sent++
      else if (q.status === 'failed') queueStats.failed++
    }

    for (const s of (settingsRes.data ?? []) as Array<{ key: string; value: string }>) {
      if (s.key === 'admin_email' || s.key === 'ops_email') {
        if (!testEmailDefault) testEmailDefault = s.value
      }
    }
  } catch { /* table missing */ }

  return (
    <EmailCenterClient
      market={dbKey}
      monthLabel={monthLabel}
      driversPending={driversPending}
      stopsWithEmail={stopsWithEmail}
      templates={templates}
      routes={routes}
      queueStats={queueStats}
      testEmailDefault={testEmailDefault}
    />
  )
}
