// POST /api/admin/ads/slot-toggle
//
// Flip a single ad slot on or off site-wide (or scoped to one context).
// The Slot Map page uses this to disable a placement_type entirely when
// the advertiser pulls out or the editor wants the spot dark while
// they're still finding a replacement booking.
//
// Body:
//   placementType: string  — required. The ad_placements.placement_type slug.
//   contextSlug:   string | null  — optional. NULL = site-wide disable.
//   disabled:      boolean — required. true to turn the slot OFF, false to turn it back ON.
//   note:          string  — optional. Why it was disabled (for the audit trail).
//
// Returns: { ok: true }
//
// The disable is read by getActiveAds() in src/lib/get-active-ads.ts —
// any slot with disabled=true returns an empty array regardless of how
// many ad_placements rows exist for it. Page layouts collapse around
// the empty slot the same way they do when no booking exists.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  await requireAdmin()

  let body: { placementType?: string; contextSlug?: string | null; disabled?: boolean; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const placementType = body.placementType?.trim()
  const contextSlug   = body.contextSlug?.trim() || null
  const disabled      = body.disabled
  const note          = body.note?.trim() || null

  if (!placementType) {
    return NextResponse.json({ error: 'placementType required' }, { status: 400 })
  }
  if (typeof disabled !== 'boolean') {
    return NextResponse.json({ error: 'disabled (boolean) required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Delete any existing row for this exact (placement_type, context_slug)
  // pair. "Enabled" is the absence of a row, so this is also how we
  // re-enable a slot.
  let del = supabase
    .from('ad_slot_settings')
    .delete()
    .eq('placement_type', placementType)
  del = contextSlug === null ? del.is('context_slug', null) : del.eq('context_slug', contextSlug)
  const { error: delErr } = await del
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (disabled) {
    // Insert the disable record.
    const { error: insErr } = await supabase
      .from('ad_slot_settings')
      .insert({ placement_type: placementType, context_slug: contextSlug, disabled: true, note })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // Invalidate the public pages so the change is visible immediately
  // instead of after the next ISR refresh.
  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/school-zone')
  revalidatePath('/school-bits')

  return NextResponse.json({ ok: true })
}
