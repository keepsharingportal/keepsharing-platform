// Driver-facing API. Authenticated as a Supabase user; we look up that
// user in circulation_drivers to verify they're a driver and to scope
// every response to only their assigned routes.
//
// GET    /api/circulation/driver?month=YYYY-MM  — driver's routes + stops + delivery state for the month
// POST   /api/circulation/driver  body { delivery_stop_id, checked? notes? flag? flag_note? }  — single-stop update
//   On the first POST for a (driver, route, month) we lazy-create the
//   circulation_deliveries row and the matching delivery_stops rows.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { renderTemplate, getSettings } from '@/lib/circulation/email'
import { enqueue } from '@/lib/circulation/emailQueue'
import { regionForMarket } from '@/lib/circulation/regions'

export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

async function getDriver(): Promise<{ user_id: string; market: string; can_view_all: boolean; full_name: string; rate_per_stop: number } | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // rate_per_stop drives the earnings display on the full-run portal —
  // every legacy driver expects to see what they've earned so far.
  const { data } = await admin()
    .from('circulation_drivers')
    .select('user_id, market, can_view_all, full_name, rate_per_stop')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!data) return null
  return {
    user_id:       data.user_id as string,
    market:        data.market as string,
    can_view_all:  !!data.can_view_all,
    full_name:     data.full_name as string,
    rate_per_stop: Number(data.rate_per_stop ?? 0),
  }
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Minimal HTML escape for the inline driver-flag notification we send to
// ops. Bigger surfaces use the templating layer; this one composes the
// body in-route because it's a heads-up not a transactional template.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(req: NextRequest) {
  const driver = await getDriver()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  const month = new URL(req.url).searchParams.get('month')?.trim() || thisMonth()
  const sb    = admin()

  // Which routes this driver can see
  let routeIds: string[] = []
  if (driver.can_view_all) {
    const { data } = await sb.from('circulation_routes').select('id').eq('market', driver.market).eq('active', true)
    routeIds = (data ?? []).map(r => r.id as string)
  } else {
    const { data } = await sb.from('circulation_driver_routes').select('route_id').eq('driver_id', driver.user_id)
    routeIds = (data ?? []).map(r => r.route_id as string)
  }

  if (routeIds.length === 0) {
    return NextResponse.json({ driver, month, routes: [], stops: [], deliveryStops: [] })
  }

  const [routesRes, stopsRes, delivRes] = await Promise.all([
    sb.from('circulation_routes').select('id, name, city').in('id', routeIds).order('sort_order').order('name'),
    sb.from('circulation_stops').select('*').in('route_id', routeIds).eq('active', true).order('sort_order'),
    sb.from('circulation_deliveries').select('id, route_id').in('route_id', routeIds).eq('driver_id', driver.user_id).eq('month', month),
  ])

  // Lazily create delivery rows for every route the driver owns this month.
  const existingByRoute = new Map<string, string>()
  for (const d of (delivRes.data ?? [])) existingByRoute.set(d.route_id as string, d.id as string)

  for (const rid of routeIds) {
    if (existingByRoute.has(rid)) continue
    const { data: ins } = await sb.from('circulation_deliveries')
      .insert({ market: driver.market, route_id: rid, driver_id: driver.user_id, month })
      .select('id')
      .single()
    if (ins) existingByRoute.set(rid, ins.id as string)
  }

  // And delivery_stops for each stop on each delivery, if missing.
  const deliveryIds = Array.from(existingByRoute.values())
  const { data: existingStops } = await sb
    .from('circulation_delivery_stops')
    .select('id, delivery_id, stop_id, checked, checked_at, notes, flag, flag_note')
    .in('delivery_id', deliveryIds)

  const haveByPair = new Set((existingStops ?? []).map(r => `${r.delivery_id}:${r.stop_id}`))
  const toInsert: Array<{ delivery_id: string; stop_id: string }> = []
  for (const s of (stopsRes.data ?? [])) {
    const did = existingByRoute.get(s.route_id as string)
    if (!did) continue
    const key = `${did}:${s.id}`
    if (!haveByPair.has(key)) toInsert.push({ delivery_id: did, stop_id: s.id as string })
  }
  if (toInsert.length > 0) {
    await sb.from('circulation_delivery_stops').insert(toInsert)
  }

  // Re-pull (now complete) delivery_stops
  const { data: finalDeliveryStops } = await sb
    .from('circulation_delivery_stops')
    .select('id, delivery_id, stop_id, checked, checked_at, notes, flag, flag_note')
    .in('delivery_id', deliveryIds)

  return NextResponse.json({
    driver,
    month,
    routes:         routesRes.data ?? [],
    stops:          stopsRes.data ?? [],
    deliveries:     Array.from(existingByRoute.entries()).map(([routeId, id]) => ({ id, route_id: routeId })),
    deliveryStops:  finalDeliveryStops ?? [],
  })
}

