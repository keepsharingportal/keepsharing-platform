// POST /api/admin/me/mfa-status — sync this admin's mfa_enabled_at flag
//
// Body: { enabled: boolean }
//
// Called by /admin/settings/security after the user successfully verifies
// (set enabled=true) or removes their last factor (set enabled=false).
// We keep the column in the admin_users row instead of querying Supabase
// Auth on every admin page — the gate becomes a single denormalized read.
//
// Auth: the user can only mutate THEIR OWN flag. We compare ctx.adminId
// against the row we're updating, so even if the request body is forged,
// the only thing it can change is the caller's own state.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  let ctx
  try { ctx = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as { enabled?: boolean; mode?: string } | null
  if (!body || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled (boolean) required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Sync mode is the self-healing backfill from /admin/settings/security: only
  // stamp if there isn't already one. Without this, every page load would push
  // the "added" date forward.
  if (body.mode === 'sync' && body.enabled) {
    const { data: existing } = await supabase
      .from('admin_users')
      .select('mfa_enabled_at')
      .eq('id', ctx.adminId)
      .maybeSingle()
    if ((existing as { mfa_enabled_at: string | null } | null)?.mfa_enabled_at) {
      return NextResponse.json({ success: true, skipped: 'already_stamped' })
    }
  }

  const { error } = await supabase
    .from('admin_users')
    .update({
      mfa_enabled_at: body.enabled ? new Date().toISOString() : null,
    })
    .eq('id', ctx.adminId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       body.enabled ? 'user.mfa_enrolled' : 'user.mfa_removed',
    target_table: 'admin_users',
    target_id:    ctx.adminId,
    meta:         body.mode ? { mode: body.mode } : null,
  })

  return NextResponse.json({ success: true })
}
