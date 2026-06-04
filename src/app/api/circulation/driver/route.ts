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

export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

async function getDriver(): Promise<{ user_id: string; market: string; can_view_all: boolean; full_name: string } | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await admin()
    .from('circulation_drivers')
    .select('user_id, market, can_view_all, full_name')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  return (data as { user_id: string; market: string; can_view_all: boolean; full_name: string } | null) ?? null
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

export async function POST(req: NextRequest) {
  const driver = await getDriver()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    delivery_stop_id?: string
    checked?:    boolean
    notes?:      string | null
    flag?:       string | null
    flag_note?:  string | null
  } | null
  if (!body?.delivery_stop_id) return NextResponse.json({ error: 'delivery_stop_id required' }, { status: 400 })

  const sb = admin()

  // Verify this delivery_stop belongs to a delivery owned by this driver
  // — drivers can't toggle someone else's checklist by manipulating ids.
  const { data: row, error: lookErr } = await sb
    .from('circulation_delivery_stops')
    .select('id, delivery_id, circulation_deliveries(driver_id)')
    .eq('id', body.delivery_stop_id)
    .maybeSingle()
  if (lookErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // The joined column will look like { driver_id: '...' } when the embed worked.
  const ownerId = (row as { circulation_deliveries?: { driver_id?: string } | null }).circulation_deliveries?.driver_id
  if (ownerId !== driver.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (body.checked !== undefined) {
    updates.checked    = body.checked
    updates.checked_at = body.checked ? new Date().toISOString() : null
  }
  if (body.notes      !== undefined) updates.notes      = body.notes
  if (body.flag       !== undefined) updates.flag       = body.flag
  if (body.flag_note  !== undefined) updates.flag_note  = body.flag_note

  const { error } = await sb.from('circulation_delivery_stops').update(updates).eq('id', body.delivery_stop_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
