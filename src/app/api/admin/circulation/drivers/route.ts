// CRUD for circulation_drivers.
// GET    /api/admin/circulation/drivers?market=rrp   — list with route assignments
// POST   /api/admin/circulation/drivers              — create driver
// POST   /api/admin/circulation/drivers/resend-welcome — { user_id } re-send welcome + drain
// POST   /api/admin/circulation/drivers/signin-link   — { user_id } → { url } for clipboard
// PATCH  /api/admin/circulation/drivers              — update by user_id
// PUT    /api/admin/circulation/drivers              — set route assignments: { user_id, route_ids }
// DELETE /api/admin/circulation/drivers?user_id=...  — delete (does NOT delete auth.users)
//
// Driver creation:
//   We use Supabase admin.createUser to mint an auth user, then insert
//   the matching circulation_drivers row. The driver gets a magic-link
//   email on first login — no password handed out.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { sendDriverWelcome } from '@/lib/circulation/driverWelcome'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface DriverRow {
  user_id:       string
  market:        string
  full_name:     string
  email:         string
  phone:         string | null
  rate_per_stop: number
  can_view_all:  boolean
  notes:         string | null
  active:        boolean
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'
  const client = sb()

  const { data: drivers, error: dErr } = await client
    .from('circulation_drivers')
    .select('*')
    .eq('market', market)
    .order('full_name', { ascending: true })
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  const driverIds = (drivers ?? []).map(d => (d as DriverRow).user_id)
  let assignments: Array<{ driver_id: string; route_id: string }> = []
  if (driverIds.length > 0) {
    const { data: aRows, error: aErr } = await client
      .from('circulation_driver_routes')
      .select('driver_id, route_id')
      .in('driver_id', driverIds)
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
    assignments = (aRows ?? []) as Array<{ driver_id: string; route_id: string }>
  }

  // Attach route_ids[] onto each driver for convenient UI consumption.
  const byDriver = new Map<string, string[]>()
  for (const a of assignments) {
    if (!byDriver.has(a.driver_id)) byDriver.set(a.driver_id, [])
    byDriver.get(a.driver_id)!.push(a.route_id)
  }
  const withRoutes = (drivers ?? []).map(d => ({
    ...(d as DriverRow),
    route_ids: byDriver.get((d as DriverRow).user_id) ?? [],
  }))

  return NextResponse.json({ drivers: withRoutes })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    market?: string; full_name?: string; email?: string; phone?: string;
    rate_per_stop?: number; can_view_all?: boolean; notes?: string;
    route_ids?: string[];
  } | null
  if (!body?.full_name?.trim()) return NextResponse.json({ error: 'full_name required' }, { status: 400 })
  if (!body?.email?.trim())     return NextResponse.json({ error: 'email required' },     { status: 400 })

  const client = sb()
  const market = body.market?.trim() || 'rrp'

  // Mint the auth user. Use createUser (not invite) so we get the user_id
  // back synchronously; we send the magic link separately.
  const { data: authData, error: authErr } = await client.auth.admin.createUser({
    email:         body.email.trim(),
    email_confirm: true,
    user_metadata: { full_name: body.full_name.trim(), role: 'driver' },
  })
  if (authErr || !authData.user) {
    // If the user already exists, fetch their id and continue.
    const { data: existing } = await client.auth.admin.listUsers()
    const found = existing?.users.find(u => u.email?.toLowerCase() === body.email!.toLowerCase())
    if (!found) return NextResponse.json({ error: authErr?.message ?? 'Could not create user' }, { status: 500 })
    return finishDriver(client, found.id, body, market)
  }
  return finishDriver(client, authData.user.id, body, market)
}

async function finishDriver(
  client: ReturnType<typeof sb>,
  userId: string,
  body: { full_name?: string; email?: string; phone?: string; rate_per_stop?: number; can_view_all?: boolean; notes?: string; route_ids?: string[] },
  market: string,
) {
  const { data, error } = await client
    .from('circulation_drivers')
    .insert({
      user_id:       userId,
      market,
      full_name:     body.full_name!.trim(),
      email:         body.email!.trim(),
      phone:         body.phone ?? null,
      rate_per_stop: body.rate_per_stop ?? 0,
      can_view_all:  !!body.can_view_all,
      notes:         body.notes ?? null,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Route assignments (optional in create).
  if (Array.isArray(body.route_ids) && body.route_ids.length > 0) {
    const links = body.route_ids.map(rid => ({ driver_id: userId, route_id: rid }))
    await client.from('circulation_driver_routes').insert(links)
  }

  // Fire driver_welcome email — best-effort. Doesn't block the response.
  try {
    await sendDriverWelcome(client, {
      market,
      userId,
      email:    body.email!.trim(),
      fullName: body.full_name ?? '',
      routeIds: body.route_ids ?? [],
    })
  } catch { /* don't block driver creation */ }

  return NextResponse.json({ driver: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Partial<DriverRow> & { user_id?: string } | null
  if (!body?.user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  for (const k of ['full_name','phone','rate_per_stop','can_view_all','notes','active'] as const) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  const { error } = await sb().from('circulation_drivers').update(updates).eq('user_id', body.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Sets the full set of route_ids for a driver — replaces existing assignments.
export async function PUT(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { user_id?: string; route_ids?: string[] } | null
  if (!body?.user_id || !Array.isArray(body.route_ids)) {
    return NextResponse.json({ error: 'user_id and route_ids[] required' }, { status: 400 })
  }
  const client = sb()
  // Drop existing assignments then insert the new set.
  await client.from('circulation_driver_routes').delete().eq('driver_id', body.user_id)
  if (body.route_ids.length > 0) {
    const links = body.route_ids.map(rid => ({ driver_id: body.user_id!, route_id: rid }))
    const { error } = await client.from('circulation_driver_routes').insert(links)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const userId = new URL(req.url).searchParams.get('user_id')?.trim()
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  // We don't delete auth.users — that'd nuke their history. Just the driver row.
  const { error } = await sb().from('circulation_drivers').delete().eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
