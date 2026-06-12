// Admin polls API.
//
//   GET    /api/admin/polls?brand_slug=...    → list polls (brand-scoped or all)
//   POST   /api/admin/polls                   → create a poll
//   PATCH  /api/admin/polls                   → update a poll (question, options, dates, active)
//   DELETE /api/admin/polls                   → delete a poll (cascades to responses)
//
// brand_slug=null on the row means the poll runs across every brand.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreateBody {
  brand_slug?:   string | null
  question:      string
  options:       string[]
  opens_at?:     string | null
  closes_at?:    string | null
  is_active?:    boolean
  internal_notes?: string | null
}
interface UpdateBody extends Partial<CreateBody> { id: string }

function validateOptions(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null
  const cleaned = options.map(s => String(s ?? '').trim()).filter(Boolean)
  if (cleaned.length < 2 || cleaned.length > 6) return null
  return cleaned
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const brandSlug = req.nextUrl.searchParams.get('brand_slug')
  const sb = createAdminClient()

  let q = sb.from('weekly_polls')
    .select('id, brand_slug, question, options, vote_counts, total_votes, opens_at, closes_at, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (brandSlug && brandSlug !== 'all') q = q.or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ polls: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({})) as CreateBody
  const options = validateOptions(body.options)
  if (!body.question?.trim() || !options) {
    return NextResponse.json({ error: 'question and 2-6 options required' }, { status: 400 })
  }

  const sb = createAdminClient()
  const opens = body.opens_at ? new Date(body.opens_at).toISOString() : new Date().toISOString()
  const closes = body.closes_at ? new Date(body.closes_at).toISOString() : null

  const { data, error } = await sb.from('weekly_polls').insert({
    brand_slug:     body.brand_slug ?? null,
    question:       body.question.trim(),
    options,
    opens_at:       opens,
    closes_at:      closes,
    is_active:      body.is_active ?? true,
    internal_notes: body.internal_notes ?? null,
    vote_counts:    new Array(options.length).fill(0),
    created_by:     ctx.adminId,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'poll.created',
    target_table: 'weekly_polls',
    target_id:    data.id,
    after:        { question: data.question, options, brand_slug: data.brand_slug },
  })

  return NextResponse.json({ poll: data })
}

export async function PATCH(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({})) as UpdateBody
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.question !== undefined)       update.question       = body.question.trim()
  if (body.options !== undefined) {
    const cleaned = validateOptions(body.options)
    if (!cleaned) return NextResponse.json({ error: '2-6 options required' }, { status: 400 })
    update.options = cleaned
    // If option count changed, we cannot map old responses cleanly — leave
    // existing responses + counts intact and let the admin see the
    // mismatch in the results UI rather than silently re-bucket.
  }
  if (body.opens_at !== undefined)       update.opens_at       = body.opens_at  ? new Date(body.opens_at).toISOString()  : null
  if (body.closes_at !== undefined)      update.closes_at      = body.closes_at ? new Date(body.closes_at).toISOString() : null
  if (body.is_active !== undefined)      update.is_active      = body.is_active
  if (body.brand_slug !== undefined)     update.brand_slug     = body.brand_slug
  if (body.internal_notes !== undefined) update.internal_notes = body.internal_notes

  const sb = createAdminClient()
  const { data: before } = await sb.from('weekly_polls').select('*').eq('id', body.id).maybeSingle()
  const { error } = await sb.from('weekly_polls').update(update).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'poll.updated',
    target_table: 'weekly_polls',
    target_id:    body.id,
    before:       (before as Record<string, unknown> | null) ?? null,
    after:        update,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({})) as { id?: string }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createAdminClient()
  const { error } = await sb.from('weekly_polls').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'poll.deleted',
    target_table: 'weekly_polls',
    target_id:    body.id,
  })

  return NextResponse.json({ ok: true })
}
