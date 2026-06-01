// GET /api/site/nav-visibility
// Public read of the hidden-nav keys so the client-side Navigation
// component can filter its items. Cached at the edge for 30 seconds —
// menu changes propagate within half a minute without hammering the DB.

import { NextResponse } from 'next/server'
import { getHiddenNavKeys } from '@/lib/site-nav/visibility'

export const runtime = 'nodejs'

export async function GET() {
  const keys = await getHiddenNavKeys()
  return NextResponse.json(
    { hidden: Array.from(keys) },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60' } },
  )
}
