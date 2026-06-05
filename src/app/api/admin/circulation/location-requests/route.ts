// Admin API for public location requests.
//
// GET    /api/admin/circulation/location-requests?market=rrp&status=pending
// PATCH  /api/admin/circulation/location-requests
//          → { id, action: 'approve' | 'reject' | 'added' }
// DELETE /api/admin/circulation/location-requests?id=...  (spam cleanup)

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
    .from('circulation_location_requests')
    .select('*')
    .eq('market', market)
    .eq('status', status)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    id?:      string
    action?:  'approve' | 'reject' | 'added'
  } | null
  if (!body?.id || !body.action) return NextResponse.json({ error: 'id + action required' }, { status: 400 })

  const { error } = await sb()
    .from('circulation_location_requests')
    .update({
      status:      body.action === 'added' ? 'added' : body.action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.userId,
    })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb().from('circulation_location_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
