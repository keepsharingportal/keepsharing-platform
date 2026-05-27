// POST /api/admin/active-market
// Body: { market: string }   ('all' is valid only for role='super')
//
// Sets the active-market cookie that getAdminContext() reads to scope every
// downstream query. Validates that the caller can actually act on the
// requested market before writing.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin, ADMIN_ACTIVE_MARKET_COOKIE } from '@/lib/admin/auth'
import { ALL_MARKETS_SLUG, isKnownMarket } from '@/lib/markets'

export const runtime = 'nodejs'

interface Body {
  market?: string
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin()
    const body = await req.json().catch(() => null) as Body | null
    const wanted = body?.market?.trim() ?? ''

    if (!wanted) {
      return NextResponse.json({ error: 'market is required' }, { status: 400 })
    }

    // 'all' is only meaningful for super-admins.
    if (wanted === ALL_MARKETS_SLUG) {
      if (ctx.role !== 'super') {
        return NextResponse.json({ error: 'Only super-admins can view all brands' }, { status: 403 })
      }
    } else {
      if (!isKnownMarket(wanted)) {
        return NextResponse.json({ error: 'Unknown market' }, { status: 400 })
      }
      if (ctx.role !== 'super' && !ctx.allowedMarkets.includes(wanted)) {
        return NextResponse.json({ error: 'No access to that market' }, { status: 403 })
      }
    }

    const cookieStore = await cookies()
    cookieStore.set(ADMIN_ACTIVE_MARKET_COOKIE, wanted, {
      path:     '/',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 365, // 1 year
      httpOnly: false, // safe to read client-side — it's a view preference
    })

    return NextResponse.json({ activeMarket: wanted })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('[admin/active-market] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
