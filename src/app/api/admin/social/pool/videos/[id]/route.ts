import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED = ['title', 'description', 'video_url', 'thumbnail', 'brand_slug', 'category', 'duration_sec', 'is_active']

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireSettingsAccess()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })
  const sb = createAdminClient()
  const { error } = await sb.from('curated_videos').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireSettingsAccess()
  const { id } = await params
  const sb = createAdminClient()
  const { error } = await sb.from('curated_videos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
