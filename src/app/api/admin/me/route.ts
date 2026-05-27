// GET /api/admin/me
// Returns the current admin's context (role, allowed markets, active market).
// Used by the BrandSwitcher in the sidebar and any client component that
// needs to know what brand the user is currently viewing.

import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/auth'
import { MARKETS } from '@/lib/markets'

export const runtime = 'nodejs'

export async function GET() {
  const ctx = await getAdminContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Decorate the markets list with display metadata so the client doesn't
  // need to import @/lib/markets too.
  const markets = ctx.allowedMarkets.map(slug => {
    const meta = MARKETS.find(m => m.slug === slug)
    return {
      slug,
      short:       meta?.short ?? slug.toUpperCase(),
      displayName: meta?.displayName ?? slug,
    }
  })

  return NextResponse.json({
    email:         ctx.email,
    fullName:      ctx.fullName,
    role:          ctx.role,
    allowedMarkets: markets,
    activeMarket:  ctx.activeMarket,
    viewingAll:    ctx.viewingAll,
  })
}
