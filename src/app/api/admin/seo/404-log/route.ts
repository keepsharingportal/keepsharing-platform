// DELETE /api/admin/seo/404-log?id=<id> — marks the row resolved.
// Used by both the "Dismiss" button and the auto-resolve flow after
// creating a redirect from the same path.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createAdminClient()
  const { error } = await sb.from('not_found_log').update({
    resolved_at:     new Date().toISOString(),
    resolved_by:     adminCtx.userId ?? null,
    resolution_note: 'Resolved from admin',
  }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
