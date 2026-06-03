// GET    /api/admin/magazine-issues          — list all issues for the active market
// POST   /api/admin/magazine-issues          — create a new issue
// PATCH  /api/admin/magazine-issues          — update an issue
// DELETE /api/admin/magazine-issues?id=...   — remove an issue
//
// "Make current" is a POST with action=set-current — it flips
// is_current=true on the target row and sets every other row in the
// same market to false atomically.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { extractIssuuPublicationUrl } from '@/lib/magazine/issuu'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function bust() {
  revalidatePath('/')
}

interface CreateBody {
  market?:       string
  label?:        string
  tagline?:      string | null
  issue_month?:  string                   // YYYY-MM-DD
  cover_url?:    string | null
  issuu_url?:    string
  is_current?:   boolean
  sort_order?:   number | null
}

interface PatchBody extends Partial<CreateBody> {
  id?:           string
  action?:       'set-current'
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'
  const sb     = supabaseAdmin()
  const { data, error } = await sb
    .from('magazine_issues')
    .select('*')
    .eq('market', market)
    .order('issue_month', { ascending: false })
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json({ issues: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ issues: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  if (!body.label?.trim())       return NextResponse.json({ error: 'label is required' },       { status: 400 })
  if (!body.issue_month?.trim()) return NextResponse.json({ error: 'issue_month is required' }, { status: 400 })
  if (!body.issuu_url?.trim())   return NextResponse.json({ error: 'issuu_url is required' },   { status: 400 })

  // Admin can paste the iframe embed code, the embed src URL, or the
  // publication URL. Normalize to the canonical publication URL so the
  // homepage's "Open in New Tab" button always lands on the full-screen
  // reader and the embed derivation has a consistent input.
  const canonicalUrl = extractIssuuPublicationUrl(body.issuu_url)
  if (!canonicalUrl) {
    return NextResponse.json({
      error: 'Could not recognize this as an Issuu link. Paste the publication URL, the embed src, or the full <iframe> embed code.',
    }, { status: 400 })
  }

  const sb     = supabaseAdmin()
  const market = body.market?.trim() || 'rrp'

  // If the new row asks to be current, clear any existing current row
  // first so the partial unique index doesn't reject the insert.
  if (body.is_current) {
    await sb.from('magazine_issues').update({ is_current: false }).eq('market', market).eq('is_current', true)
  }

  const { data, error } = await sb
    .from('magazine_issues')
    .insert({
      market,
      label:       body.label.trim(),
      tagline:     body.tagline?.trim() || null,
      issue_month: body.issue_month,
      cover_url:   body.cover_url?.trim() || null,
      issuu_url:   canonicalUrl,
      is_current:  !!body.is_current,
      sort_order:  body.sort_order ?? null,
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  bust()
  return NextResponse.json({ issue: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as PatchBody | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = supabaseAdmin()

  // Special action — flip a row to current and clear the rest.
  if (body.action === 'set-current') {
    const { data: target, error: readErr } = await sb
      .from('magazine_issues')
      .select('market')
      .eq('id', body.id)
      .maybeSingle()
    if (readErr || !target) return NextResponse.json({ error: 'issue not found' }, { status: 404 })

    await sb.from('magazine_issues')
      .update({ is_current: false })
      .eq('market', target.market)
      .eq('is_current', true)
    const { error: setErr } = await sb
      .from('magazine_issues')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', body.id)
    if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })
    bust()
    return NextResponse.json({ ok: true })
  }

  // Regular field patch
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.label       !== undefined) updates.label       = body.label
  if (body.tagline     !== undefined) updates.tagline     = body.tagline
  if (body.issue_month !== undefined) updates.issue_month = body.issue_month
  if (body.cover_url   !== undefined) updates.cover_url   = body.cover_url
  if (body.issuu_url   !== undefined) {
    const canonical = extractIssuuPublicationUrl(body.issuu_url)
    if (!canonical) {
      return NextResponse.json({
        error: 'Could not recognize this as an Issuu link. Paste the publication URL, the embed src, or the full <iframe> embed code.',
      }, { status: 400 })
    }
    updates.issuu_url = canonical
  }
  if (body.sort_order  !== undefined) updates.sort_order  = body.sort_order

  const { error } = await sb.from('magazine_issues').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  bust()
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 })
  const sb = supabaseAdmin()
  const { error } = await sb.from('magazine_issues').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  bust()
  return NextResponse.json({ ok: true })
}
