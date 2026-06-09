// Admin endpoints for the Facebook integration.
//
//   GET    → return current status (connected / not, last sync, ad account info)
//   POST   → connect: validate token+ad_account_id against Meta, persist
//   DELETE → disconnect: deactivate the row (token wiped, history kept)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdAccount, MetaApiError } from '@/lib/integrations/facebook/client'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MARKET = 'rrp'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('facebook_integrations')
    .select('id, market, ad_account_id, ad_account_name, business_id, connected_at, last_sync_at, last_sync_status, last_sync_error, last_sync_campaign_count, last_sync_metric_count, is_active')
    .eq('market', MARKET)
    .maybeSingle()
  if (error) return NextResponse.json({ connected: false, error: error.message }, { status: 500 })
  return NextResponse.json({
    connected: !!data && data.is_active,
    integration: data ?? null,
  })
}

interface ConnectBody {
  access_token?:  string
  ad_account_id?: string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as ConnectBody | null
  const token = body?.access_token?.trim()
  const rawId = body?.ad_account_id?.trim()
  if (!token || !rawId) {
    return NextResponse.json({ error: 'access_token and ad_account_id are required' }, { status: 400 })
  }
  const adAccountId = rawId.startsWith('act_') ? rawId : `act_${rawId.replace(/\D/g, '')}`

  // Validate against Meta before we persist — fail fast with the actual
  // error so the operator can fix the paste.
  try {
    const acct = await verifyAdAccount(token, adAccountId)
    const supabase = supabaseAdmin()
    // Upsert on market — connecting again replaces the existing row.
    const { error } = await supabase
      .from('facebook_integrations')
      .upsert({
        market:                   MARKET,
        access_token:             token,
        ad_account_id:            adAccountId,
        ad_account_name:          acct.name,
        business_id:              acct.business?.id ?? null,
        connected_at:             new Date().toISOString(),
        is_active:                true,
        last_sync_at:             null,
        last_sync_status:         null,
        last_sync_error:          null,
        last_sync_campaign_count: null,
        last_sync_metric_count:   null,
      }, { onConflict: 'market' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath('/admin/integrations/facebook')
    return NextResponse.json({
      success: true,
      ad_account: { id: acct.id, name: acct.name, status: acct.account_status },
    })
  } catch (e) {
    const msg = e instanceof MetaApiError
      ? `${e.message}${e.code ? ` (Meta code ${e.code})` : ''}`
      : e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Could not connect: ${msg}` }, { status: 400 })
  }
}

export async function DELETE() {
  const supabase = supabaseAdmin()
  // Soft-delete: deactivate + wipe token. Historical metrics + campaign
  // mirror rows stay so the advertiser report still renders past months
  // even after disconnect.
  const { error } = await supabase
    .from('facebook_integrations')
    .update({ is_active: false, access_token: '' })
    .eq('market', MARKET)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/admin/integrations/facebook')
  return NextResponse.json({ success: true })
}
