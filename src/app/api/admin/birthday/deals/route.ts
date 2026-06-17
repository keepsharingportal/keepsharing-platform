import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED = ['brand_slug', 'advertiser_id', 'business_name', 'category', 'headline', 'offer', 'redeem_how', 'promo_code', 'image_url', 'link_url', 'valid_from', 'valid_until', 'display_order', 'is_featured']

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.business_name || !body.headline || !body.offer || !body.category) {
    return NextResponse.json({ error: 'business_name, headline, offer, category required' }, { status: 400 })
  }
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('birthday_deals').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
