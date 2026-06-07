// POST /api/admin/advertisers/merge — collapse duplicate advertisers.
//
// Body: { survivorId, mergeIds: string[] }
//
// Every related row pointing at any id in mergeIds gets repointed at
// survivorId. After all related tables are updated, the merged
// advertiser_accounts rows themselves are deleted.
//
// Tables we touch (all via advertiser_account_id FK):
//   - ad_placements
//   - advertiser_contacts (migration 128)
//   - short_links
//   - lead_submissions (target_advertiser_id)
//   - guide_listings (advertiser_account_id, if column exists)
//
// Trigger from migration 128 keeps the inline contact_name/email/phone
// on the survivor row in sync with whichever contact is primary.
//
// Idempotent: if a merge id doesn't exist, it's silently skipped. If
// any update fails, the endpoint stops and returns the error — the DB
// is consistent (it just hasn't finished merging). The editor can
// re-trigger.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  survivorId?: string
  mergeIds?:   string[]
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const survivorId = body.survivorId?.trim()
  const mergeIds   = (body.mergeIds ?? []).map(s => s.trim()).filter(Boolean)
  if (!survivorId)       return NextResponse.json({ error: 'survivorId required' }, { status: 400 })
  if (mergeIds.length === 0) return NextResponse.json({ error: 'mergeIds required' }, { status: 400 })
  if (mergeIds.includes(survivorId)) {
    return NextResponse.json({ error: 'survivorId cannot also be in mergeIds' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const stats = { ad_placements: 0, advertiser_contacts: 0, short_links: 0, lead_submissions: 0, guide_listings: 0 }

  // Helper — update one table, swallow 'column does not exist' so
  // migration-tolerant tables work. Returns updated count.
  async function repoint(table: string, column: string): Promise<number> {
    const res = await supabase
      .from(table)
      .update({ [column]: survivorId })
      .in(column, mergeIds)
      .select('id')
    if (res.error) {
      // Missing table or missing column — log + skip rather than abort
      // the whole merge for a column that was never used here.
      const msg = res.error.message
      if (/relation .* does not exist/i.test(msg) || /column .* does not exist/i.test(msg)) {
        console.warn(`[merge] skipping ${table}.${column}: ${msg}`)
        return 0
      }
      throw res.error
    }
    return res.data?.length ?? 0
  }

  try {
    stats.ad_placements        = await repoint('ad_placements',       'advertiser_account_id')
    stats.advertiser_contacts  = await repoint('advertiser_contacts', 'advertiser_account_id')
    stats.short_links          = await repoint('short_links',         'advertiser_account_id')
    stats.lead_submissions     = await repoint('lead_submissions',    'target_advertiser_id')
    stats.guide_listings       = await repoint('guide_listings',      'advertiser_account_id')
  } catch (e) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err.message ?? 'merge failed', stats }, { status: 500 })
  }

  // Finally, delete the merged advertiser rows. With FKs now repointed,
  // there's nothing left holding them in place.
  const { error: delErr } = await supabase
    .from('advertiser_accounts')
    .delete()
    .in('id', mergeIds)
  if (delErr) {
    return NextResponse.json({ error: delErr.message, stats }, { status: 500 })
  }

  return NextResponse.json({ ok: true, survivorId, merged: mergeIds.length, stats })
}
