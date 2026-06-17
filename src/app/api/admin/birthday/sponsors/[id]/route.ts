// PATCH /api/admin/birthday/sponsors/[id]
// Body: { birthday_tier?, birthday_profile? }
//
// Operates on advertiser_accounts. Only updates the two birthday-
// specific columns; other advertiser fields stay untouched.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
const ALLOWED = ['birthday_tier', 'birthday_profile']

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })
  const sb = createAdminClient()
  const { error } = await sb.from('advertiser_accounts').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
