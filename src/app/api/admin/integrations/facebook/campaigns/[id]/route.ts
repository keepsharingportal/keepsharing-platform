// PATCH /api/admin/integrations/facebook/campaigns/:id
//
// Manual override for a campaign's advertiser binding. Used when the
// Ads Manager campaign name doesn't follow the [slug] convention (legacy
// campaigns, multi-client promos, etc.).
//
// Body: { advertiser_id: string | null }
//   string → bind to that advertiser, mark source='manual'
//   null   → clear the manual override, fall back to auto-mapping
//            on the next sync (or remain unmapped if no slug parses)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as { advertiser_id?: string | null } | null
  if (!body || !('advertiser_id' in body)) {
    return NextResponse.json({ error: 'advertiser_id (string | null) required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const patch: Record<string, unknown> = body.advertiser_id
    ? { advertiser_id: body.advertiser_id, advertiser_mapping_source: 'manual' }
    : { advertiser_id: null,               advertiser_mapping_source: 'unmapped' }

  const { error } = await supabase
    .from('facebook_campaigns')
    .update(patch)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/integrations/facebook')
  return NextResponse.json({ success: true })
}
