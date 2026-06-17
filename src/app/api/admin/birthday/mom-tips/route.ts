import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
const ALLOWED = ['brand_slug', 'tip', 'mom_name', 'topic', 'display_order']

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.tip || !body.mom_name) return NextResponse.json({ error: 'tip and mom_name required' }, { status: 400 })
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('birthday_mom_tips').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
