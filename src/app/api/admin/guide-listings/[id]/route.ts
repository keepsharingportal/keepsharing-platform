// PATCH  /api/admin/guide-listings/[id] — edit a guide listing
// DELETE /api/admin/guide-listings/[id] — delete a guide listing
//
// Per-listing CRUD for the admin browse + edit views. PATCH accepts
// any subset of editable inline columns (migration 134) plus a few
// guide-specific fields. DELETE is hard delete (the row goes away;
// guide_data and inline columns go with it).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EDITABLE = new Set([
  // Identity / display
  'business_name', 'office_phone', 'mobile_phone', 'website_url',
  'contact_email', 'address', 'city_state_zip', 'neighborhood',
  'hero_photo_url', 'hero_photo_orig_path', 'card_hook',
  // Guide-specific
  'category', 'listing_tier', 'listing_year',
  'is_published', 'display_order', 'notes', 'tags',
  // Cross-reference (set to advertiser id to associate, NULL to unlink)
  'advertiser_account_id',
])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue
    updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  // Normalize empty strings to NULL on optional text fields so the
  // editor 'clearing' a field actually clears it.
  for (const k of [
    'office_phone', 'mobile_phone', 'website_url', 'contact_email',
    'address', 'city_state_zip', 'neighborhood', 'hero_photo_url',
    'card_hook', 'category', 'notes',
  ]) {
    if (k in updates && typeof updates[k] === 'string') {
      updates[k] = (updates[k] as string).trim() || null
    }
  }

  const supabase = createAdminClient()

  // hero_photo_orig_path only exists on advertiser_accounts — it's mirrored
  // below, not stored on the listing row.
  const origPath = 'hero_photo_orig_path' in updates ? updates.hero_photo_orig_path : undefined
  delete updates.hero_photo_orig_path

  const { data, error } = await supabase
    .from('guide_listings')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error('[guide-listings PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Mirror identity fields onto the advertiser account ────────────────────
  // The public pages render from advertiser_accounts, not from guide_listings
  // — GuideDetailPage and ListingDetailPage both read the joined account. So
  // editing a hero photo (or a phone, or a hook) here and writing it only to
  // guide_listings saved the value and changed nothing a reader could see.
  //
  // Only mirrored when the listing is linked to an account, only for the
  // fields the public page actually reads, and only on an explicit edit —
  // this is an editor deliberately changing this listing, not a bulk import
  // sweeping over CRM-maintained records.
  const acctId = (data as { advertiser_account_id?: string | null } | null)?.advertiser_account_id
  const MIRRORED = [
    'business_name', 'office_phone', 'mobile_phone', 'website_url',
    'contact_email', 'address', 'city_state_zip', 'neighborhood',
    'hero_photo_url', 'card_hook',
  ]
  let mirrored: string[] = []
  if (acctId) {
    const acctPatch: Record<string, unknown> = {}
    for (const k of MIRRORED) if (k in updates) acctPatch[k] = updates[k]
    if (origPath !== undefined) acctPatch.hero_photo_orig_path = origPath
    if (Object.keys(acctPatch).length > 0) {
      acctPatch.updated_at = new Date().toISOString()
      const { error: acctErr } = await supabase
        .from('advertiser_accounts')
        .update(acctPatch)
        .eq('id', acctId)
      if (acctErr) {
        // Loud: the listing row saved but the visible copy didn't, which is
        // the confusing half-success this mirroring exists to prevent.
        console.error('[guide-listings PATCH] advertiser mirror failed', acctErr)
        return NextResponse.json(
          { error: `Listing saved, but the public record did not update: ${acctErr.message}` },
          { status: 500 },
        )
      }
      mirrored = Object.keys(acctPatch)
    }
  }

  return NextResponse.json({ listing: data, mirrored_to_advertiser: mirrored })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('guide_listings')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[guide-listings DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
