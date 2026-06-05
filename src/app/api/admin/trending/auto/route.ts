// GET /api/admin/trending/auto
//
// Returns the resolved auto-trending items that would fill the homepage
// trending bar if the editor's pinned list didn't take all 4 slots. Used
// by the /admin/trending live preview so the editor sees exactly what the
// homepage will render — pinned items plus the auto fill.
//
// Service-role only (admin route). Reads from the trending_paths_7d view
// and resolves paths to {label, link, emoji} via buildAutoTrendingItems.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAutoTrendingItems } from '@/lib/trending/auto-trending'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('trending_paths_7d')
    .select('path, unique_views')
    .limit(20)

  if (error) {
    // Pre-migration-118 tolerance: view missing → empty list.
    return NextResponse.json({ items: [], note: error.message })
  }

  const items = await buildAutoTrendingItems(
    supabase,
    (data ?? []) as Array<{ path: string; unique_views: number }>,
    new Set(),   // admin preview wants the full pool, no pinned exclusion
    20,
  )

  return NextResponse.json({ items })
}
