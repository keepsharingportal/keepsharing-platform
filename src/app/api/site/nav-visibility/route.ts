// GET /api/site/nav-visibility
// Public read of the nav override data so the client-side Navigation
// component can apply renames, hide flags, new-tab toggles, and append
// admin-added custom items. Cached at the edge for 30 seconds — menu
// changes propagate within half a minute without hammering the DB.

import { NextResponse } from 'next/server'
import { getNavRenderData } from '@/lib/site-nav/visibility'

export const runtime = 'nodejs'

interface ApiOverride {
  hidden?:        boolean
  labelOverride?: string | null
  hrefOverride?:  string | null
  openInNewTab?:  boolean
  isCustom?:      boolean
  parentKey?:     string | null
  sortOrder?:     number | null
}

export async function GET() {
  const { overrides, customs } = await getNavRenderData()

  // Serialize Map → plain object for JSON wire format.
  const ovObj: Record<string, ApiOverride> = {}
  for (const [k, v] of overrides) {
    ovObj[k] = {
      hidden:        v.hidden ?? false,
      labelOverride: v.labelOverride ?? null,
      hrefOverride:  v.hrefOverride ?? null,
      openInNewTab:  v.openInNewTab ?? false,
      isCustom:      v.isCustom ?? false,
      parentKey:     v.parentKey ?? null,
      sortOrder:     v.sortOrder ?? null,
    }
  }

  return NextResponse.json(
    { overrides: ovObj, customs },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60' } },
  )
}
