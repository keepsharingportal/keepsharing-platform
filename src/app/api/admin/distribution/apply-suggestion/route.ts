// POST /api/admin/distribution/apply-suggestion
// Body: { id, surface: 'homepage' | 'newsletter', section }
//
// Used by the AISectionFiller client component. Sets the surface flag
// + section assignment on a community_submissions row in one shot so
// the editor goes from "AI suggested this" to "assigned" with a
// single click. Editorial integrity is preserved because the editor
// explicitly clicked Assign — the AI never writes on its own.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    id?:      string
    surface?: 'homepage' | 'newsletter'
    section?: string
  } | null
  if (!body?.id)      return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!body?.surface) return NextResponse.json({ error: 'surface required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.surface === 'homepage') {
    update.homepage_feature  = true
    update.homepage_section  = body.section || null
    update.homepage_priority = 5
  } else {
    update.newsletter_include = true
    update.newsletter_section = body.section || null
  }

  const sb = createAdminClient()
  const { error } = await sb
    .from('community_submissions')
    .update(update)
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
