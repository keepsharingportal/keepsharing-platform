// POST /api/admin/users — invite a new admin (Super or Admin only).
//
// Body: { email, full_name?, role, allowed_markets, send_invite }
//
// Flow:
//   1. requireSettingsAccess() — bounces non-super/admin callers.
//   2. canCreateAdminRole() — additional guard against Admin trying to
//      create another Admin or Super.
//   3. Insert admin_users row with status='active', invited_by=current admin.
//   4. If send_invite=true, generate a Supabase magic-link via the
//      service-role admin API and email it to the new user. We don't
//      block the response on email delivery — log + carry on.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { canCreateAdminRole } from '@/lib/admin/permissions'
import { isKnownMarket } from '@/lib/markets'
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

interface Body {
  email?:           string
  full_name?:       string | null
  role?:            AdminRole
  allowed_markets?: string[]
  send_invite?:     boolean
}

export async function POST(req: NextRequest) {
  let ctx
  try { ctx = await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const email = body.email?.trim().toLowerCase()
  const role  = body.role
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!role)  return NextResponse.json({ error: 'role is required' },  { status: 400 })

  const allowed = canCreateAdminRole(ctx.role, role)
  if (!allowed.allowed) {
    return NextResponse.json({ error: allowed.reason }, { status: 403 })
  }

  // Markets — cross-brand tiers ignore the list (always {}); publisher/editor
  // must have at least one valid market.
  const isCrossBrand = role === 'super' || role === 'admin'
  let markets: string[] = []
  if (!isCrossBrand) {
    const raw = Array.isArray(body.allowed_markets) ? body.allowed_markets : []
    markets = raw.filter(isKnownMarket)
    if (markets.length === 0) {
      return NextResponse.json({ error: 'Pick at least one market for this user' }, { status: 400 })
    }
  }

  const supabase = supabaseAdmin()

  // Conflict check by email — surface a friendly message instead of a raw
  // unique-constraint error.
  const existing = await supabase
    .from('admin_users')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle()
  if (existing.data) {
    return NextResponse.json(
      { error: `An admin with email ${email} already exists` },
      { status: 409 },
    )
  }

  const insert = await supabase
    .from('admin_users')
    .insert({
      email,
      full_name:       body.full_name?.trim() || null,
      role,
      allowed_markets: markets,
      status:          'active',
      invited_at:      new Date().toISOString(),
      invited_by:      ctx.adminId,
    })
    .select('id, user_id, email, full_name, role, allowed_markets, status, notes, last_login_at, invited_at, invited_by, created_at')
    .single()

  if (insert.error) {
    console.error('[admin/users POST] insert error:', insert.error)
    return NextResponse.json({ error: insert.error.message }, { status: 500 })
  }

  // Best-effort invite send. Don't fail the request if email delivery fails
  // — the operator can always re-send from the row's "Resend" button.
  let inviteSent = false
  let inviteError: string | null = null
  if (body.send_invite !== false) {
    const origin = req.nextUrl.origin
    try {
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/admin`,
      })
      if (inviteErr) {
        // Some Supabase projects don't permit admin-invite from the SDK;
        // fall back to generating a magic-link the operator can copy.
        inviteError = inviteErr.message
        console.warn('[admin/users POST] inviteUserByEmail failed, will fall back:', inviteErr.message)
      } else {
        inviteSent = true
      }
    } catch (e) {
      inviteError = e instanceof Error ? e.message : String(e)
      console.warn('[admin/users POST] invite send threw:', inviteError)
    }
  }

  await recordAuditEvent({
    ctx, req,
    action:       'user.created',
    target_table: 'admin_users',
    target_id:    (insert.data as { id: string }).id,
    after:        { email, role, allowed_markets: markets, full_name: body.full_name ?? null },
    meta:         { invite_sent: inviteSent },
  })

  revalidatePath('/admin/settings/users')

  // Response shape matches AdminUserRow on the client so the newly-added
  // row drops straight into the list without a refetch.
  return NextResponse.json({
    success: true,
    user:    insert.data,
    invite:  { sent: inviteSent, error: inviteError },
  })
}
