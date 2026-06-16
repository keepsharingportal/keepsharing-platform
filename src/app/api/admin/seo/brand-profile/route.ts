// POST /api/admin/seo/brand-profile — save partial updates
// Body: { brandSlug, pillars?, subAreas?, personas?, editorialCalendar?,
//         linkableAssets?, negativeSpace?, uniqueAngles?, voiceNotes? }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveBrandProfile } from '@/lib/seo/brand-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.brandSlug !== 'string') {
    return NextResponse.json({ error: 'brandSlug required' }, { status: 400 })
  }

  const sb = createAdminClient()
  try {
    await saveBrandProfile(sb, {
      brandSlug:           body.brandSlug,
      pillars:             body.pillars             as never,
      subAreas:            body.subAreas            as never,
      personas:            body.personas            as never,
      editorialCalendar:   body.editorialCalendar   as never,
      linkableAssets:      body.linkableAssets      as never,
      negativeSpace:       body.negativeSpace       as never,
      uniqueAngles:        body.uniqueAngles        as never,
      voiceNotes:          body.voiceNotes          as never,
      editorialPrefs:         body.editorialPrefs         as never,
      competitorIntel:        body.competitorIntel        as never,
      socialCaptionExamples:  body.socialCaptionExamples  as never,
      editedBy:               adminCtx.userId ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'save failed' }, { status: 500 })
  }
}
