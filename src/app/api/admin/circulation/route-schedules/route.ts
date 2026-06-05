// Per-route schedule editor for delivery_start_day / archive_day / late_submit_days.
//
// GET    /api/admin/circulation/route-schedules?market=rrp
//          → returns every active route + their schedule (or defaults)
// PATCH  /api/admin/circulation/route-schedules
//          → { route_id, delivery_start_day?, archive_day?, late_submit_days? }
//          → upserts the row

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
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'

  const client = sb()
  const [routesRes, schedRes] = await Promise.all([
    client.from('circulation_routes').select('id, name').eq('market', market).eq('active', true).order('sort_order').order('name'),
    client.from('circulation_route_schedules').select('*'),
  ])
  if (routesRes.error) return NextResponse.json({ error: routesRes.error.message }, { status: 500 })

  const schedByRoute = new Map<string, { delivery_start_day: number; archive_day: number; late_submit_days: number }>()
  for (const s of (schedRes.data ?? []) as Array<{ route_id: string; delivery_start_day: number; archive_day: number; late_submit_days: number }>) {
    schedByRoute.set(s.route_id, s)
  }

  const merged = (routesRes.data ?? []).map(r => {
    const id = r.id as string
    const s = schedByRoute.get(id)
    return {
      route_id:           id,
      route_name:         r.name as string,
      delivery_start_day: s?.delivery_start_day ?? 1,
      archive_day:        s?.archive_day        ?? 20,
      late_submit_days:   s?.late_submit_days   ?? 10,
    }
  })

  return NextResponse.json({ schedules: merged })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    route_id?:           string
    delivery_start_day?: number
    archive_day?:        number
    late_submit_days?:   number
  } | null
  if (!body?.route_id) return NextResponse.json({ error: 'route_id required' }, { status: 400 })

  const updates: Record<string, unknown> = { route_id: body.route_id }
  if (body.delivery_start_day !== undefined) updates.delivery_start_day = body.delivery_start_day
  if (body.archive_day        !== undefined) updates.archive_day        = body.archive_day
  if (body.late_submit_days   !== undefined) updates.late_submit_days   = body.late_submit_days

  // Upsert — most rows don't exist yet (defaulted in the listing API).
  const { error } = await sb()
    .from('circulation_route_schedules')
    .upsert(updates, { onConflict: 'route_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
