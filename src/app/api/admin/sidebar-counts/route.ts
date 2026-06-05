// GET /api/admin/sidebar-counts
//
// Tiny endpoint that returns red-badge counts for sidebar items.
// Service-role read, bypasses RLS. Called by Sidebar.tsx every 60s
// (and on window focus) so editors see new submissions land without
// reloading.
//
// Add new badge keys here when a new submission queue gets a sidebar
// home — the Sidebar.tsx ChildItem.badgeKey type uses these keys.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({
      community_nominations:    0,
      school_bits_pending:      0,
      mom_insiders_pending:     0,
    })
  }

  try {
    const client = sb()
    const [communityNew, schoolBitsPending, momInsidersPending] = await Promise.all([
      // Community submissions waiting for first triage: status='new'
      client.from('community_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new'),
      // School bits awaiting review (pre-publish)
      client.from('school_bits')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // Reader picks ("Mom Insiders") waiting for review.
      client.from('reader_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    return NextResponse.json({
      community_nominations: communityNew.count       ?? 0,
      school_bits_pending:   schoolBitsPending.count  ?? 0,
      mom_insiders_pending:  momInsidersPending.count ?? 0,
    })
  } catch {
    return NextResponse.json({
      community_nominations: 0,
      school_bits_pending:   0,
      mom_insiders_pending:  0,
    })
  }
}
