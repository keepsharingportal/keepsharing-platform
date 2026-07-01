// Admin route order management.
//
// GET   /api/admin/circulation/route-order?route_id=... — stops + snapshots + pending driver suggestions
// PUT   /api/admin/circulation/route-order  body { route_id, ids, snapshot_label? }
//          → save the new order. Writes a snapshot of the OLD order first
//            so the admin can restore.
// POST  /api/admin/circulation/route-order  body { route_id, action: 'restore', snapshot_id }
//          → restore from a saved snapshot
// PATCH /api/admin/circulation/route-order  body { suggestion_id, action: 'approve'|'reject', admin_note? }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const routeId = new URL(req.url).searchParams.get('route_id')?.trim()
  if (!routeId) return NextResponse.json({ error: 'route_id required' }, { status: 400 })

  const client = sb()
  const [stopsRes, snapshotsRes, suggestionsRes, routeRes] = await Promise.all([
    client.from('circulation_stops')
      .select('id, name, address, city, sort_order, is_pickup')
      .eq('route_id', routeId)
      .order('sort_order', { ascending: true }),
    client.from('circulation_route_snapshots')
      .select('id, label, created_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false })
      .limit(20),
    client.from('circulation_route_suggestions')
      .select('id, driver_id, suggestion, status, created_at, circulation_drivers(full_name)')
      .eq('route_id', routeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    client.from('circulation_routes').select('id, name').eq('id', routeId).maybeSingle(),
  ])

  return NextResponse.json({
    route:       routeRes.data,
    stops:       stopsRes.data ?? [],
    snapshots:   snapshotsRes.data ?? [],
    suggestions: suggestionsRes.data ?? [],
  })
}

export async function PUT(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { route_id?: string; ids?: string[]; snapshot_label?: string } | null
  if (!body?.route_id || !Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'route_id + ids[] required' }, { status: 400 })
  }
  const client = sb()

  // Snapshot the current state first.
  const { data: prior } = await client
    .from('circulation_stops')
    .select('id, sort_order, name')
    .eq('route_id', body.route_id)
    .order('sort_order', { ascending: true })
  if (prior && prior.length > 0) {
    await client.from('circulation_route_snapshots').insert({
      route_id: body.route_id,
      snapshot: prior,
      label:    body.snapshot_label ?? `Before ${new Date().toISOString().slice(0, 10)} reorder`,
    })
  }

  // Write the new order.
  for (let i = 0; i < body.ids.length; i++) {
    const { error } = await client
      .from('circulation_stops')
      .update({ sort_order: i })
      .eq('id', body.ids[i])
      .eq('route_id', body.route_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reordered: body.ids.length })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    route_id?:    string
    action?:      'restore'
    snapshot_id?: string
  } | null
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  if (body.action === 'restore') {
    if (!body.snapshot_id || !body.route_id) return NextResponse.json({ error: 'snapshot_id + route_id required' }, { status: 400 })
    const client = sb()
    const { data: snap } = await client
      .from('circulation_route_snapshots')
      .select('snapshot')
      .eq('id', body.snapshot_id)
      .maybeSingle()
    if (!snap) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    type SnapItem = { id: string; sort_order: number }
    const items = (snap.snapshot as SnapItem[] | null ?? [])

    // Snapshot the current state before restoring so the restore itself is undoable.
    const { data: prior } = await client
      .from('circulation_stops')
      .select('id, sort_order, name')
      .eq('route_id', body.route_id)
      .order('sort_order', { ascending: true })
    if (prior && prior.length > 0) {
      await client.from('circulation_route_snapshots').insert({
        route_id: body.route_id,
        snapshot: prior,
        label:    `Before restore ${new Date().toISOString().slice(0, 10)}`,
      })
    }

    for (const it of items) {
      await client.from('circulation_stops')
        .update({ sort_order: it.sort_order })
        .eq('id', it.id)
        .eq('route_id', body.route_id)
    }
    return NextResponse.json({ ok: true, restored: items.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    suggestion_id?: string
    action?:        'approve' | 'reject'
    admin_note?:    string
  } | null
  if (!body?.suggestion_id || !body.action) return NextResponse.json({ error: 'suggestion_id + action required' }, { status: 400 })

  const client = sb()

  if (body.action === 'approve') {
    // Pull the suggestion + route_id + new_stops + stop_order, snapshot
    // the current route, create any new stops, then apply the reorder.
    const { data: sugg } = await client
      .from('circulation_route_suggestions')
      .select('id, route_id, stop_order, suggestion, new_stops, remove_stop_ids')
      .eq('id', body.suggestion_id)
      .maybeSingle()
    if (!sugg) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    type NewStop = { temp_id: string; name: string; address?: string; city?: string; zip?: string; notes?: string; quantities?: Record<string, number> }
    type S = { id: string; route_id: string; stop_order: unknown; suggestion: unknown; new_stops: NewStop[] | null; remove_stop_ids: string[] | null }
    const s = sugg as S

    // Prefer the newer `stop_order` field but fall back to legacy
    // `suggestion` for pre-migration-212 rows.
    const rawOrder = s.stop_order ?? s.suggestion
    let ids: string[] = []
    try {
      ids = typeof rawOrder === 'string' ? JSON.parse(rawOrder) : (rawOrder as string[])
    } catch { ids = [] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Suggestion has no ordered stops' }, { status: 400 })
    }

    // Look up the route's market — new stops need it.
    const { data: routeRow } = await client
      .from('circulation_routes')
      .select('market')
      .eq('id', s.route_id)
      .maybeSingle()
    const market = (routeRow as { market?: string } | null)?.market ?? 'rrp'

    // Create new stops (if any) and build temp_id → real UUID map.
    const tempToReal = new Map<string, string>()
    for (const ns of (s.new_stops ?? [])) {
      if (!ns.temp_id || !ns.name?.trim()) continue
      const { data: created, error: createErr } = await client
        .from('circulation_stops')
        .insert({
          market,
          route_id:       s.route_id,
          name:           ns.name.trim(),
          address:        ns.address?.trim() || null,
          city:           ns.city?.trim() || null,
          zip:            ns.zip?.trim() || null,
          notes:          ns.notes?.trim() || null,
          quantities:     ns.quantities ?? {},
          active:         true,
          is_pickup:      false,
          not_delivering: false,
          sort_order:     ids.length + 1000,  // placeholder — final position set below
        })
        .select('id')
        .single()
      if (createErr) return NextResponse.json({ error: `Failed to create stop "${ns.name}": ${createErr.message}` }, { status: 500 })
      tempToReal.set(ns.temp_id, (created as { id: string }).id)
    }

    // Substitute temp_ids in the order with real UUIDs, then strip any
    // stops the driver marked for removal (they've already been reordered
    // OUT of the list on the driver side, but be defensive).
    const removeSet = new Set(Array.isArray(s.remove_stop_ids) ? s.remove_stop_ids : [])
    const finalOrder = ids
      .map(id => tempToReal.get(id) ?? id)
      .filter(id => !removeSet.has(id))

    // Deactivate every stop marked for removal. active=false hides it
    // from every driver route + the public map; delivery_stops history
    // is preserved via the FK. Admin can restore in Routes & Stops.
    if (removeSet.size > 0) {
      const { error: rmErr } = await client
        .from('circulation_stops')
        .update({
          active:              false,
          not_delivering:      true,
          not_delivering_note: 'Removed by driver request',
        })
        .in('id', Array.from(removeSet))
        .eq('route_id', s.route_id)
      if (rmErr) return NextResponse.json({ error: `Failed to remove stops: ${rmErr.message}` }, { status: 500 })
    }

    // Snapshot BEFORE writing the new order so admin can restore.
    const { data: prior } = await client
      .from('circulation_stops')
      .select('id, sort_order, name')
      .eq('route_id', s.route_id)
      .order('sort_order', { ascending: true })
    if (prior && prior.length > 0) {
      await client.from('circulation_route_snapshots').insert({
        route_id: s.route_id,
        snapshot: prior,
        label:    `Before driver suggestion ${new Date().toISOString().slice(0, 10)}`,
      })
    }

    // Apply the new order.
    for (let i = 0; i < finalOrder.length; i++) {
      await client.from('circulation_stops').update({ sort_order: i }).eq('id', finalOrder[i]).eq('route_id', s.route_id)
    }
    await client.from('circulation_route_suggestions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', body.suggestion_id)
    return NextResponse.json({
      ok:                true,
      new_stops_created: tempToReal.size,
      stops_removed:     removeSet.size,
    })
  }

  // Reject
  await client.from('circulation_route_suggestions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', body.suggestion_id)
  return NextResponse.json({ ok: true })
}
