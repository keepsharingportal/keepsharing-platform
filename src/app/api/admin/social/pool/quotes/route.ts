// POST /api/admin/social/pool/quotes  — add a quote
// (PATCH/DELETE for individual rows live in ./[id]/route.ts)

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED = ['quote', 'attribution', 'brand_slug', 'tone_hint', 'topics', 'image_url']

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.quote || typeof body.quote !== 'string') return NextResponse.json({ error: 'quote required' }, { status: 400 })
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('quote_bank').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
