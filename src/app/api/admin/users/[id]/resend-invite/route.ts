// POST /api/admin/users/[id]/resend-invite
// Re-fires the Supabase magic-link invitation to a pending admin (one that
// was created in admin_users but hasn't completed first login — user_id is
// still null). Useful when the original invite email got lost.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSettingsAccess } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('admin_users')
    .select('email')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })

  const email  = (data as { email: string }).email
  const origin = req.nextUrl.origin

  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/admin`,
  })
  if (inviteErr) {
    return NextResponse.json(
      { error: inviteErr.message ?? 'Invite send failed' },
      { status: 500 },
    )
  }
  return NextResponse.json({ success: true })
}
