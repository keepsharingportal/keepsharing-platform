// POST /api/admin/seo/internal-links-run
//
// Admin-auth wrapper around runInternalLinkPass — lets the editor
// trigger a re-pass from the queue page without exposing CRON_SECRET.
// Same lib call, same result, just gated on requireAdmin().

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInternalLinkPass } from '@/lib/seo/internal-link-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  await requireAdmin()
  const sb = createAdminClient()
  const result = await runInternalLinkPass(sb)
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result })
}
