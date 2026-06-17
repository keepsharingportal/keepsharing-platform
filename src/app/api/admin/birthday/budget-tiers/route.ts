import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
const ALLOWED = ['brand_slug', 'tier_key', 'name', 'price_ceiling', 'guest_count', 'pitch', 'picks', 'hero_image_url', 'display_order']

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.tier_key || !body.name || !body.guest_count || !body.pitch || body.price_ceiling == null) {
    return NextResponse.json({ error: 'tier_key, name, price_ceiling, guest_count, pitch required' }, { status: 400 })
  }
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('birthday_budget_tiers').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
