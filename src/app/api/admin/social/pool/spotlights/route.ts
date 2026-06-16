import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED = ['spotlight_type', 'name', 'blurb', 'image_url', 'link_url', 'brand_slug', 'tone_hint']

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.spotlight_type || !body.name || !body.blurb) {
    return NextResponse.json({ error: 'spotlight_type, name, blurb required' }, { status: 400 })
  }
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('community_spotlights').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
