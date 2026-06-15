// GET /api/cron/seo-internal-links
// Vercel cron trigger. Runs the internal-link suggestion pass against
// the article corpus and writes pending suggestions for editor review.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInternalLinkPass } from '@/lib/seo/internal-link-engine'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  // Vercel cron requests carry an Authorization: Bearer <CRON_SECRET>
  // header when CRON_SECRET is set in the project env. When unset we
  // accept any caller (dev/local runs); production should set the secret.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) return new NextResponse('Unauthorized', { status: 401 })
  }

  const sb = createAdminClient()
  const result = await runInternalLinkPass(sb)
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() })
}
