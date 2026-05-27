// POST /api/admin/events/organizations
// Create a Community Connections row from the inline Add Organization form.

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
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'org'
}

interface CreateBody {
  action?:          'create'
  name?:            string
  kind?:            string
  description?:     string | null
  logo_url?:        string | null
  website?:         string | null
  contact_name?:    string | null
  contact_email?:   string | null
  contact_phone?:   string | null
  address?:         string | null
  city?:            string | null
  state?:           string | null
  social_facebook?: string | null
  social_instagram?: string | null
  tags?:            string[] | null
  notes?:           string | null
  source_id?:       string | null
  market?:          string
}

export async function POST(req: NextRequest) {
  let ctx
  try { ctx = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  if (body.action !== 'create') {
    return NextResponse.json({ error: 'action must be "create"' }, { status: 400 })
  }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Resolve market the same way the events POST does — body wins only when
  // the caller can actually act on it.
  const bodyMarket = body.market?.trim() || ''
  const market = bodyMarket && bodyMarket !== ALL_MARKETS_SLUG
    ? bodyMarket
    : (ctx.viewingAll ? ctx.allowedMarkets[0] : ctx.activeMarket)
  if (!isKnownMarket(market)) {
    return NextResponse.json({ error: 'Unknown market' }, { status: 400 })
  }
  if (ctx.role !== 'super' && !ctx.allowedMarkets.includes(market)) {
    return NextResponse.json({ error: `No access to market "${market}"` }, { status: 403 })
  }

  const slug = `${toSlug(name)}-${Math.random().toString(36).slice(2, 5)}`

  const row = {
    name,
    slug,
    kind:              body.kind ?? 'community',
    description:       body.description ?? null,
    logo_url:          body.logo_url ?? null,
    website:           body.website ?? null,
    contact_name:      body.contact_name ?? null,
    contact_email:     body.contact_email ?? null,
    contact_phone:     body.contact_phone ?? null,
    address:           body.address ?? null,
    city:              body.city ?? null,
    state:             body.state ?? 'AL',
    social_facebook:   body.social_facebook ?? null,
    social_instagram:  body.social_instagram ?? null,
    tags:              Array.isArray(body.tags) ? body.tags : [],
    notes:             body.notes ?? null,
    source_id:         body.source_id ?? null,
    market,
    status:            'active',
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('community_organizations')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    console.error('[admin/events/organizations POST] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/events/organizations')
  return NextResponse.json({ success: true, org: data })
}
