// /api/admin/distribution/newsletter-drafts
//
// GET   ?publication=rrp[&status=draft]  — list recent drafts
// POST  body { publication, issue_label, subject_line?, body_*, item_ids[], notes? }
//                                          — create a new draft
// PATCH body { id, ...updates }            — edit subject / body / status
//                                            (status transitions: draft → scheduled → sent)
//
// Eventually a worker reads scheduled drafts and POSTs them to GHL v3.
// Today, the editor PATCHes status=sent themselves once the manual ESP
// push completes.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DraftRow {
  id:              string
  publication:     string
  issue_label:     string
  subject_line:    string | null
  body_html:       string | null
  body_plain_text: string | null
  body_mobile:     string | null
  item_ids:        string[]
  status:          string
  send_at:         string | null
  sent_at:         string | null
  notes:           string | null
  created_at:      string
  updated_at:      string
}

const ALLOWED_STATUSES = new Set(['draft', 'scheduled', 'sent', 'archived'])

export async function GET(req: NextRequest) {
  await requireAdmin()
  const url = new URL(req.url)
  const pub = url.searchParams.get('publication')?.trim() || null
  const status = url.searchParams.get('status')?.trim() || null

  const sb = createAdminClient()
  let q = sb.from('newsletter_drafts')
    .select('id, publication, issue_label, subject_line, status, send_at, sent_at, item_ids, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (pub)    q = q.eq('publication', pub)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drafts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as Partial<DraftRow> | null
  if (!body?.publication) return NextResponse.json({ error: 'publication required' }, { status: 400 })
  if (!body?.issue_label?.trim()) return NextResponse.json({ error: 'issue_label required' }, { status: 400 })

  const sb = createAdminClient()
  const { data, error } = await sb.from('newsletter_drafts').insert({
    publication:     body.publication,
    issue_label:     body.issue_label.trim(),
    subject_line:    body.subject_line ?? null,
    body_html:       body.body_html ?? null,
    body_plain_text: body.body_plain_text ?? null,
    body_mobile:     body.body_mobile ?? null,
    item_ids:        Array.isArray(body.item_ids) ? body.item_ids : [],
    notes:           body.notes ?? null,
    created_by:      ctx.userId,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { id?: string } & Partial<DraftRow> | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowedFields = ['issue_label', 'subject_line', 'body_html', 'body_plain_text', 'body_mobile', 'item_ids', 'send_at', 'sent_at', 'notes'] as const
  const updates: Record<string, unknown> = {}
  for (const f of allowedFields) {
    if (body[f] !== undefined) updates[f] = body[f]
  }
  if (body.status) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: `invalid status: ${body.status}` }, { status: 400 })
    }
    updates.status = body.status
    if (body.status === 'sent' && !updates.sent_at) updates.sent_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { error } = await sb.from('newsletter_drafts').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
