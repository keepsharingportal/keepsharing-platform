// POST /api/admin/print-placements
//
// Create a new print ad placement on an existing advertiser. Body:
//   {
//     advertiser_account_id,
//     issue_month,             // YYYY-MM
//     design? ('new'|'pickup'),
//     directory?,
//     size,                    // 1 | 0.66 | 0.5 | 0.33 | 0.25 | 0.16 | 0.12
//     layout? ('horizontal'|'vertical'|'square'),
//     price?,
//     layout_notes?,
//     social_budget?,
//     specific_months?,        // string[]
//     expires_month?,          // YYYY-MM
//     notes?
//   }
//
// All validation enforced by the DB CHECK constraints in migration 129;
// the route just shapes the payload, omitting empty fields so the
// defaults / NULLs take effect.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  advertiser_account_id?: string
  issue_month?:           string
  design?:                'new' | 'pickup'
  directory?:             boolean
  size?:                  number
  layout?:                'horizontal' | 'vertical' | 'square' | null
  price?:                 number | null
  layout_notes?:          string | null
  social_budget?:         number | null
  specific_months?:       string[]
  expires_month?:         string | null
  notes?:                 string | null
  is_ongoing?:            boolean
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (!body.advertiser_account_id) return NextResponse.json({ error: 'advertiser_account_id required' }, { status: 400 })
  if (!body.issue_month)           return NextResponse.json({ error: 'issue_month required (YYYY-MM)' }, { status: 400 })
  if (typeof body.size !== 'number') return NextResponse.json({ error: 'size required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .insert({
      advertiser_account_id: body.advertiser_account_id,
      issue_month:           body.issue_month,
      design:                body.design ?? 'new',
      directory:             !!body.directory,
      size:                  body.size,
      layout:                body.layout ?? null,
      price:                 body.price ?? null,
      layout_notes:          body.layout_notes ?? null,
      social_budget:         body.social_budget ?? null,
      specific_months:       body.specific_months ?? [],
      expires_month:         body.expires_month ?? null,
      notes:                 body.notes ?? null,
      // Default ongoing=true — covers the 80% of advertisers who run
      // every month until cancelled. Explicit false marks seasonal buys.
      is_ongoing:            body.is_ongoing ?? true,
    })
    .select('*')
    .single()
  if (error) {
    console.error('[print-placements POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ placement: data })
}
