import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const sp       = req.nextUrl.searchParams
  const category = sp.get('category')
  const search   = sp.get('search')
  const date     = sp.get('date') ?? 'upcoming'
  const page     = parseInt(sp.get('page') ?? '1', 10)
  const limit    = 50

  const today    = new Date().toISOString().split('T')[0]
  const monthEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let query = supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, end_date, start_time, end_time, location_name, address, is_free, cost_text, description, category, hero_image_url', { count: 'exact' })
    .eq('status', 'published')
    .gte('start_date', today)
    .lte('start_date', monthEnd)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .range((page - 1) * limit, page * limit - 1)

  if (category && category !== 'All Events') {
    query = query.ilike('category', `%${category}%`)
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,location_name.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    events: data ?? [],
    total:  count ?? 0,
    page,
    pages:  Math.ceil((count ?? 0) / limit),
  })
}
