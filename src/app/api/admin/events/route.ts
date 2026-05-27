// POST /api/admin/events
// Create a single event from the Quick Add panel in /admin/events.
//
// Body: { action: 'create', ...fields }
//   - title + start_date required
//   - status: 'pending' (default) or 'published'
//   - Auto-generates a unique slug from title + date.
//   - Defensive: if migration 077 columns are missing the table will reject
//     the insert; we strip them and retry once so the panel still works on
//     an unmigrated DB.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { ALL_MARKETS_SLUG, isKnownMarket } from '@/lib/markets'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event'
}

const RICH_COLS = [
  'registration_url','organizer_name','organizer_email','tags',
  'is_featured','featured_until','source_type','source_name','source_url',
  'discovery_notes','recurrence_rule',
  // migration 092 — image pipeline. Stripped when not present so insert
  // still works on a partially-migrated DB.
  'image_orig_path','image_width','image_height',
]

interface CreateBody {
  action?:          'create'
  title?:           string
  description?:     string | null
  start_date?:      string
  end_date?:        string | null
  start_time?:      string | null
  end_time?:        string | null
  location_name?:   string | null
  address?:         string | null
  city?:            string | null
  organizer_name?:  string | null
  organizer_email?: string | null
  registration_url?: string | null
  cost_text?:       string | null
  is_free?:         boolean
  is_featured?:     boolean
  category?:        string | null
  hero_image_url?:  string | null
  image_orig_path?: string | null
  image_width?:     number | null
  image_height?:    number | null
  age_range?:       string | null
  tags?:            string[] | null
  source_id?:       string | null
  source_name?:     string | null
  source_url?:      string | null
  status?:          'pending' | 'published'
  market?:          string
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin()
    const body = await req.json().catch(() => null) as CreateBody | null
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    if (body.action !== 'create') {
      return NextResponse.json({ error: 'action must be "create"' }, { status: 400 })
    }

    const title     = body.title?.trim()
    const startDate = body.start_date?.trim()
    if (!title)     return NextResponse.json({ error: 'title is required' },      { status: 400 })
    if (!startDate) return NextResponse.json({ error: 'start_date is required' }, { status: 400 })

    // Resolve the target market. Body overrides default only when the caller
    // can actually write to it — super-admins can write anywhere, others
    // can only write to one of their allowed_markets.
    const bodyMarket = body.market?.trim() || ''
    const wantedMarket = bodyMarket && bodyMarket !== ALL_MARKETS_SLUG
      ? bodyMarket
      : (ctx.viewingAll ? ctx.allowedMarkets[0] : ctx.activeMarket)
    if (!isKnownMarket(wantedMarket)) {
      return NextResponse.json({ error: 'Unknown market' }, { status: 400 })
    }
    if (ctx.role !== 'super' && !ctx.allowedMarkets.includes(wantedMarket)) {
      return NextResponse.json({ error: `No access to market "${wantedMarket}"` }, { status: 403 })
    }

    const status = body.status === 'published' ? 'published' : 'pending'
    const slug   = `${toSlug(title)}-${startDate}-${Math.random().toString(36).slice(2, 6)}`

    // Resolve source attribution. If a source_id was passed we can look up the
    // canonical name; otherwise fall through to whatever the operator typed.
    const supabase = supabaseAdmin()
    let sourceName: string | null = body.source_name?.trim() || null
    if (body.source_id) {
      const { data: src } = await supabase
        .from('trusted_event_sources')
        .select('name')
        .eq('id', body.source_id)
        .maybeSingle()
      if (src) sourceName = (src as { name?: string }).name ?? sourceName
    }

    const row: Record<string, unknown> = {
      title,
      slug,
      market:            wantedMarket,
      description:       body.description?.trim() || null,
      start_date:        startDate,
      end_date:          body.end_date?.trim() || startDate,
      start_time:        body.start_time?.trim() || null,
      end_time:          body.end_time?.trim() || null,
      location_name:     body.location_name?.trim() || null,
      address:           body.address?.trim() || null,
      city:              body.city?.trim() || null,
      age_range:         body.age_range?.trim() || null,
      cost_text:         body.cost_text?.trim() || null,
      is_free:           !!body.is_free,
      hero_image_url:    body.hero_image_url?.trim() || null,
      image_orig_path:   body.image_orig_path ?? null,
      image_width:       typeof body.image_width  === 'number' ? body.image_width  : null,
      image_height:      typeof body.image_height === 'number' ? body.image_height : null,
      category:          body.category || null,
      status,
      // Rich (migration 077) columns
      registration_url:  body.registration_url?.trim() || null,
      organizer_name:    body.organizer_name?.trim() || null,
      organizer_email:   body.organizer_email?.trim() || null,
      tags:              Array.isArray(body.tags) ? body.tags : null,
      is_featured:       !!body.is_featured,
      source_type:       'staff',
      source_name:       sourceName ?? 'Staff entry',
      source_url:        body.source_url?.trim() || null,
    }

    let inserted = await supabase
      .from('calendar_events')
      .insert(row)
      .select('*')
      .single()

    if (inserted.error && /column "market" does not exist/i.test(inserted.error.message)) {
      // Migration 090 not applied — drop market and retry so creating an
      // event still works on a partially-migrated DB.
      const noMarket: Record<string, unknown> = { ...row }
      delete noMarket.market
      inserted = await supabase.from('calendar_events').insert(noMarket).select('*').single()
    }

    if (inserted.error && /column .* does not exist/i.test(inserted.error.message)) {
      const fallback: Record<string, unknown> = { ...row }
      for (const k of RICH_COLS) delete fallback[k]
      inserted = await supabase.from('calendar_events').insert(fallback).select('*').single()
    }

    if (inserted.error) {
      console.error('[admin/events POST] insert error:', inserted.error)
      return NextResponse.json({ error: inserted.error.message }, { status: 500 })
    }

    revalidatePath('/admin/events')
    revalidatePath('/admin/events/pending')
    revalidatePath('/calendar')
    revalidatePath('/')
    return NextResponse.json({ success: true, event: inserted.data })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('[admin/events POST] unexpected error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

