// PATCH  /api/admin/short-links/[id] — edit a shortcode's destination + meta.
// DELETE /api/admin/short-links/[id] — deactivate a shortcode.
//
// The shortcode itself is NOT editable — that's the whole point of a dynamic
// QR code. The printed QR encodes /go/<shortcode> permanently; you change
// where it POINTS by editing destination/content here, and every existing
// printed QR instantly follows. Change the destination, the magazine QR
// redirects somewhere new — no reprint.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

// Fields the operator can change after creation. Deliberately excludes
// shortcode (would orphan printed QRs) and click_count (system-managed).
const EDITABLE = new Set([
  'destination', 'content_type', 'content_data', 'label',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'advertiser_account_id', 'qr_primary_color', 'is_active',
])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE.has(k)) updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  updates.updated_at = new Date().toISOString()

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('short_links')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[admin/short-links PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/content/short-links')
  return NextResponse.json({ success: true, link: data })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('short_links')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/content/short-links')
  return NextResponse.json({ success: true })
}
