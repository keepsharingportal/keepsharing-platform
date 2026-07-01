// POST /api/admin/circulation/drivers/set-password
//
// Admin sets a driver's password directly. Useful when the admin wants
// to hand a driver a specific temporary password verbally or via text
// rather than waiting for a reset-email round-trip.
//
// Body: { user_id: string; password: string }
// Rules: password must be at least 8 chars (Supabase's default minimum
// is 6, we bump it slightly since this is admin-set and rarely rotated).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { circulationServiceClient } from '@/lib/circulation/driverWelcome'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { user_id?: string; password?: string } | null
  if (!body?.user_id)  return NextResponse.json({ error: 'user_id required' },  { status: 400 })
  if (!body?.password) return NextResponse.json({ error: 'password required' }, { status: 400 })
  if (body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const client = circulationServiceClient()

  const { data: driver, error } = await client
    .from('circulation_drivers')
    .select('user_id, email')
    .eq('user_id', body.user_id)
    .maybeSingle()
  if (error || !driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  const { error: setErr } = await client.auth.admin.updateUserById(body.user_id, {
    password: body.password,
  })
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
