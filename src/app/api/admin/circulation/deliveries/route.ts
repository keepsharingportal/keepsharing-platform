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
import { enqueueBookkeeperInvoice } from '@/lib/circulation/bookkeeperInvoice'
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
    action?:           'mark-paid' | 'mark-reviewed' | 'reopen' | 'resend-bookkeeper-invoice'
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

  if (body.action === 'resend-bookkeeper-invoice') {
    const enqueued = await resendOne(client, body.id)
    if (!enqueued.ok) return NextResponse.json({ error: enqueued.error }, { status: enqueued.status ?? 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ── POST: bulk resend bookkeeper invoices for a market + month ──
// Body: { market, month }  → resends the bookkeeper email for every
// row in that market/month with status IN (submitted, reviewed, paid).
// Draft rows are skipped — they haven't been submitted yet, so there's
// nothing to invoice. Response includes the count queued so the admin
// UI can confirm.
export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    market?: string
    month?:  string
    action?: 'resend-bookkeeper-invoices'
  } | null
  if (body?.action !== 'resend-bookkeeper-invoices') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  const market = (body.market ?? '').trim()
  const month  = (body.month  ?? '').trim()
  if (!market || !month) {
    return NextResponse.json({ error: 'market + month required' }, { status: 400 })
  }

  const client   = sb()
  const settings = await getSettings(market)
  const bookkeeperEmail = (settings.admin_email ?? '').trim()
  if (!bookkeeperEmail) {
    return NextResponse.json({ error: 'No bookkeeper email configured for this market.' }, { status: 400 })
  }

  const { data: rows, error } = await client
    .from('circulation_deliveries')
    .select('id, driver_id, route_id, month, status, stops_completed, pay_calculated, gas_amount, driver_notes, circulation_drivers(full_name, rate_per_stop), circulation_routes(name)')
    .eq('market', market)
    .eq('month',  month)
    .in('status', ['submitted', 'reviewed', 'paid'])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    id: string; driver_id: string; route_id: string; month: string; status: string
    stops_completed: number | null; pay_calculated: number | null
    gas_amount: number | null; driver_notes: string | null
    circulation_drivers?: { full_name?: string; rate_per_stop?: number } | null
    circulation_routes?:  { name?: string } | null
  }
  let queued = 0
  for (const r of (rows ?? []) as Row[]) {
    const stops = r.stops_completed ?? 0
    const rate  = Number(r.circulation_drivers?.rate_per_stop ?? 0)
    const pay   = Number(r.pay_calculated ?? 0)
    const gas   = Number(r.gas_amount     ?? 0)
    await enqueueBookkeeperInvoice({
      market,
      deliveryId:      r.id,
      driverId:        r.driver_id,
      driverName:      r.circulation_drivers?.full_name ?? '',
      routeName:       r.circulation_routes?.name ?? '',
      month:           r.month,
      stops,
      ratePerStop:     rate,
      stopPay:         pay,
      gasAmount:       gas,
      driverNotes:     r.driver_notes,
      bookkeeperEmail,
      opsEmailReplyTo: settings.ops_email || null,
    })
    queued++
  }
  return NextResponse.json({ ok: true, queued })
}

// Per-row resend used by PATCH { action: 'resend-bookkeeper-invoice', id }.
// Returns discriminated result so the caller can pick the right HTTP code.
async function resendOne(
  client: ReturnType<typeof sb>,
  deliveryId: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const { data: row, error } = await client
    .from('circulation_deliveries')
    .select('id, market, driver_id, route_id, month, stops_completed, pay_calculated, gas_amount, driver_notes, circulation_drivers(full_name, rate_per_stop), circulation_routes(name)')
    .eq('id', deliveryId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!row)  return { ok: false, error: 'Delivery not found', status: 404 }
  type Row = {
    id: string; market: string; driver_id: string; route_id: string; month: string
    stops_completed: number | null; pay_calculated: number | null
    gas_amount: number | null; driver_notes: string | null
    circulation_drivers?: { full_name?: string; rate_per_stop?: number } | null
    circulation_routes?:  { name?: string } | null
  }
  const r = row as Row
  const settings = await getSettings(r.market)
  const bookkeeperEmail = (settings.admin_email ?? '').trim()
  if (!bookkeeperEmail) return { ok: false, error: 'No bookkeeper email configured for this market.', status: 400 }
  await enqueueBookkeeperInvoice({
    market:          r.market,
    deliveryId:      r.id,
    driverId:        r.driver_id,
    driverName:      r.circulation_drivers?.full_name ?? '',
    routeName:       r.circulation_routes?.name ?? '',
    month:           r.month,
    stops:           r.stops_completed ?? 0,
    ratePerStop:     Number(r.circulation_drivers?.rate_per_stop ?? 0),
    stopPay:         Number(r.pay_calculated ?? 0),
    gasAmount:       Number(r.gas_amount     ?? 0),
    driverNotes:     r.driver_notes,
    bookkeeperEmail,
    opsEmailReplyTo: settings.ops_email || null,
  })
  return { ok: true }
}
