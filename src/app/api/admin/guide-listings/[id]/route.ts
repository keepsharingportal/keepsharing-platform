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
  'hero_photo_url', 'card_hook',
  // Guide-specific
  'category', 'subcategory', 'listing_tier', 'listing_year',
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
    'card_hook', 'category', 'subcategory', 'notes',
  ]) {
    if (k in updates && typeof updates[k] === 'string') {
      updates[k] = (updates[k] as string).trim() || null
    }
  }

  const supabase = createAdminClient()
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
  return NextResponse.json({ listing: data })
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
