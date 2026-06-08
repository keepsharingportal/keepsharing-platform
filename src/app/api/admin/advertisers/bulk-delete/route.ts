// POST /api/admin/advertisers/bulk-delete
//
// Body: { ids: string[] }
//
// Two-phase to keep the editor in the loop on cascades:
//   Phase 1 (preview): client first POSTs with preview:true to get a
//     count of related rows that will be cascade-deleted (digital ad
//     placements, print placements, contacts, short links, listings,
//     proposals). The editor confirms in a dialog showing those
//     numbers before phase 2.
//   Phase 2 (commit): client POSTs with preview:false to actually
//     delete. Cascade is DB-driven (FK ON DELETE CASCADE on
//     advertiser_account_id columns), so we just delete the
//     advertiser_accounts rows and the rest goes with them.
//
// Returns: { deleted, cascaded: { ad_placements, print_ad_placements,
//   advertiser_contacts, short_links, guide_listings, proposals } }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  ids?:      string[]
  preview?:  boolean
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const ids = (body.ids ?? []).map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const supabase = createAdminClient()

  // Cascade counts — what would (or did) get deleted in addition to the
  // advertiser_accounts rows themselves. Migration-tolerant: tables that
  // don't exist yet return null counts and don't fail the request.
  async function countCascade(table: string, column: string): Promise<number | null> {
    const res = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in(column, ids)
    if (res.error) {
      const m = res.error.message
      if (/relation .* does not exist/i.test(m) || /column .* does not exist/i.test(m)) return null
      throw res.error
    }
    return res.count ?? 0
  }

  let cascaded: Record<string, number | null>
  try {
    cascaded = {
      ad_placements:       await countCascade('ad_placements',       'advertiser_account_id'),
      print_ad_placements: await countCascade('print_ad_placements', 'advertiser_account_id'),
      advertiser_contacts: await countCascade('advertiser_contacts', 'advertiser_account_id'),
      short_links:         await countCascade('short_links',         'advertiser_account_id'),
      guide_listings:      await countCascade('guide_listings',      'advertiser_account_id'),
      proposals:           await countCascade('proposals',           'advertiser_account_id'),
    }
  } catch (e) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err.message ?? 'cascade preview failed' }, { status: 500 })
  }

  // Preview only — return the counts and stop.
  if (body.preview) {
    return NextResponse.json({ ok: true, ids, cascaded, deleted: 0 })
  }

  // Commit — DB cascade does the related-row cleanup. The
  // ON DELETE behavior varies per table (some CASCADE, some SET NULL),
  // matching the migration definitions; the editor sees the totals in
  // the confirmation dialog before this fires.
  const { error: delErr } = await supabase
    .from('advertiser_accounts')
    .delete()
    .in('id', ids)
  if (delErr) {
    return NextResponse.json({ error: delErr.message, cascaded, deleted: 0 }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: ids.length, cascaded })
}
