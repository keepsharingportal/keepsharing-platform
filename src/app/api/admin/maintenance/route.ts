// POST /api/admin/maintenance
// Body: { enabled: boolean }
//
// Toggles maintenance mode. When on, public pages show a branded holding
// page. Admin + API routes stay functional so staff can work.
// Super Admin and Admin only.

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

// GET — check current status (used by the admin header button)
export async function GET() {
  try {
    const sb = supabaseAdmin()
    const { data } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
    return NextResponse.json({ enabled: data?.value === 'true' })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}

// POST — toggle
export async function POST(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as { enabled?: boolean } | null
  if (body?.enabled === undefined) {
    return NextResponse.json({ error: 'enabled is required' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  const { error } = await sb
    .from('site_settings')
    .upsert({
      key:        'maintenance_mode',
      value:      body.enabled ? 'true' : 'false',
      updated_at: new Date().toISOString(),
    })

  if (error) {
    // Table might not exist yet (migration 096 not applied)
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json({ enabled: false })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enabled: body.enabled })
}
