import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Note: legacy community_spotlights schema (migration 037) uses
// honoree_name / honoree_context / hero_image_url / full_story_link.
// We honor those column names; migration 200 added the strategist
// columns (brand_slug, tone_hint, times_used, last_used_at).
const ALLOWED = ['spotlight_type', 'honoree_name', 'honoree_context', 'hero_image_url', 'full_story_link', 'brand_slug', 'tone_hint']

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.spotlight_type || !body.honoree_name || !body.honoree_context) {
    return NextResponse.json({ error: 'spotlight_type, honoree_name, honoree_context required' }, { status: 400 })
  }
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('community_spotlights').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
