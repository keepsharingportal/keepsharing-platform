// POST /api/admin/guide-listings/dedupe
//
// Consolidates duplicate guide_listings rows for the same business +
// category within one guide. Common cause: editor ran the importer
// twice in Insert mode instead of Merge mode.
//
// Dedupe key: (guide_type_slug, advertiser_account_id, lower(business_name), category)
// When duplicates exist:
//   1. Prefer the row with advertiser_account_id NOT NULL
//   2. Prefer the row with is_published = true
//   3. Prefer the most recent created_at
// Everything else in the group gets DELETED.
//
// Modes:
//   dry_run=true  → returns the plan without deleting
//   dry_run=false → executes
//
// Always idempotent — re-running on clean data is a no-op.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  guide_type_slug?: string
  dry_run?:         boolean
}

interface Row {
  id:                    string
  advertiser_account_id: string | null
  business_name:         string | null
  category:              string | null
  listing_year:          number | null
  listing_tier:          string | null
  is_published:          boolean
  created_at:            string
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body  = await req.json().catch(() => ({})) as Body
  const guide = body.guide_type_slug?.trim()
  const dry   = body.dry_run !== false
  if (!guide) return NextResponse.json({ error: 'guide_type_slug required.' }, { status: 400 })

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('guide_listings')
    .select('id, advertiser_account_id, business_name, category, listing_year, listing_tier, is_published, created_at')
    .eq('guide_type_slug', guide)
    .limit(10000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]

  // Group by (advertiser_account_id or lower(business_name), category)
  // — within a guide, the same business should have at most one row
  // per category. listing_year is intentionally ignored: vendors who
  // appear in both the prior and current year's CSV would otherwise
  // double up, which isn't what we want for an evergreen directory.
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const idKey = r.advertiser_account_id
      ? `adv:${r.advertiser_account_id}`
      : `name:${(r.business_name ?? '').trim().toLowerCase()}`
    const key = `${idKey}|cat:${(r.category ?? '').toLowerCase()}`
    const bucket = groups.get(key) ?? []
    bucket.push(r)
    groups.set(key, bucket)
  }

  // Pick a winner per group + collect losers to delete.
  const toDelete: string[] = []
  const report: Array<{ key: string; kept: { id: string; tier: string | null }; deleted: Array<{ id: string; tier: string | null }> }> = []

  for (const [key, bucket] of groups) {
    if (bucket.length < 2) continue
    // Sort by preference (best first)
    const sorted = [...bucket].sort((a, b) => {
      // 1) Linked advertiser wins
      const aLinked = a.advertiser_account_id ? 1 : 0
      const bLinked = b.advertiser_account_id ? 1 : 0
      if (aLinked !== bLinked) return bLinked - aLinked
      // 2) Published wins
      if (a.is_published !== b.is_published) return b.is_published ? 1 : -1
      // 3) Most recent wins
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
    const [winner, ...losers] = sorted
    losers.forEach(l => toDelete.push(l.id))
    report.push({
      key,
      kept:    { id: winner.id, tier: winner.listing_tier },
      deleted: losers.map(l => ({ id: l.id, tier: l.listing_tier })),
    })
  }

  if (dry) {
    return NextResponse.json({
      dry_run:        true,
      groups_total:   groups.size,
      groups_with_dupes: report.length,
      will_delete:    toDelete.length,
      report,
    })
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ dry_run: false, deleted: 0, note: 'No duplicates found.' })
  }

  // Batched delete (Supabase caps in() at ~1000 ids per call to be safe).
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += 500) {
    const chunk = toDelete.slice(i, i + 500)
    const { error: delErr } = await sb.from('guide_listings').delete().in('id', chunk)
    if (delErr) return NextResponse.json({ error: delErr.message, deleted_so_far: deleted }, { status: 500 })
    deleted += chunk.length
  }

  return NextResponse.json({
    dry_run:        false,
    groups_total:   groups.size,
    groups_with_dupes: report.length,
    deleted,
  })
}
