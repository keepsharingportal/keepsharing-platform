// GET /api/admin/articles/[id]/social-state
//
// Read-only snapshot of the social copy state on an article, used by
// the InlineSocialSharingPanel to poll for auto-generated copy after
// a fresh publish (the auto-trigger in POST /api/admin/articles +
// PATCH /api/admin/articles/[id] is fire-and-forget; the editor's
// page state needs a way to pull the result without a hard refresh).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data } = await sb()
    .from('guide_articles')
    .select('social_mode, social_hook, social_fb_caption, social_ig_caption, social_ai_seeded_at')
    .eq('id', id)
    .maybeSingle()
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data)
}
