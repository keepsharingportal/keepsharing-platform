// POST /api/admin/ads/clone  body: { id }
//
// Duplicates an existing (usually expired) ad_placements row into a fresh
// booking. Copies all the creative + targeting + pricing fields so the
// editor doesn't have to re-enter everything; resets the lifecycle fields
// so the new ad is its own independent record:
//
//   - new id
//   - archived_at = null    (it's a fresh booking, not a renewal of the old)
//   - is_active   = false   (editor flips ON after verifying dates)
//   - starts_at   = NOW
//   - ends_at     = null    (editor sets the new contract window)
//   - impression_count = 0  (clean stats so this run can be measured separately)
//   - click_count      = 0
//   - created_at  = NOW
//
// The advertiser_account_id IS copied so the new ad lands under the same
// customer's history. Use case: "YMCA's annual contract expired; they're
// signing a new one — clone last year's ad so we can compare year-over-year
// performance without overwriting the old data."

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Fields to carry over from the source row.
const CLONED_FIELDS = [
  'placement_type', 'context_type', 'context_slug',
  'advertiser_account_id',
  'ad_eyebrow', 'ad_headline', 'ad_description', 'ad_cta_label', 'ad_link', 'ad_image_url',
  'display_priority',
  'rotation_group', 'rotation_weight',
  'price_monthly', 'price_quarterly', 'price_annual',
  'advertiser_email', 'sales_rep_email',
  'accent_color', 'logo_url', 'sponsor_tagline',
  'creative_mode',
]

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Pull the source row — try full select first, fall back to a minimal
  // set if a migration column doesn't exist yet (defensive on top of
  // ALLOWED_FIELDS so a partial DB doesn't 500 the clone).
  let sourceRes = await supabase
    .from('ad_placements')
    .select(CLONED_FIELDS.join(', '))
    .eq('id', id)
    .single()
  if (sourceRes.error && /column .* does not exist/i.test(sourceRes.error.message)) {
    // Drop the most-likely-missing post-117 fields and retry.
    const fallbackFields = CLONED_FIELDS.filter(f =>
      !['accent_color', 'logo_url', 'sponsor_tagline', 'creative_mode',
        'advertiser_email', 'sales_rep_email',
        'price_monthly', 'price_quarterly', 'price_annual',
        'rotation_group', 'rotation_weight'].includes(f)
    )
    sourceRes = await supabase
      .from('ad_placements')
      .select(fallbackFields.join(', '))
      .eq('id', id)
      .single() as typeof sourceRes
  }
  if (sourceRes.error || !sourceRes.data) {
    return NextResponse.json({ error: sourceRes.error?.message ?? 'source ad not found' }, { status: 404 })
  }

  // Strip undefined keys (in case the fallback select dropped some) and
  // set the lifecycle fields fresh.
  const source = sourceRes.data as unknown as Record<string, unknown>
  const payload: Record<string, unknown> = {}
  for (const k of CLONED_FIELDS) {
    if (source[k] !== undefined) payload[k] = source[k]
  }
  payload.is_active        = false
  payload.starts_at        = new Date().toISOString()
  payload.ends_at          = null
  payload.archived_at      = null
  payload.impression_count = 0
  payload.click_count      = 0

  const { data: created, error: insertErr } = await supabase
    .from('ad_placements')
    .insert(payload)
    .select('id')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  await recordAuditEvent({
    ctx, req,
    action:        'ad_placement.cloned',
    target_table:  'ad_placements',
    target_id:     created?.id ?? null,
    meta:          { source_ad_id: id },
  })
  return NextResponse.json({ ok: true, id: created?.id })
}
