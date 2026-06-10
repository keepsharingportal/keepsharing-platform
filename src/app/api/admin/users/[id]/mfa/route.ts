// DELETE /api/admin/users/[id]/mfa
//
// Reset all 2FA factors on a target admin's Supabase auth user. Used when
// a remote VA loses her phone and has no cloud-backed authenticator app to
// restore from — super/admin clicks reset, the next sign-in re-enrolls
// from scratch.
//
// Permission: same as any user mutation — super can reset anyone,
// admin can reset publishers/editors but not other admins/supers.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { canManageAdminRow } from '@/lib/admin/permissions'
import { recordAuditEvent } from '@/lib/admin/audit'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

export async function DELETE(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let ctx
  try { ctx = await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()

  // Load the target so we can permission-check + look up their auth user_id.
  const targetRes = await supabase
    .from('admin_users')
    .select('id, email, role, user_id, full_name')
    .eq('id', id)
    .maybeSingle()
  if (targetRes.error) return NextResponse.json({ error: targetRes.error.message }, { status: 500 })
  const target = targetRes.data as { id: string; email: string; role: AdminRole; user_id: string | null; full_name: string | null } | null
  if (!target) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

  // Permission check — same rule as edit/delete.
  const isSelf = ctx.adminId === id
  const manage = canManageAdminRow(ctx.role, target.role, isSelf)
  if (!manage.allowed) return NextResponse.json({ error: manage.reason }, { status: 403 })

  // Self-reset would let an attacker who briefly compromised a session clear
  // their own 2FA — refuse it. Operators who lost their device should ask
  // another super/admin to reset for them.
  if (isSelf) {
    return NextResponse.json({ error: 'Use the Security page to manage your own 2FA, or ask another admin to reset it.' }, { status: 403 })
  }

  if (!target.user_id) {
    // No auth user yet (still invited, never signed in) — nothing to reset.
    return NextResponse.json({ success: true, reset_count: 0, note: 'User has not signed in yet.' })
  }

  // List all factors on the target's auth user, then delete each.
  // Supabase admin API: auth.admin.mfa.listFactors / deleteFactor.
  const list = await supabase.auth.admin.mfa.listFactors({ userId: target.user_id })
  if (list.error) {
    return NextResponse.json({ error: `Could not list MFA factors: ${list.error.message}` }, { status: 500 })
  }
  const factors = list.data?.factors ?? []
  let deleted = 0
  const failures: string[] = []
  for (const f of factors) {
    const del = await supabase.auth.admin.mfa.deleteFactor({ userId: target.user_id, id: f.id })
    if (del.error) {
      failures.push(`${f.factor_type}:${f.id} (${del.error.message})`)
    } else {
      deleted++
    }
  }

  // Clear the denormalized stamp so the enforcement gate forces re-enrollment.
  await supabase
    .from('admin_users')
    .update({ mfa_enabled_at: null })
    .eq('id', id)

  await recordAuditEvent({
    ctx, req,
    action:       'user.mfa_reset',
    target_table: 'admin_users',
    target_id:    id,
    meta:         {
      target_email: target.email,
      factors_removed: deleted,
      failures: failures.length > 0 ? failures : undefined,
    },
  })

  revalidatePath('/admin/settings/users')

  if (failures.length > 0 && deleted === 0) {
    return NextResponse.json({ error: `Could not remove any factors: ${failures.join('; ')}` }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    reset_count: deleted,
    partial:     failures.length > 0,
    failures:    failures.length > 0 ? failures : undefined,
  })
}
