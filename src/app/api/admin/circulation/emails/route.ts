// Email Center action endpoint — single POST with `action` dispatch.
//
// POST /api/admin/circulation/emails
//   { action: 'send-on-our-way', route_id?, market }     — bulk enqueue
//   { action: 'send-reminders',  month?, market }        — to unsubmitted drivers
//   { action: 'send-test',       to_email,    market }   — single test send
//   { action: 'process-queue',   batch_size?, market }   — drain queue
//   { action: 'queue-stats',     market }                — counts by status

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { renderTemplate, getSettings, emailLayout } from '@/lib/circulation/email'
import { enqueue, enqueueMany, drainQueue, type EnqueueRow } from '@/lib/circulation/emailQueue'
import { regionForMarket } from '@/lib/circulation/regions'

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

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    action?:     string
    market?:     string
    route_id?:   string
    month?:      string
    to_email?:   string
    batch_size?: number
  } | null
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })
  const market = body.market?.trim() || 'rrp'
  const region = regionForMarket(market)

  const client = sb()
  const settings = await getSettings(market)

  // ── send-test ─────────────────────────────────────────────────────────
  if (body.action === 'send-test') {
    if (!body.to_email) return NextResponse.json({ error: 'to_email required' }, { status: 400 })
    const html = emailLayout({
      brandName:  BRAND_DEFAULT.brandName,
      brandColor: BRAND_DEFAULT.brandColor,
      title:      `Test from ${region.name} distribution`,
      bodyHtml:   `<p>If you're seeing this in your inbox, the Email Center is wired up correctly.</p><p>Sent at ${new Date().toLocaleString()}.</p>`,
    })
    const result = await enqueue({
      market,
      to_email: body.to_email,
      subject:  `Test from ${region.name} distribution`,
      body_html: html,
      reply_to:  settings.ops_email || null,
    })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
    // Try to drain immediately so the admin sees it land.
    const drained = await drainQueue(market, 1)
    return NextResponse.json({ ok: true, queued: 1, ...drained })
  }

  // ── send-on-our-way ───────────────────────────────────────────────────
  // For each active stop on the route (or whole region), enqueue an email
  // to its contact_email — if it has one — using the stop_on_our_way
  // template. The PHP version sends one per publication carried; we collapse
  // to one email per stop with each pub's quantity inline (more readable).
  if (body.action === 'send-on-our-way') {
    const monthLabel = fmtMonth(body.month ?? thisMonth())

    let stopsQuery = client
      .from('circulation_stops')
      .select('id, name, address, city, contact_name, contact_email, quantities, route_id')
      .eq('market', market)
      .eq('active', true)
      .eq('not_delivering', false)
      .not('contact_email', 'is', null)
    if (body.route_id) stopsQuery = stopsQuery.eq('route_id', body.route_id)

    const { data: stops, error } = await stopsQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows: EnqueueRow[] = []
    for (const s of (stops ?? []) as Array<{
      id: string; name: string; address: string | null; contact_name: string | null;
      contact_email: string; quantities: Record<string, number> | null;
    }>) {
      const email = (s.contact_email ?? '').trim()
      if (!email) continue
      const quantityLine = s.quantities && Object.keys(s.quantities).length > 0
        ? Object.entries(s.quantities).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')
        : ''
      const rendered = await renderTemplate({
        market,
        key:        'stop_on_our_way',
        context:    {
          contact_first: firstName(s.contact_name ?? ''),
          pub_name:      region.publications.map(p => p.toUpperCase()).join(' & '),
          stop_name:     s.name,
          month:         monthLabel,
          quantity_line: quantityLine,
        },
        brandName:  BRAND_DEFAULT.brandName,
        brandColor: BRAND_DEFAULT.brandColor,
      })
      if (!rendered) continue
      rows.push({
        market,
        template_key:   'stop_on_our_way',
        to_email:       email,
        to_name:        s.contact_name,
        subject:        rendered.subject,
        body_html:      rendered.html,
        reply_to:       settings.ops_email || null,
        related_stop_id: s.id,
      })
    }
    const result = await enqueueMany(rows)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, queued: result.inserted })
  }

  // ── send-reminders ────────────────────────────────────────────────────
  // For every active driver in this region with at least one assigned route,
  // check if they've submitted a delivery for the target month. If not, fire
  // the driver_reminder template.
  if (body.action === 'send-reminders') {
    const monthStr  = body.month ?? thisMonth()
    const monthLabel = fmtMonth(monthStr)
    const archiveDay = parseInt(settings.archive_day ?? '20', 10)

    // Active drivers + their assigned route names.
    const { data: drivers } = await client
      .from('circulation_drivers')
      .select('user_id, full_name, email')
      .eq('market', market)
      .eq('active', true)
    type Driver = { user_id: string; full_name: string; email: string }
    const driverList = (drivers as Driver[] | null ?? [])

    const { data: assigns } = await client
      .from('circulation_driver_routes')
      .select('driver_id, route_id, circulation_routes(name)')
    type ARow = { driver_id: string; route_id: string; circulation_routes?: { name: string } | null }
    const assignsList = (assigns as ARow[] | null ?? [])

    const routesByDriver = new Map<string, string[]>()
    for (const a of assignsList) {
      const arr = routesByDriver.get(a.driver_id) ?? []
      if (a.circulation_routes?.name) arr.push(a.circulation_routes.name)
      routesByDriver.set(a.driver_id, arr)
    }

    // Find which drivers have already submitted.
    const { data: submitted } = await client
      .from('circulation_deliveries')
      .select('driver_id')
      .eq('market', market)
      .eq('month',  monthStr)
      .neq('status', 'draft')
    const submittedIds = new Set((submitted ?? []).map(r => (r as { driver_id: string }).driver_id))

    const rows: EnqueueRow[] = []
    for (const d of driverList) {
      if (submittedIds.has(d.user_id)) continue
      if (!(routesByDriver.get(d.user_id) ?? []).length) continue  // skip drivers with no routes
      const rendered = await renderTemplate({
        market,
        key:        'driver_reminder',
        context:    {
          first_name:  firstName(d.full_name),
          month:       monthLabel,
          archive_day: archiveDay,
          route_list:  (routesByDriver.get(d.user_id) ?? []).join(', '),
        },
        brandName:  BRAND_DEFAULT.brandName,
        brandColor: BRAND_DEFAULT.brandColor,
      })
      if (!rendered) continue
      rows.push({
        market,
        template_key:     'driver_reminder',
        to_email:         d.email,
        to_name:          d.full_name,
        subject:          rendered.subject,
        body_html:        rendered.html,
        reply_to:         settings.ops_email || null,
        related_driver_id: d.user_id,
      })
    }
    const result = await enqueueMany(rows)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, queued: result.inserted, eligible: rows.length })
  }

  // ── process-queue ─────────────────────────────────────────────────────
  if (body.action === 'process-queue') {
    const batch = body.batch_size ?? 30
    const result = await drainQueue(market, batch)
    return NextResponse.json({ ok: true, ...result })
  }

  // ── queue-stats ───────────────────────────────────────────────────────
  if (body.action === 'queue-stats') {
    const { data } = await client
      .from('circulation_email_queue')
      .select('status', { count: 'exact' })
      .eq('market', market)
    const stats: Record<string, number> = { pending: 0, sending: 0, sent: 0, failed: 0 }
    for (const r of (data ?? []) as Array<{ status: string }>) {
      stats[r.status] = (stats[r.status] ?? 0) + 1
    }
    return NextResponse.json({ ok: true, stats })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const url    = new URL(req.url)
  const market = url.searchParams.get('market')?.trim() || 'rrp'
  // Recent queue rows (admin can see status, errors).
  const { data } = await sb()
    .from('circulation_email_queue')
    .select('id, status, to_email, subject, template_key, last_error, attempts, sent_at, created_at')
    .eq('market', market)
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json({ recent: data ?? [] })
}