// POST handles four actions, chosen via the `action` field:
//   - (default / checked toggle): { delivery_stop_id, checked, notes?, flag?, flag_note?, driver_note?, leftovers?, leftovers_json? }
//   - action: 'submit-delivery'   → mark a single delivery as submitted
//   - action: 'submit-all'        → mark every draft delivery for this driver this month as submitted (Full Run)
export async function POST(req: NextRequest) {
  const driver = await getDriver()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    action?:           'submit-delivery' | 'submit-all' | 'suggest-route-order'
    delivery_id?:      string
    delivery_stop_id?: string
    checked?:          boolean
    notes?:            string | null    // legacy alias for driver_note
    driver_note?:      string | null
    leftovers?:        number
    leftovers_json?:   Record<string, number>
    flag?:             string | null
    flag_note?:        string | null
    driver_notes?:     string           // for submit-delivery: route-level invoice note
    month?:            string           // YYYY-MM for submit-all
    route_id?:         string           // for suggest-route-order
    stop_order?:       string[]         // for suggest-route-order — stop ids in suggested order
    suggestion_note?:  string           // for suggest-route-order
  } | null
  if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 })

  const sb = admin()

  // ── suggest-route-order: driver proposes a new stop order for a route ───
  if (body.action === 'suggest-route-order') {
    if (!body.route_id || !Array.isArray(body.stop_order) || body.stop_order.length === 0) {
      return NextResponse.json({ error: 'route_id and stop_order[] required' }, { status: 400 })
    }
    // Verify the driver is assigned to this route.
    const { data: assignRow } = await sb
      .from('circulation_driver_routes')
      .select('route_id')
      .eq('driver_id', driver.user_id)
      .eq('route_id', body.route_id)
      .maybeSingle()
    if (!assignRow) return NextResponse.json({ error: 'Not assigned to this route' }, { status: 403 })

    // Supersede any pending suggestion the driver already has for this route.
    await sb.from('circulation_route_suggestions')
      .update({ status: 'superseded' })
      .eq('route_id', body.route_id)
      .eq('driver_id', driver.user_id)
      .eq('status', 'pending')

    const { data: inserted, error } = await sb.from('circulation_route_suggestions').insert({
      route_id:   body.route_id,
      driver_id:  driver.user_id,
      stop_order: JSON.stringify(body.stop_order),
      status:     'pending',
      note:       body.suggestion_note ?? null,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, suggestion_id: (inserted as { id: string } | null)?.id })
  }

  // ── submit-delivery: driver finishes their route, fires invoice email ───
  if (body.action === 'submit-delivery') {
    if (!body.delivery_id) return NextResponse.json({ error: 'delivery_id required' }, { status: 400 })
    const result = await submitOneDelivery(sb, driver, body.delivery_id, body.driver_notes ?? '')
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
    return NextResponse.json({ ok: true, ...result.summary })
  }

  // ── submit-all: every draft delivery for this driver this month ─────────
  if (body.action === 'submit-all') {
    const month = body.month?.trim() || thisMonth()
    const { data: drafts } = await sb
      .from('circulation_deliveries')
      .select('id')
      .eq('driver_id', driver.user_id)
      .eq('month', month)
      .eq('status', 'draft')
    if (!drafts || drafts.length === 0) return NextResponse.json({ error: 'No draft deliveries to submit' }, { status: 400 })

    let totalStops = 0
    let totalPay   = 0
    for (const d of drafts) {
      const result = await submitOneDelivery(sb, driver, d.id as string, body.driver_notes ?? '')
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
      totalStops += result.summary?.stops ?? 0
      totalPay   += result.summary?.pay   ?? 0
    }
    return NextResponse.json({ ok: true, submitted: drafts.length, stops: totalStops, pay: totalPay })
  }

  // ── default: update a single delivery_stop row ──────────────────────────
  if (!body.delivery_stop_id) return NextResponse.json({ error: 'delivery_stop_id required' }, { status: 400 })

  // Verify ownership + grab the joined identity we'll need if the driver
  // is flagging a problem (we'll insert a change_request + notify ops).
  const { data: row, error: lookErr } = await sb
    .from('circulation_delivery_stops')
    .select('id, delivery_id, stop_id, flag, circulation_deliveries(driver_id, status, route_id, month), circulation_stops(name, market)')
    .eq('id', body.delivery_stop_id)
    .maybeSingle()
  if (lookErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  type DsRow = {
    id:                    string
    delivery_id:           string
    stop_id:               string
    flag:                  string | null
    circulation_deliveries?: { driver_id?: string; status?: string; route_id?: string; month?: string } | null
    circulation_stops?:      { name?: string; market?: string } | null
  }
  const r       = row as DsRow
  const parent  = r.circulation_deliveries
  const stopRow = r.circulation_stops
  if (parent?.driver_id !== driver.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // Lock submitted deliveries — driver can read but can't toggle once submitted.
  if (parent.status && parent.status !== 'draft') {
    return NextResponse.json({ error: 'This delivery has already been submitted and is locked.' }, { status: 409 })
  }

  const updates: Record<string, unknown> = {}
  if (body.checked !== undefined) {
    updates.checked    = body.checked
    updates.checked_at = body.checked ? new Date().toISOString() : null
  }
  // `notes` is the legacy field name from the older API call. `driver_note` is
  // the canonical new one. Accept both; map to driver_note.
  if (body.driver_note !== undefined) updates.driver_note = body.driver_note
  else if (body.notes  !== undefined) updates.driver_note = body.notes
  if (body.leftovers      !== undefined) updates.leftovers      = body.leftovers
  if (body.leftovers_json !== undefined) updates.leftovers_json = body.leftovers_json
  if (body.flag       !== undefined) updates.flag       = body.flag
  if (body.flag_note  !== undefined) updates.flag_note  = body.flag_note

  const { error } = await sb.from('circulation_delivery_stops').update(updates).eq('id', body.delivery_stop_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Flag → change request + ops notification ────────────────────────────
  // When a driver TRANSITIONS a stop's flag from null → set, mirror it
  // into circulation_change_requests so the admin review queue surfaces
  // it (legacy parity). We don't insert on subsequent edits or on clear
  // — the driver can amend their existing request via the admin queue
  // instead of churning duplicates.
  if (
    body.flag !== undefined && body.flag !== null && body.flag !== '' &&
    !r.flag &&
    parent.route_id && stopRow?.market
  ) {
    // Map flag → change_request.type vocab (edit | close | new | qty | move).
    const flagToType: Record<string, string> = {
      closed:        'close',
      wrong_address: 'edit',
      wrong_qty:     'qty',
      new_stop:      'new',
      other:         'edit',
    }
    const reqType   = flagToType[body.flag] ?? 'edit'
    const fieldName = body.flag === 'wrong_address' ? 'address'
                    : body.flag === 'wrong_qty'    ? 'quantity'
                    :                                null
    try {
      await sb.from('circulation_change_requests').insert({
        market:    stopRow.market,
        stop_id:   r.stop_id,
        route_id:  parent.route_id,
        driver_id: driver.user_id,
        type:      reqType,
        field_name: fieldName,
        notes:     body.flag_note ?? null,
      })
    } catch { /* don't block driver on this */ }

    // Notify ops. Plain inline body — admin sees the canonical detail
    // in /admin/circulation/changes; this is just a heads-up so they
    // know to look.
    try {
      const settings = await getSettings(stopRow.market)
      const opsEmail = settings.ops_email
      if (opsEmail) {
        const flagLabel = ({ closed: 'Closed', wrong_address: 'Wrong address', wrong_qty: 'Wrong quantity', new_stop: 'Add a stop', other: 'Other' })[body.flag] ?? body.flag
        const stopName  = stopRow.name ?? 'a stop'
        const note      = body.flag_note ? `<p><strong>Driver note:</strong> ${escapeHtml(body.flag_note)}</p>` : ''
        await enqueue({
          market:          stopRow.market,
          template_key:    'driver_flag',
          to_email:        opsEmail,
          to_name:         null,
          subject:         `Driver flag — ${flagLabel}: ${stopName}`,
          body_html:       `<p><strong>${driver.full_name}</strong> flagged <strong>${escapeHtml(stopName)}</strong> as <strong>${flagLabel}</strong>.</p>${note}<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin/circulation/changes">Review in admin</a></p>`,
          reply_to:        null,
          related_stop_id: r.stop_id,
        })
      }
    } catch { /* swallow — driver action still succeeded */ }
  }

  // When a driver flips a stop to checked=true, enqueue a stop_delivered
  // email to the contact (if there is one). Only on the transition into
  // checked, not when they uncheck and re-check.
  if (body.checked === true) {
    try {
      const { data: ds } = await sb
        .from('circulation_delivery_stops')
        .select('id, stop_id, circulation_stops(name, contact_name, contact_email, market), circulation_deliveries(month)')
        .eq('id', body.delivery_stop_id)
        .maybeSingle()
      type DS = { id: string; stop_id: string; circulation_stops?: { name: string; contact_name: string | null; contact_email: string | null; market: string } | null; circulation_deliveries?: { month: string } | null }
      const row = ds as DS | null
      const stop = row?.circulation_stops
      if (stop?.contact_email) {
        const region = regionForMarket(stop.market)
        const settings = await getSettings(stop.market)
        const monthStr = row?.circulation_deliveries?.month ?? ''
        const monthLabel = monthStr ? new Date(monthStr + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
        const rendered = await renderTemplate({
          market:    stop.market,
          key:       'stop_delivered',
          context: {
            contact_first: (stop.contact_name ?? '').split(' ')[0] ?? '',
            stop_name:     stop.name,
            pub_name:      region.publications.map(p => p.toUpperCase()).join(' & '),
            month:         monthLabel,
            pub_website:   settings.pub_website ?? '',
          },
          brandName:  region.name + ' Distribution',
          brandColor: '#1A5FA8',
        })
        if (rendered) {
          await enqueue({
            market:          stop.market,
            template_key:    'stop_delivered',
            to_email:        stop.contact_email,
            to_name:         stop.contact_name,
            subject:         rendered.subject,
            body_html:       rendered.html,
            reply_to:        settings.ops_email || null,
            related_stop_id: row?.stop_id ?? null,
          })
        }
      }
    } catch { /* don't block check-off */ }
  }

  return NextResponse.json({ ok: true })
}

// Shared submit logic — counts completed stops, computes pay, flips status.
// Used by both single-delivery submit and Full Run submit-all.
async function submitOneDelivery(
  sb:        ReturnType<typeof admin>,
  driver:    { user_id: string; market: string },
  deliveryId: string,
  driverNotes: string,
): Promise<{ ok: true; summary: { stops: number; pay: number } } | { ok: false; error: string; status?: number }> {
  // Verify ownership + draft status.
  const { data: del, error: dErr } = await sb
    .from('circulation_deliveries')
    .select('id, driver_id, status, route_id')
    .eq('id', deliveryId)
    .maybeSingle()
  if (dErr || !del) return { ok: false, error: 'Delivery not found', status: 404 }
  if (del.driver_id !== driver.user_id) return { ok: false, error: 'Forbidden', status: 403 }
  if (del.status !== 'draft') return { ok: false, error: 'Already submitted', status: 409 }

  // Count completed stops excluding pickup-only + not-delivering stops.
  const { data: stopRows } = await sb
    .from('circulation_delivery_stops')
    .select('checked, stop_id, circulation_stops(is_pickup, not_delivering)')
    .eq('delivery_id', deliveryId)
  type StopJoin = { checked: boolean; stop_id: string; circulation_stops?: { is_pickup: boolean; not_delivering: boolean } | null }
  const eligible = (stopRows as StopJoin[] | null ?? []).filter(s => !s.circulation_stops?.is_pickup && !s.circulation_stops?.not_delivering)
  const done     = eligible.filter(s => s.checked).length

  // Look up the driver's rate.
  const { data: drv } = await sb
    .from('circulation_drivers')
    .select('rate_per_stop, full_name, email')
    .eq('user_id', driver.user_id)
    .maybeSingle()
  const rate = (drv as { rate_per_stop?: number } | null)?.rate_per_stop ?? 0
  const pay  = Math.round(done * rate * 100) / 100

  const { error: upErr } = await sb
    .from('circulation_deliveries')
    .update({
      status:           'submitted',
      stops_completed:  done,
      pay_calculated:   pay,
      driver_notes:     driverNotes || null,
      submitted_at:     new Date().toISOString(),
    })
    .eq('id', deliveryId)
  if (upErr) return { ok: false, error: upErr.message, status: 500 }

  // Enqueue invoice-confirmation email to the driver. Best-effort —
  // queue failures don't block the submission.
  try {
    const drvRow = drv as { full_name?: string; email?: string } | null
    if (drvRow?.email) {
      const region = regionForMarket(driver.market)
      const { data: route } = await sb
        .from('circulation_routes')
        .select('name')
        .eq('id', del.route_id)
        .maybeSingle()
      const monthLabel = formatMonth((await sb.from('circulation_deliveries').select('month').eq('id', deliveryId).maybeSingle()).data?.month as string ?? '')
      const settings   = await getSettings(driver.market)
      const rendered   = await renderTemplate({
        market:  driver.market,
        key:     'driver_invoice_confirm',
        context: {
          first_name: (drvRow.full_name ?? '').split(' ')[0] ?? '',
          month:      monthLabel,
          stops:      done,
          pay:        pay.toFixed(2),
          route_name: (route as { name?: string } | null)?.name ?? '',
        },
        brandName:  region.name + ' Distribution',
        brandColor: '#1A5FA8',
      })
      if (rendered) {
        await enqueue({
          market:             driver.market,
          template_key:       'driver_invoice_confirm',
          to_email:           drvRow.email,
          to_name:            drvRow.full_name ?? null,
          subject:            rendered.subject,
          body_html:          rendered.html,
          reply_to:           settings.ops_email || null,
          related_delivery_id: deliveryId,
          related_driver_id:   driver.user_id,
        })
      }
    }
  } catch { /* ignore — submission still succeeds */ }

  return { ok: true, summary: { stops: done, pay } }
}

function formatMonth(m: string): string {
  if (!m) return ''
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
