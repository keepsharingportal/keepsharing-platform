import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED = ['title', 'description', 'video_url', 'thumbnail', 'brand_slug', 'category', 'duration_sec']

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  if (!body.title || !body.video_url) return NextResponse.json({ error: 'title + video_url required' }, { status: 400 })
  const insert: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) insert[k] = body[k]
  const sb = createAdminClient()
  const { data, error } = await sb.from('curated_videos').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
