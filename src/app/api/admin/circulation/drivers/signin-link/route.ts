// POST /api/admin/circulation/drivers/signin-link
//
// Generates a fresh one-tap Supabase magic link for the driver and
// returns the URL. The admin can copy the URL to clipboard and text /
// DM it directly to the driver — bypasses email entirely.
//
// Note: magic links are single-use and expire after 1 hour. If the
// driver doesn't open it in time, generate another one.
//
// Body: { user_id: string }
// Returns: { url: string }

import { NextRequest, NextResponse } from 'next/server'
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

  const { data: linkData, error: linkErr } = await client.auth.admin.generateLink({
    type:  'magiclink',
    email: d.email,
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(`/distribution/${d.market}/driver`)}`,
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkErr?.message ?? 'Could not generate link' }, { status: 500 })
  }

  return NextResponse.json({ url: linkData.properties.action_link })
}
