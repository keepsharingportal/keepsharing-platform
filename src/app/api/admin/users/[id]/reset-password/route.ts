// POST /api/admin/users/[id]/reset-password
//
// Lets a super-admin or admin set a new password for another admin user.
// Permission is the same `canManageAdminRow` check the rest of the admin
// editor uses — so admins can reset publisher/editor passwords but not
// other admins, and super-admins can reset anyone (including themselves).
//
// We could have folded this into PATCH /api/admin/users/[id], but
// passwords live on auth.users (Supabase auth) rather than admin_users,
// they're write-only (we never return them), and they deserve their own
// audit trail in logs. Splitting the endpoint makes that obvious.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { canManageAdminRow } from '@/lib/admin/permissions'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

interface Body { password?: string }

export async function POST(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let ctx
  try { ctx = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as Body | null
  if (!body?.password) return NextResponse.json({ error: 'password required' }, { status: 400 })
  if (body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Pull the target admin row so we can permission-check + grab the user_id.
  const target = await supabase
    .from('admin_users')
    .select('id, role, user_id, email')
    .eq('id', id)
    .maybeSingle()
  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 })
  if (!target.data)  return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

  const row        = target.data as { id: string; role: AdminRole; user_id: string | null; email: string }
  const isSelf     = ctx.adminId === id
  const manage     = canManageAdminRow(ctx.role, row.role, isSelf)
  if (!manage.allowed) return NextResponse.json({ error: manage.reason }, { status: 403 })

  if (!row.user_id) {
    return NextResponse.json({
      error: 'This admin hasn\'t logged in yet — no Supabase auth user exists to set a password on. Have them sign in once via magic link first.',
    }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.updateUserById(row.user_id, { password: body.password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
