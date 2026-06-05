// Daily cron — fires scheduled circulation emails and drains the queue.
//
// Configured in vercel.json to run once per day. Vercel's cron header
// authenticates the request (CRON_SECRET env var); we reject anything else
// so it can't be called from the public web.
//
// What runs each tick:
//   1. Per region: if today === settings.reminder_day → fire driver_reminder
//      for every driver without a submitted delivery for the current month
//   2. Per region: if today === settings.on_our_way_day → fire on-our-way
//      to every stop with a contact_email
//   3. Drain the queue for every region (batch size 30)
//
// In Phase C we can also wire archive_day → mark the month archived.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CIRCULATION_REGIONS } from '@/lib/circulation/regions'
import { renderTemplate, getSettings } from '@/lib/circulation/email'
import { enqueueMany, drainQueue, type EnqueueRow } from '@/lib/circulation/emailQueue'

export const runtime = 'nodejs'
export const maxDuration = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonth(m: string): string {
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function firstName(full: string): string { return (full ?? '').split(' ')[0] ?? '' }

const BRAND_DEFAULT = { brandName: 'River Region Distribution', brandColor: '#1A5FA8' }

export async function GET(req: NextRequest) {
  // Auth — Vercel cron sends a header. Allow either the Vercel header OR a
  // ?secret=... query param matching CRON_SECRET (handy for manual testing).
  const cronHeader = req.headers.get('x-vercel-cron')
  const secretParam = new URL(req.url).searchParams.get('secret')
  const expected    = process.env.CRON_SECRET
  if (!cronHeader && (!expected || secretParam !== expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today    = new Date().getDate()
  const monthStr = thisMonth()
  const monthLbl = fmtMonth(monthStr)

  const summary: Array<{ market: string; reminderQueued: number; onOurWayQueued: number; drain: { sent: number; failed: number } }> = []

  for (const region of CIRCULATION_REGIONS) {
    const market = region.slug
    const settings   = await getSettings(market)
    const reminderDay = parseInt(settings.reminder_day ?? '17', 10)
    const onOurWayDay = parseInt(settings.on_our_way_day ?? '1', 10)
    const archiveDay  = parseInt(settings.archive_day ?? '20', 10)

    let reminderQueued = 0
    let onOurWayQueued = 0

    if (today === reminderDay) {
      reminderQueued = await fireReminders(market, monthStr, monthLbl, archiveDay)
    }
    if (today === onOurWayDay) {
      onOurWayQueued = await fireOnOurWay(market, monthLbl, region.publications)
    }

    const drain = await drainQueue(market, 30)
    summary.push({ market, reminderQueued, onOurWayQueued, drain: { sent: drain.sent, failed: drain.failed } })
  }

  return NextResponse.json({ ok: true, summary })
}

async function fireReminders(market: string, monthStr: string, monthLbl: string, archiveDay: number): Promise<number> {
  const client = sb()
  const { data: drivers } = await client.from('circulation_drivers')
    .select('user_id, full_name, email')
    .eq('market', market).eq('active', true)
  const { data: submitted } = await client.from('circulation_deliveries')
    .select('driver_id')
    .eq('market', market).eq('month', monthStr).neq('status', 'draft')
  const submittedIds = new Set((submitted ?? []).map(r => (r as { driver_id: string }).driver_id))
  const { data: assigns } = await client.from('circulation_driver_routes')
    .select('driver_id, circulation_routes(name)')
  type ARow = { driver_id: string; circulation_routes?: { name: string } | null }
  const routesByDriver = new Map<string, string[]>()
  for (const a of (assigns as ARow[] | null ?? [])) {
    const arr = routesByDriver.get(a.driver_id) ?? []
    if (a.circulation_routes?.name) arr.push(a.circulation_routes.name)
    routesByDriver.set(a.driver_id, arr)
  }

  const rows: EnqueueRow[] = []
  for (const d of (drivers as Array<{ user_id: string; full_name: string; email: string }> | null ?? [])) {
    if (submittedIds.has(d.user_id)) continue
    if (!(routesByDriver.get(d.user_id) ?? []).length) continue
    const r = await renderTemplate({
      market, key: 'driver_reminder',
      context: {
        first_name: firstName(d.full_name),
        month: monthLbl,
        archive_day: archiveDay,
        route_list: (routesByDriver.get(d.user_id) ?? []).join(', '),
      },
      brandName: BRAND_DEFAULT.brandName,
      brandColor: BRAND_DEFAULT.brandColor,
    })
    if (!r) continue
    rows.push({
      market, template_key: 'driver_reminder',
      to_email: d.email, to_name: d.full_name,
      subject: r.subject, body_html: r.html,
      related_driver_id: d.user_id,
    })
  }
  const result = await enqueueMany(rows)
  return result.inserted
}

async function fireOnOurWay(market: string, monthLbl: string, publications: string[]): Promise<number> {
  const client = sb()
  const { data: stops } = await client.from('circulation_stops')
    .select('id, name, contact_name, contact_email, quantities')
    .eq('market', market).eq('active', true).eq('not_delivering', false)
    .not('contact_email', 'is', null)

  const pubLabel = publications.map(p => p.toUpperCase()).join(' & ')
  const rows: EnqueueRow[] = []
  for (const s of (stops as Array<{ id: string; name: string; contact_name: string | null; contact_email: string; quantities: Record<string, number> | null }> | null ?? [])) {
    const r = await renderTemplate({
      market, key: 'stop_on_our_way',
      context: {
        contact_first: firstName(s.contact_name ?? ''),
        pub_name: pubLabel,
        stop_name: s.name,
        month: monthLbl,
        quantity_line: s.quantities
          ? Object.entries(s.quantities).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')
          : '',
      },
      brandName: BRAND_DEFAULT.brandName,
      brandColor: BRAND_DEFAULT.brandColor,
    })
    if (!r) continue
    rows.push({
      market, template_key: 'stop_on_our_way',
      to_email: s.contact_email, to_name: s.contact_name,
      subject: r.subject, body_html: r.html,
      related_stop_id: s.id,
    })
  }
  const result = await enqueueMany(rows)
  return result.inserted
}
