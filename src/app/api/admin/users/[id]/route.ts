// PATCH /api/admin/users/[id]
//   Edit allowed fields on an admin row. The set of acceptable changes is
//   governed by the permissions module — a non-super Admin cannot promote
//   someone to Admin or Super, nor edit existing Admin/Super rows.
//   Self-edits (name/notes) are always allowed regardless of role.
//
//   Allowed body keys:
//     full_name, role, allowed_markets, notes, status
//
// DELETE /api/admin/users/[id]
//   Hard-delete the admin_users row. Caller cannot delete their own row
//   (would lock themselves out). The Supabase auth.users record is NOT
//   removed — that's a separate concern and we don't want to nuke a real
//   identity over an admin permission change.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireSettingsAccess } from '@/lib/admin/auth'
import {
  canManageAdminRow, canAssignRole, canDeleteSelf,
} from '@/lib/admin/permissions'
import { isKnownMarket } from '@/lib/markets'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

interface PatchBody {
  full_name?:       string | null
  role?:            AdminRole
  allowed_markets?: string[]
  notes?:           string | null
  status?:          'active' | 'suspended'
}

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  // Any signed-in admin can hit this — self-edits (name, notes) are open to
  // everyone. Permission to touch role / status / markets / other rows is
  // enforced row-by-row below via the permissions module.
  let ctx
  try { ctx = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as PatchBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const supabase = supabaseAdmin()

  // Load the target row so we can run permission checks against its CURRENT
  // role, not what the caller is trying to set.
  const target = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', id)
    .maybeSingle()
  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 })
  if (!target.data) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

  const isSelf      = ctx.adminId === id
  const targetRole  = (target.data as { role: AdminRole }).role
  const manage      = canManageAdminRow(ctx.role, targetRole, isSelf)
  if (!manage.allowed) return NextResponse.json({ error: manage.reason }, { status: 403 })

  const updates: Record<string, unknown> = {}

  // Self-edits can change name/notes only. Role + status + markets stay
  // locked to prevent privilege escalation by editing your own row.
  if (body.full_name !== undefined) updates.full_name = body.full_name
  if (body.notes     !== undefined) updates.notes     = body.notes

  if (!isSelf) {
    if (body.role !== undefined && body.role !== targetRole) {
      const assign = canAssignRole(ctx.role, body.role)
      if (!assign.allowed) return NextResponse.json({ error: assign.reason }, { status: 403 })
      updates.role = body.role
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'suspended') {
        return NextResponse.json({ error: 'status must be active or suspended' }, { status: 400 })
      }
      updates.status = body.status
    }
    if (body.allowed_markets !== undefined) {
      // For cross-brand tiers we store an empty array regardless of what
      // the client sent — there's no concept of "subset of all".
      const newRole = (updates.role as AdminRole | undefined) ?? targetRole
      const isCrossBrand = newRole === 'super' || newRole === 'admin'
      if (isCrossBrand) {
        updates.allowed_markets = []
      } else {
        const filtered = body.allowed_markets.filter(isKnownMarket)
        if (filtered.length === 0) {
          return NextResponse.json({ error: 'Publisher/Editor needs at least one market' }, { status: 400 })
        }
        updates.allowed_markets = filtered
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('admin_users')
    .update(updates)
    .eq('id', id)
  if (error) {
    console.error('[admin/users PATCH] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/settings/users')
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let ctx
  try { ctx = await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const target = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', id)
    .maybeSingle()
  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 })
  if (!target.data) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

  const isSelf = ctx.adminId === id
  if (isSelf && !canDeleteSelf()) {
    return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 403 })
  }

  const targetRole = (target.data as { role: AdminRole }).role
  const manage = canManageAdminRow(ctx.role, targetRole, isSelf)
  if (!manage.allowed) return NextResponse.json({ error: manage.reason }, { status: 403 })

  // Guardrail: never let the LAST super-admin be removed. Suspending one is
  // fine; deletion would brick the platform.
  if (targetRole === 'super') {
    const { count } = await supabase
      .from('admin_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super')
      .eq('status', 'active')
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last active Super Admin' },
        { status: 403 },
      )
    }
  }

  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/settings/users')
  return NextResponse.json({ success: true })
}
