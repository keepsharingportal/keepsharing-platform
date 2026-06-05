// CRUD for circulation_email_templates.
// GET    /api/admin/circulation/email-templates?market=rrp   — list
// PATCH  /api/admin/circulation/email-templates              — { id, subject?, body_html?, send_day?, active? }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'
  const { data, error } = await sb()
    .from('circulation_email_templates')
    .select('*')
    .eq('market', market)
    .order('id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    id?:        string
    subject?:   string
    body_html?: string
    send_day?:  number
    active?:    boolean
  } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.subject   !== undefined) updates.subject   = body.subject
  if (body.body_html !== undefined) updates.body_html = body.body_html
  if (body.send_day  !== undefined) updates.send_day  = body.send_day
  if (body.active    !== undefined) updates.active    = body.active

  const { error } = await sb().from('circulation_email_templates').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
