// GET /api/admin/advertisers/list
//
// Lightweight list of every advertiser_account for dropdowns + autocomplete
// across the admin (ad edit, slot inquiry conversion, etc.). Service-role
// so we get every account regardless of landing_page_published.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_name, contact_email, contact_phone')
    .order('business_name', { ascending: true })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message, advertisers: [] }, { status: 500 })
  return NextResponse.json({ advertisers: data ?? [] })
}
