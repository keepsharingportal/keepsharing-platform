// POST /api/admin/events/check-duplicates
// Body: { title: string, start_date: 'YYYY-MM-DD', city?: string, excludeId?: string }
//
// Returns: { matches: DuplicateMatch[] }
//
// Called by the Quick Add panel as the operator types — debounced client-
// side so we're not slamming the DB on every keystroke. Scopes the search
// to the caller's active market via getAdminContext().

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import {
  findPossibleDuplicates, supabaseAdminForDedup,
} from '@/lib/calendar/duplicates'

export const runtime = 'nodejs'

interface Body {
  title?:      string
  start_date?: string
  city?:       string | null
  excludeId?:  string
}

export async function POST(req: NextRequest) {
  let ctx
  try { ctx = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const title     = body.title?.trim()
  const startDate = body.start_date?.trim()
  if (!title || title.length < 3) return NextResponse.json({ matches: [] })
  if (!startDate) return NextResponse.json({ matches: [] })

  // Scope to a single market — never cross-bleed. For super-admins viewing
  // 'all', we use their active market if one is set, otherwise first
  // allowed (which for super is the platform's first market).
  const market = ctx.viewingAll ? ctx.allowedMarkets[0] : ctx.activeMarket

  try {
    const matches = await findPossibleDuplicates({
      supabase:  supabaseAdminForDedup(),
      title,
      start_date: startDate,
      city:       body.city ?? null,
      market,
      excludeId:  body.excludeId,
    })
    return NextResponse.json({ matches })
  } catch (e) {
    console.error('[admin/events/check-duplicates] error:', e)
    return NextResponse.json({ matches: [] })
  }
}
