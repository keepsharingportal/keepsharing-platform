// PATCH /api/admin/social/plan/slot/[id]  — edit captions/image/tone/scheduled_for
// DELETE /api/admin/social/plan/slot/[id] — remove a slot from the plan
//
// Per-slot editing on the plan grid. Only draft slots are editable;
// once dispatched to GHL, the editor must manage from GHL directly
// (or delete from there).

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteSocialPost } from '@/lib/ghl-social'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

const ALLOWED = ['fb_caption', 'ig_caption', 'image_url', 'tone', 'scheduled_for', 'platforms']

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireSettingsAccess()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })

  const sb = createAdminClient()
  const { error } = await sb.from('social_plan_slot').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireSettingsAccess()
  const { id } = await params
  const sb = createAdminClient()

  const { data: slot } = await sb.from('social_plan_slot')
    .select('id, status, ghl_post_id, plan_id')
    .eq('id', id)
    .maybeSingle()
  const s = slot as null | { id: string; status: string; ghl_post_id: string | null; plan_id: string }
  if (!s) return NextResponse.json({ error: 'slot not found' }, { status: 404 })

  // If already dispatched, also delete from GHL.
  if (s.ghl_post_id) {
    const { data: plan } = await sb.from('social_plan').select('brand_slug').eq('id', s.plan_id).maybeSingle()
    const brand = (plan as { brand_slug?: string } | null)?.brand_slug
    if (brand) await deleteSocialPost(brand, s.ghl_post_id)
  }

  const { error } = await sb.from('social_plan_slot').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
