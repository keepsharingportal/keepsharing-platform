import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params
  const dest = req.nextUrl.searchParams.get('dest')

  // Log click to Supabase (best-effort, non-blocking)
  try {
    const supabase = await createClient()
    await supabase.from('ad_clicks').insert({
      ad_id:       adId,
      clicked_at:  new Date().toISOString(),
      zone:        req.nextUrl.searchParams.get('zone') ?? null,
      publication: req.nextUrl.searchParams.get('pub') ?? null,
      referrer:    req.headers.get('referer') ?? null,
      user_agent:  req.headers.get('user-agent') ?? null,
    })
    // Increment click counter
    await supabase.rpc('increment_ad_clicks', { ad_id_param: adId })
  } catch { /* non-blocking */ }

  // Redirect to destination
  if (dest && (dest.startsWith('http://') || dest.startsWith('https://'))) {
    return NextResponse.redirect(dest, { status: 302 })
  }
  return NextResponse.json({ logged: true, adId })
}
