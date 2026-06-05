// Admin API for the deliveries (invoices) flow.
//
// GET    /api/admin/circulation/deliveries?market=rrp&month=YYYY-MM
//          → list every delivery for the region+month with driver + route names
// PATCH  /api/admin/circulation/deliveries
//          → { id, action: 'mark-paid'  , pay_final?, adjustment_note? }
//          → { id, action: 'mark-reviewed' }
//          → { id, action: 'reopen' }   — flip back to draft, drivers can edit again

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { renderTemplate, getSettings } from '@/lib/circulation/email'
import { enqueue } from '@/lib/circulation/emailQueue'
import { regionForMarket } from '@/lib/circulation/regions'

export const runtime = 'nodejs'

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

export async function GET(req: NextRequest) {
  await requireAdmin()
  const url    = new URL(req.url)
  const market = url.searchParams.get('market')?.trim() || 'rrp'
  const month  = url.searchParams.get('month')?.trim()  || thisMonth()

  const client = sb()

  // We embed the route name + driver name via the foreign keys so the admin
  // can render without N+1 lookups.
  const { data, error } = await client
    .from('circulation_deliveries')
    .select(`
      id, market, route_id, driver_id, month, status,
      stops_completed, pay_calculated, pay_final, adjustment_note,
      pay_adjustment, pay_adjustment_note, driver_notes,
      submitted_at, reviewed_at, paid_at, created_at, updated_at,
      circulation_routes(name),
      circulation_drivers(full_name, email, rate_per_stop)
    `)
    .eq('market', market)
    .eq('month',  month)
    .order('status',        { ascending: true })
    .order('submitted_at',  { ascending: false, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Drivers who DO have routes for this region but haven't submitted yet.
  // Surface them so the admin can chase down stragglers.
  const { data: assigned } = await client
    .from('circulation_driver_routes')
    .select('driver_id, route_id, circulation_drivers(user_id, full_name, market, active)')
  type ARow = { driver_id: string; route_id: string; circulation_drivers?: { user_id: string; full_name: string; market: string; active: boolean } | null }
  const all = (assigned as ARow[] | null ?? [])
    .filter(a => a.circulation_drivers?.market === market && a.circulation_drivers?.active)
  const assignedDriverIds = new Set(all.map(a => a.driver_id))
  const submittedIds = new Set((data ?? []).filter(d => d.status !== 'draft').map(d => d.driver_id as string))
  const stragglerIds = Array.from(assignedDriverIds).filter(id => !submittedIds.has(id))
  const stragglers = all
    .filter((a, idx, arr) => arr.findIndex(x => x.driver_id === a.driver_id) === idx)
    .filter(a => stragglerIds.includes(a.driver_id))
    .map(a => ({ user_id: a.driver_id, full_name: a.circulation_drivers?.full_name ?? '' }))

  // List months that have any delivery data for this region — filter chips.
  const { data: monthsData } = await client
    .from('circulation_deliveries')
    .select('month')
    .eq('market', market)
    .order('month', { ascending: false })
  const months = Array.from(new Set((monthsData ?? []).map(r => r.month as string)))

  return NextResponse.json({
    deliveries: data ?? [],
    stragglers,
    months,
    month,
  })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    id?:               string
    action?:           'mark-paid' | 'mark-reviewed' | 'reopen'
    pay_final?:        number
    adjustment_note?:  string
  } | null
  if (!body?.id || !body.action) {
    return NextResponse.json({ error: 'id + action required' }, { status: 400 })
  }

  const client = sb()
  const nowIso = new Date().toISOString()

  if (body.action === 'mark-paid') {
    // Pull current row for pay_calculated + driver info (need them for the
    // confirmation email and to default pay_final).
    const { data: cur } = await client
      .from('circulation_deliveries')
      .select('pay_calculated, market, month, driver_id, circulation_drivers(full_name, email)')
      .eq('id', body.id)
      .maybeSingle()
    type Cur = { pay_calculated?: number; market: string; month: string; driver_id: string; circulation_drivers?: { full_name: string; email: string } | null }
    const row = cur as Cur | null
    const calculated = row?.pay_calculated ?? 0
    const payFinal = body.pay_final != null && Number.isFinite(body.pay_final) ? body.pay_final : calculated

    const { error } = await client
      .from('circulation_deliveries')
      .update({
        status:          'paid',
        paid_at:         nowIso,
        pay_final:       payFinal,
        adjustment_note: body.adjustment_note ?? null,
      })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire driver_paid email — best-effort.
    try {
      if (row?.circulation_drivers?.email) {
        const market   = row.market
        const region   = regionForMarket(market)
        const settings = await getSettings(market)
        const monthLabel = (() => {
          const d = new Date(row.month + '-01T12:00:00')
          return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        })()
        const rendered = await renderTemplate({
          market,
          key:     'driver_paid',
          context: {
            first_name: (row.circulation_drivers.full_name ?? '').split(' ')[0] ?? '',
            month:      monthLabel,
            pay:        payFinal.toFixed(2),
          },
          brandName:  region.name + ' Distribution',
          brandColor: '#1A5FA8',
        })
        if (rendered) {
          await enqueue({
            market,
            template_key:        'driver_paid',
            to_email:            row.circulation_drivers.email,
            to_name:             row.circulation_drivers.full_name,
            subject:             rendered.subject,
            body_html:           rendered.html,
            reply_to:            settings.ops_email || null,
            related_delivery_id: body.id,
            related_driver_id:   row.driver_id,
          })
        }
      }
    } catch { /* ignore — payment recorded successfully regardless */ }

    return NextResponse.json({ ok: true })
  }

  if (body.action === 'mark-reviewed') {
    const { error } = await client
      .from('circulation_deliveries')
      .update({ status: 'reviewed', reviewed_at: nowIso })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'reopen') {
    // Clear submitted_at/reviewed_at/paid_at so the timeline isn't confusing.
    const { error } = await client
      .from('circulation_deliveries')
      .update({
        status:       'draft',
        submitted_at: null,
        reviewed_at:  null,
        paid_at:      null,
      })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
