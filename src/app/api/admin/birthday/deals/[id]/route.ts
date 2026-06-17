import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED = ['brand_slug', 'advertiser_id', 'business_name', 'category', 'headline', 'offer', 'redeem_how', 'promo_code', 'image_url', 'link_url', 'valid_from', 'valid_until', 'display_order', 'is_featured', 'is_active']

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })
  const sb = createAdminClient()
  const { error } = await sb.from('birthday_deals').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()
  const { error } = await sb.from('birthday_deals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
