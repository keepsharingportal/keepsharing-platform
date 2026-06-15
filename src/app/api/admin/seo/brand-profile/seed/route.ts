// POST /api/admin/seo/brand-profile/seed
// Body: { brandSlug, mode?: 'merge' | 'replace', save?: boolean }
//
// Runs Claude to generate a first-draft strategic profile + saves it
// using the merge-or-replace pipeline. Default mode is 'merge' —
// preserves any field the editor has already tuned.
//
// When save=false (default) the proposal is returned WITHOUT writing —
// preview-only mode for the editor to inspect before committing.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedBrandProfile, seedAndMergeBrandProfile } from '@/lib/seo/seed-brand-profile'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    brandSlug?: string
    mode?:      'merge' | 'replace'
    save?:      boolean
  } | null
  if (!body?.brandSlug) return NextResponse.json({ error: 'brandSlug required' }, { status: 400 })

  const sb   = createAdminClient()
  const mode = body.mode ?? 'merge'

  try {
    if (body.save) {
      const result = await seedAndMergeBrandProfile(sb, body.brandSlug, { mode })
      return NextResponse.json({ ok: true, saved: true, mode, ...result })
    }
    // Preview-only — generate but don't write.
    const seeded = await seedBrandProfile(sb, body.brandSlug)
    return NextResponse.json({ ok: true, saved: false, mode, ...seeded })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'seed failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
