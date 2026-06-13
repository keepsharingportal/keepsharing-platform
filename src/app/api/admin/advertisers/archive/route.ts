// POST /api/admin/advertisers/archive  body { id, archived?: boolean }
// Soft-archive (or restore) an advertiser_accounts row. Hides it from
// active-advertiser queries without losing historical placement /
// stop-link data.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { id?: string; archived?: boolean } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createAdminClient()
  const value = body.archived === false ? null : new Date().toISOString()
  const { error } = await sb
    .from('advertiser_accounts')
    .update({ archived_at: value })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, archived: value !== null })
}
