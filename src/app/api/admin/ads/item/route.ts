// /api/admin/ads/item
//   GET   ?id=…   → fetch a single ad_placements row + advertiser join
//   PATCH body { id, fields… } → update those fields
//
// Service-role, admin-auth. The Edit page calls GET on mount and PATCH
// on Save.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

const FULL_SELECT = `
  id, placement_type, context_type, context_slug,
  advertiser_account_id,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url,
  is_active, display_priority,
  starts_at, ends_at,
  rotation_group, rotation_weight,
  price_monthly, price_quarterly, price_annual,
  advertiser_email, sales_rep_email
`

const MIN_SELECT = `
  id, placement_type, context_type, context_slug,
  advertiser_account_id,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url,
  is_active, display_priority,
  starts_at, ends_at
`

export async function GET(req: NextRequest) {
  await requireAdmin()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  let { data, error } = await supabase
    .from('ad_placements')
    .select(FULL_SELECT)
    .eq('id', id)
    .single()

  if (error && /column .* does not exist/i.test(error.message)) {
    ({ data, error } = await supabase
      .from('ad_placements')
      .select(MIN_SELECT)
      .eq('id', id)
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ad: data })
}

// Updatable fields — keep this list explicit so a malicious client can't
// flip read-only columns like impression_count or created_at.
const ALLOWED_FIELDS = new Set([
  'placement_type', 'context_type', 'context_slug',
  'advertiser_account_id',
  'ad_eyebrow', 'ad_headline', 'ad_description', 'ad_cta_label', 'ad_link', 'ad_image_url',
  'is_active', 'display_priority',
  'starts_at', 'ends_at',
  'rotation_group', 'rotation_weight',
  'price_monthly', 'price_quarterly', 'price_annual',
  'advertiser_email', 'sales_rep_email',
])

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as Record<string, unknown> & { id?: string }
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (ALLOWED_FIELDS.has(k)) {
      // Empty strings become NULL — matches the new-form's behavior so
      // unsetting a field actually unsets it rather than storing "".
      updates[k] = v === '' ? null : v
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no updatable fields in body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let { error } = await supabase.from('ad_placements').update(updates).eq('id', id)

  // Migration-tolerant: if a column doesn't exist yet (e.g. rotation_weight
  // before 093, advertiser_email before 119), drop those keys and retry
  // so the editor isn't blocked on a missing migration.
  if (error && /column .* does not exist/i.test(error.message)) {
    const match = error.message.match(/column "?([\w.]+)"? does not exist/i)
    if (match) {
      const col = match[1].split('.').pop()!
      delete updates[col]
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: `Only un-applied column "${col}" was being updated.` }, { status: 400 })
      }
      ;({ error } = await supabase.from('ad_placements').update(updates).eq('id', id))
      if (!error) return NextResponse.json({ ok: true, note: `Skipped ${col} — column missing (apply migration).` })
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
