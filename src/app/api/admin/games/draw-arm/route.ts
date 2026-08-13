// POST /api/admin/games/draw-arm   Body: { enabled: boolean }
//
// Arms or disarms the automated Monday draw by writing
// site_settings.games_draw_enabled. While disarmed the cron records nothing and
// emails nobody, and the public /games hero drops its "first drawing this
// Monday" promise — so this one row is the difference between "the drawing is
// running" and "the drawing hasn't started yet".
//
// Deliberately a database row rather than an env var: disarming should not
// require a Vercel redeploy at the moment you most want it to be instant.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { createAdminClient } from '@/lib/supabase/admin'
import { DRAW_ENABLED_KEY } from '@/lib/games/draw'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const { enabled } = await req.json().catch(() => ({})) as { enabled?: boolean }
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be true or false' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: before } = await supabase
    .from('site_settings').select('value').eq('key', DRAW_ENABLED_KEY).maybeSingle()

  const { error } = await supabase
    .from('site_settings')
    .upsert(
      { key: DRAW_ENABLED_KEY, value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       enabled ? 'games.draw.armed' : 'games.draw.disarmed',
    target_table: 'site_settings',
    target_id:    DRAW_ENABLED_KEY,
    before:       before ?? null,
    after:        { value: enabled ? 'true' : 'false' },
  })

  // The hero copy is gated on this flag, so the public page has to re-render.
  revalidatePath('/games')
  revalidatePath('/admin/games')

  return NextResponse.json({ success: true, enabled })
}
