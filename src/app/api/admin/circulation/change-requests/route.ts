// Admin API for driver-submitted change requests (flagged stops).
//
// GET    /api/admin/circulation/change-requests?market=rrp&status=pending
// PATCH  /api/admin/circulation/change-requests
//          → { id, action: 'approve' | 'reject', admin_note? }
//          → { id, action: 'apply', updates }   — actually apply the change
//                                                  to the stop and mark approved

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
  const url    = new URL(req.url)
  const market = url.searchParams.get('market')?.trim() || 'rrp'
  const status = url.searchParams.get('status')?.trim() || 'pending'

  const { data, error } = await sb()
    .from('circulation_change_requests')
    .select(`
      id, market, type, field_name, old_value, new_value, notes, status,
      created_at, reviewed_at, stop_id, route_id, driver_id,
      circulation_stops(name, address, city, route_id),
      circulation_routes(name),
      circulation_drivers(full_name, email)
    `)
    .eq('market', market)
    .eq('status', status)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    id?:         string
    action?:     'approve' | 'reject' | 'apply'
    /** When action=apply: which fields to write on the stop row. */
    updates?:    Record<string, unknown>
  } | null
  if (!body?.id || !body.action) return NextResponse.json({ error: 'id + action required' }, { status: 400 })

  const client = sb()
  const nowIso = new Date().toISOString()

  // For 'apply', read the change request, apply the field update to the stop,
  // then mark the request approved.
  if (body.action === 'apply') {
    const { data: cr } = await client
      .from('circulation_change_requests')
      .select('id, stop_id, field_name, new_value, type')
      .eq('id', body.id)
      .maybeSingle()
    if (!cr) return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    type CR = { id: string; stop_id: string | null; field_name: string | null; new_value: string | null; type: string }
    const r = cr as CR

    if (r.stop_id) {
      const stopUpdate = body.updates ?? (r.field_name ? { [r.field_name]: r.new_value } : null)
      if (stopUpdate) {
        const { error: stopErr } = await client.from('circulation_stops').update(stopUpdate).eq('id', r.stop_id)
        if (stopErr) return NextResponse.json({ error: `Stop update failed: ${stopErr.message}` }, { status: 500 })
      }
      // 'close' type → flip not_delivering=true
      if (r.type === 'close') {
        await client.from('circulation_stops').update({ not_delivering: true, not_delivering_note: 'Closed by driver request' }).eq('id', r.stop_id)
      }
    }

    const { error } = await client
      .from('circulation_change_requests')
      .update({ status: 'approved', reviewed_at: nowIso, reviewed_by: ctx.userId })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const nextStatus = body.action === 'approve' ? 'approved' : 'rejected'
  const { error } = await client
    .from('circulation_change_requests')
    .update({ status: nextStatus, reviewed_at: nowIso, reviewed_by: ctx.userId })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
