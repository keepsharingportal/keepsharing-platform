// GET /api/reader/engagement-status?device_token=…
//
// Read-only counter view used by the engagement nudge to decide whether
// to show the subscribe prompt. No identifying info is returned beyond
// the counters and the optional dismissed-until timestamp.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('device_token')
  if (!token) return NextResponse.json({ articles_read_7d: 0, directory_views_7d: 0 })
  const db = adminDb()
  try {
    const { data } = await db
      .from('reader_engagement')
      .select('articles_read_7d, directory_views_7d, nudge_silenced_until')
      .eq('device_token', token)
      .maybeSingle()
    if (!data) return NextResponse.json({ articles_read_7d: 0, directory_views_7d: 0 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ articles_read_7d: 0, directory_views_7d: 0 })
  }
}
