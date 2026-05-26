import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Compute the YYYY-MM-DD date window for a "when" preset.
// 'today'    → today only
// 'weekend'  → Fri / Sat / Sun (or remaining weekend days from now)
// 'week'     → next 7 days inclusive of today
// 'month'    → next 30 days
// 'upcoming' → next 60 days (default — matches the existing behavior)
function dateWindow(when: string): { start: string; end: string } {
  const pad   = (n: number) => String(n).padStart(2, '0')
  const ymd   = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (when === 'today') return { start: ymd(today), end: ymd(today) }

  if (when === 'weekend') {
    // Find the next upcoming Friday — Sunday window.
    // If today is already in that window, start from today.
    const dow = today.getDay()  // 0 Sun .. 6 Sat
    const start = new Date(today)
    if (dow === 5 || dow === 6) {
      // Already Fri/Sat — keep today as start
    } else if (dow === 0) {
      // Sunday — keep today as start, end same day
    } else {
      // Mon-Thu — fast forward to Fri
      start.setDate(start.getDate() + (5 - dow))
    }
    // End on the following Sunday
    const end = new Date(start)
    while (end.getDay() !== 0) end.setDate(end.getDate() + 1)
    return { start: ymd(start), end: ymd(end) }
  }

  if (when === 'week')  { const e = new Date(today); e.setDate(e.getDate() + 7);  return { start: ymd(today), end: ymd(e) } }
  if (when === 'month') { const e = new Date(today); e.setDate(e.getDate() + 30); return { start: ymd(today), end: ymd(e) } }

  // Default: next 60 days
  const e = new Date(today); e.setDate(e.getDate() + 60)
  return { start: ymd(today), end: ymd(e) }
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const sp        = req.nextUrl.searchParams
  const category  = sp.get('category')           // category slug from EVENT_CATEGORIES
  const tag       = sp.get('tag')                // single tag for now (e.g. 'free', 'toddler-friendly')
  const isFree    = sp.get('is_free') === 'true' // shortcut for free-only
  const search    = sp.get('search') ?? ''
  const when      = sp.get('when') ?? 'upcoming'
  const page      = parseInt(sp.get('page') ?? '1', 10)
  const limit     = 50

  const { start, end } = dateWindow(when)

  // Probe for the new tags column (added in migration 077). Falls back gracefully.
  const probe = await supabase.from('calendar_events').select('tags').limit(1)
  const hasTagsColumn = !probe.error

  let query = supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, end_date, start_time, end_time, location_name, address, city, is_free, cost_text, description, category, hero_image_url, registration_url, organizer_name', { count: 'exact' })
    .eq('status', 'published')
    .gte('start_date', start)
    .lte('start_date', end)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .range((page - 1) * limit, page * limit - 1)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }
  if (isFree) {
    query = query.eq('is_free', true)
  }
  if (tag && hasTagsColumn) {
    // Postgres array contains: { tags: { cs: '{toddler-friendly}' } } via .contains
    query = query.contains('tags', [tag])
  }
  if (search) {
    const safe = search.replace(/[%,]/g, ' ').trim()
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,location_name.ilike.%${safe}%,description.ilike.%${safe}%`)
    }
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    events:  data ?? [],
    total:   count ?? 0,
    page,
    pages:   Math.ceil((count ?? 0) / limit),
    window:  { start, end, when },
  })
}
