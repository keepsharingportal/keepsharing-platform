// POST /api/admin/circulation/drivers/reset-password
//
// Triggers a Supabase password-reset email to a driver. The email
// contains a link that opens the "set new password" flow and lands the
// driver back at /distribution/login when done. Useful when a driver
// wants a password (magic-link isn't ergonomic for everyone) or forgot
// the one they set.
//
// Body: { user_id: string }
// Also returns { manualLink: string } as a fallback the admin can copy
// and text/DM to the driver — same URL the email contains, so drivers
// can set their password without waiting for email delivery.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { circulationServiceClient } from '@/lib/circulation/driverWelcome'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { user_id?: string } | null
  if (!body?.user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const client = circulationServiceClient()

  const { data: driver, error } = await client
    .from('circulation_drivers')
    .select('user_id, market, email')
    .eq('user_id', body.user_id)
    .maybeSingle()
  if (error || !driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
  }
  const d = driver as { user_id: string; market: string; email: string }

  const baseUrl = process.env.NEXT_PUBLIC_DRIVERS_URL
               ?? process.env.NEXT_PUBLIC_SITE_URL
               ?? 'https://drivers.keepsharing.com'
  const redirectTo = `${baseUrl}/auth/callback?next=/distribution/login`

  // Dispatch the reset email using Supabase's built-in template. We use
  // the anon-key client (not the service-role admin client) because
  // resetPasswordForEmail is an auth-API call, not an admin one.
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
  const { error: sendErr } = await authClient.auth.resetPasswordForEmail(d.email, { redirectTo })
  if (sendErr) {
    return NextResponse.json({ error: sendErr.message }, { status: 500 })
  }

  // Also generate a copy-able recovery link — same target as the email.
  // If email is slow/undelivered, admin can text/DM this URL directly.
  let manualLink: string | null = null
  try {
    const { data: linkData } = await client.auth.admin.generateLink({
      type:  'recovery',
      email: d.email,
      options: { redirectTo },
    })
    if (linkData?.properties?.action_link) manualLink = linkData.properties.action_link
  } catch { /* email still sent — manualLink is just a bonus */ }

  return NextResponse.json({ ok: true, email: d.email, manualLink })
}
