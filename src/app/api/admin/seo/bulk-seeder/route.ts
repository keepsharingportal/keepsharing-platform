// POST /api/admin/seo/bulk-seeder
// Body: { brand_slug?, batch_size? }

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runBulkSeed } from '@/lib/seo/bulk-seed'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as { brand_slug?: string | null; batch_size?: number; mode?: 'missing' | 'reseed-ai' }
  const brandSlug = body.brand_slug ?? null
  const batchSize = Math.min(10, Math.max(1, body.batch_size ?? 5))
  const mode = body.mode ?? 'missing'

  const sb = createAdminClient()
  try {
    const result = await runBulkSeed(sb, brandSlug, batchSize, true, mode)
    return NextResponse.json({ ok: true, mode, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'seed failed' }, { status: 500 })
  }
}
