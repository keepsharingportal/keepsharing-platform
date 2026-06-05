// GET   /api/admin/circulation/settings?market=rrp   — flat key/value list
// PATCH /api/admin/circulation/settings  body { market, key, value }

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
  const { data, error } = await sb().from('circulation_settings').select('*').eq('market', market).order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { market?: string; key?: string; value?: string | null } | null
  if (!body?.key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  const market = body.market?.trim() || 'rrp'
  const { error } = await sb()
    .from('circulation_settings')
    .upsert({ market, key: body.key, value: body.value ?? '' }, { onConflict: 'market,key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
