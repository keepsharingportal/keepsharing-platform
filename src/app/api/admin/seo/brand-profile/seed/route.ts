// POST /api/admin/seo/brand-profile/seed
// Body: { brandSlug, overwrite?: boolean }
//
// Runs Claude to generate a first-draft strategic profile for the
// brand. Returns the proposed values WITHOUT saving by default — the
// editor reviews + clicks Save in the admin UI. When `overwrite=true`
// the proposal is written immediately (useful for first-time setup).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedBrandProfile } from '@/lib/seo/seed-brand-profile'
import { saveBrandProfile } from '@/lib/seo/brand-profile'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    brandSlug?: string
    overwrite?: boolean
  } | null
  if (!body?.brandSlug) return NextResponse.json({ error: 'brandSlug required' }, { status: 400 })

  const sb = createAdminClient()
  try {
    const seeded = await seedBrandProfile(sb, body.brandSlug)
    if (body.overwrite) {
      await saveBrandProfile(sb, {
        brandSlug:         body.brandSlug,
        pillars:           seeded.pillars,
        subAreas:          seeded.subAreas,
        personas:          seeded.personas,
        editorialCalendar: seeded.editorialCalendar,
        linkableAssets:    seeded.linkableAssets,
        negativeSpace:     seeded.negativeSpace,
        uniqueAngles:      seeded.uniqueAngles,
        voiceNotes:        seeded.voiceNotes,
        generatedByAi:     true,
        editedBy:          adminCtx.userId ?? null,
      })
    }
    return NextResponse.json({ ok: true, ...seeded })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'seed failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
