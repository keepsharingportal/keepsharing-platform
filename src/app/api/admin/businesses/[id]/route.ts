// /api/admin/businesses/[id]
//   GET    → full business profile
//   PATCH  body { ...fields } or { archived: true|false } → update profile or archive

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizedName } from '@/lib/businesses/normalize'

export const runtime = 'nodejs'

const PATCH_FIELDS = [
  'name', 'address', 'city', 'state', 'zip', 'lat', 'lng',
  'contact_name', 'phone', 'email',
  'website', 'instagram', 'facebook', 'tiktok',
  'logo_path', 'description', 'categories',
] as const

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  await requireAdmin()
  const { id } = await ctx.params
  const sb = createAdminClient()
  const { data, error } = await sb.from('businesses').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ business: data })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  await requireAdmin()
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({})) as { archived?: boolean } & Record<string, unknown>

  const updates: Record<string, unknown> = {}
  for (const f of PATCH_FIELDS) if (f in body) updates[f] = body[f]
  // Keep normalized_name in sync if the editor renamed the business
  if (typeof updates.name === 'string') {
    updates.normalized_name = normalizedName(updates.name)
  }
  if (body.archived === true)  updates.archived_at = new Date().toISOString()
  if (body.archived === false) updates.archived_at = null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { error } = await sb.from('businesses').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
