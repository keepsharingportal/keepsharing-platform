// POST /api/admin/social/bulk-seeder
// Body: { brand_slug?, batch_size?, mode? }
//
// Runs one batch of social copy generation across published articles
// missing social_hook (or in reseed-ai mode, articles previously
// auto-seeded). Stamps social_ai_seeded_at on save.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runBulkSocialSeed } from '@/lib/social/bulk-social-seed'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as {
    brand_slug?: string | null
    batch_size?: number
    mode?:       'missing' | 'reseed-ai'
  }
  const brandSlug = body.brand_slug ?? null
  const batchSize = Math.min(10, Math.max(1, body.batch_size ?? 5))
  const mode      = body.mode ?? 'missing'

  const sb = createAdminClient()
  try {
    const result = await runBulkSocialSeed(sb, brandSlug, batchSize, true, mode)
    return NextResponse.json({ ok: true, mode, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'seed failed' }, { status: 500 })
  }
}
