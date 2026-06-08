// POST /api/admin/advertisers/cleanup-directory-only
//
// One-shot cleanup for the historic 'directory-only' advertiser_accounts
// rows that were auto-created by old guide CSV imports. Now that
// guide_listings carries inline business identity (migration 134) and
// the importer no longer auto-creates advertisers (step 2), these
// rows are dead weight in the CRM Businesses view.
//
// Two-phase to keep the editor in the loop:
//   preview:true  — returns counts only, no writes.
//   preview:false — runs the cleanup transactionally:
//     1. UPDATE guide_listings SET advertiser_account_id = NULL
//        WHERE advertiser_account_id IN (cleanup ids)
//        (must do this FIRST — migration 028's FK is ON DELETE
//        CASCADE, which would otherwise CASCADE-DELETE the listings)
//     2. DELETE FROM advertiser_accounts WHERE id IN (cleanup ids)
//
// Safety net: an advertiser is only included when ALL of these are
// true (we re-check at the endpoint, not just trust kind):
//   - kind = 'directory_only'
//   - 0 ad_placements pointing here
//   - 0 print_ad_placements pointing here
//   - 0 proposals pointing here (FK column tolerant — pre-migration-132
//     environments skip this check)
// Anything failing those skips. The editor sees the skipped count.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  preview?: boolean
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  const preview = body?.preview !== false                              // default to preview for safety

  const supabase = createAdminClient()

  // 1. Pull every directory-only advertiser id.
  const dirRes = await supabase
    .from('advertiser_accounts')
    .select('id')
    .eq('kind', 'directory_only')
  if (dirRes.error) {
    return NextResponse.json({ error: dirRes.error.message }, { status: 500 })
  }
  const directoryIds = ((dirRes.data ?? []) as Array<{ id: string }>).map(r => r.id)
  if (directoryIds.length === 0) {
    return NextResponse.json({
      ok: true,
      preview,
      totalDirectoryOnly: 0, eligible: 0, skipped: 0, listingsToUnlink: 0,
      deleted: 0,
    })
  }

  // 2. Pull ids with ANY activity that should disqualify deletion.
  // We do this in three small queries vs one giant join — easier to
  // reason about and to tolerate migration variants (e.g. proposals
  // FK column may or may not exist).
  const disqualifiedIds = new Set<string>()

  const adsRes = await supabase
    .from('ad_placements')
    .select('advertiser_account_id')
    .in('advertiser_account_id', directoryIds)
  if (adsRes.error) return NextResponse.json({ error: adsRes.error.message }, { status: 500 })
  for (const r of (adsRes.data ?? []) as Array<{ advertiser_account_id: string }>) {
    if (r.advertiser_account_id) disqualifiedIds.add(r.advertiser_account_id)
  }

  const printRes = await supabase
    .from('print_ad_placements')
    .select('advertiser_account_id')
    .in('advertiser_account_id', directoryIds)
  if (!printRes.error) {
    for (const r of (printRes.data ?? []) as Array<{ advertiser_account_id: string }>) {
      if (r.advertiser_account_id) disqualifiedIds.add(r.advertiser_account_id)
    }
  }

  // Proposals FK is migration 132. Skip silently if not yet applied.
  const propRes = await supabase
    .from('proposals')
    .select('advertiser_account_id')
    .in('advertiser_account_id', directoryIds)
  if (!propRes.error) {
    for (const r of (propRes.data ?? []) as Array<{ advertiser_account_id: string | null }>) {
      if (r.advertiser_account_id) disqualifiedIds.add(r.advertiser_account_id)
    }
  }

  const eligibleIds = directoryIds.filter(id => !disqualifiedIds.has(id))

  // 3. Count how many guide_listings would be unlinked.
  let listingsToUnlink = 0
  if (eligibleIds.length > 0) {
    const linkRes = await supabase
      .from('guide_listings')
      .select('id', { count: 'exact', head: true })
      .in('advertiser_account_id', eligibleIds)
    if (linkRes.error) return NextResponse.json({ error: linkRes.error.message }, { status: 500 })
    listingsToUnlink = linkRes.count ?? 0
  }

  if (preview) {
    return NextResponse.json({
      ok: true,
      preview: true,
      totalDirectoryOnly: directoryIds.length,
      eligible:           eligibleIds.length,
      skipped:            disqualifiedIds.size,
      listingsToUnlink,
      deleted:            0,
    })
  }

  // Commit. Order is critical: null the FKs first, THEN delete.
  if (eligibleIds.length === 0) {
    return NextResponse.json({
      ok: true,
      preview: false,
      totalDirectoryOnly: directoryIds.length,
      eligible: 0, skipped: disqualifiedIds.size,
      listingsToUnlink: 0, deleted: 0,
    })
  }

  // Chunk if needed — supabase .in() has practical limits around a
  // few thousand ids per query. Most environments will be one chunk.
  const CHUNK = 1000
  for (let i = 0; i < eligibleIds.length; i += CHUNK) {
    const slice = eligibleIds.slice(i, i + CHUNK)
    const upd = await supabase
      .from('guide_listings')
      .update({ advertiser_account_id: null })
      .in('advertiser_account_id', slice)
    if (upd.error) {
      return NextResponse.json({ error: `unlink failed: ${upd.error.message}`, deleted: 0 }, { status: 500 })
    }
    const del = await supabase
      .from('advertiser_accounts')
      .delete()
      .in('id', slice)
    if (del.error) {
      return NextResponse.json({ error: `delete failed (some FKs already nulled): ${del.error.message}`, deleted: i }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    preview: false,
    totalDirectoryOnly: directoryIds.length,
    eligible:           eligibleIds.length,
    skipped:            disqualifiedIds.size,
    listingsToUnlink,
    deleted:            eligibleIds.length,
  })
}
