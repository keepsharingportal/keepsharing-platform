// /api/admin/birthday/lead-magnets/[slug]
//
// GET   → read the lead-magnet config for ?brand=rrp&slug={slug}
// PATCH → update title/description/file_url/preview_url/email_subject/email_body/from_name/is_active
//
// Singleton rows seeded by migration 206. We never delete from here — the
// editor can toggle is_active to take a magnet offline without losing the
// content they wrote.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = ['title', 'description', 'source', 'file_url', 'preview_url', 'email_subject', 'email_body', 'from_name', 'ghl_tags', 'ghl_workflow_id', 'is_active']

interface RouteParams { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { slug } = await params
  const brand = req.nextUrl.searchParams.get('brand') ?? 'rrp'
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('birthday_lead_magnets')
    .select('*')
    .eq('brand_slug', brand)
    .eq('slug', slug)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Lead magnet not found.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { slug } = await params
  const brand = req.nextUrl.searchParams.get('brand') ?? 'rrp'
  const body  = await req.json().catch(() => ({})) as Record<string, unknown>

  const update: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('birthday_lead_magnets')
    .update(update)
    .eq('brand_slug', brand)
    .eq('slug', slug)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { slug } = await params
  const brand = req.nextUrl.searchParams.get('brand') ?? 'rrp'
  const sb = createAdminClient()
  const { error } = await sb
    .from('birthday_lead_magnets')
    .delete()
    .eq('brand_slug', brand)
    .eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
