// PATCH /api/admin/social-queue/[id]
// Body: { action: 'approve'|'reject'|'pause'|'resume'|'edit-caption', platform?, caption? }

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteCtx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const adminCtx = await requireSettingsAccess()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as {
    action?:   string
    platform?: string
    caption?:  string
  } | null
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const sb  = createAdminClient()
  const now = new Date().toISOString()

  if (body.action === 'approve') {
    const { data } = await sb.from('social_queue').update({
      needs_review: false,
      reviewed_at:  now,
      reviewed_by:  adminCtx.email ?? null,
    }).eq('id', id).select().single()
    return NextResponse.json({ ok: true, row: data })
  }

  if (body.action === 'reject') {
    const { data } = await sb.from('social_queue').update({
      status:      'rejected',
      reviewed_at: now,
      reviewed_by: adminCtx.email ?? null,
    }).eq('id', id).select().single()
    return NextResponse.json({ ok: true, row: data })
  }

  if (body.action === 'pause') {
    const { data } = await sb.from('social_queue').update({
      status: 'paused',
    }).eq('id', id).select().single()
    return NextResponse.json({ ok: true, row: data })
  }

  if (body.action === 'resume') {
    const { data } = await sb.from('social_queue').update({
      status: 'ready',
    }).eq('id', id).select().single()
    return NextResponse.json({ ok: true, row: data })
  }

  if (body.action === 'edit-caption' && body.platform && typeof body.caption === 'string') {
    // Merge new caption into the captions JSONB.
    const { data: cur } = await sb.from('social_queue').select('captions').eq('id', id).maybeSingle()
    const captions = (cur?.captions as Record<string, { caption: string; image_url?: string; hashtags?: string[] }> | null) ?? {}
    captions[body.platform] = { ...(captions[body.platform] ?? { caption: '' }), caption: body.caption }
    await sb.from('social_queue').update({ captions }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 })
}
