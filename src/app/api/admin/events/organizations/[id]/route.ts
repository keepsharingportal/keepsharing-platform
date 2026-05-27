// PATCH /api/admin/events/organizations/[id]
// Edit a Community Connections row. Action='edit' with allowed fields.
//
// DELETE — soft-delete (deleted_at + status='archived').

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin, type AdminContext } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

// Reject if the caller can't act on the org's market. Super-admins bypass.
async function assertOrgMarketAccess(id: string, ctx: AdminContext): Promise<NextResponse | null> {
  if (ctx.role === 'super') return null
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('community_organizations')
    .select('market')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  const market = (data as { market?: string }).market
  if (market && !ctx.allowedMarkets.includes(market)) {
    return NextResponse.json({ error: `No access to market "${market}"` }, { status: 403 })
  }
  return null
}

const ALLOWED_FIELDS = new Set([
  'name','kind','description','logo_url','website','contact_name',
  'contact_email','contact_phone','address','city','state',
  'social_facebook','social_instagram','tags','notes','source_id','status',
])

interface JsonBody {
  action?: 'edit'
  [k: string]: unknown
}

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let admin: AdminContext
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const denial = await assertOrgMarketAccess(id, admin)
  if (denial) return denial

  const body = await req.json().catch(() => null) as JsonBody | null
  if (!body || body.action !== 'edit') {
    return NextResponse.json({ error: 'action must be "edit"' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (k === 'action') continue
    if (ALLOWED_FIELDS.has(k)) updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('community_organizations')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('[admin/events/organizations PATCH] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/events/organizations')
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let admin: AdminContext
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const denial = await assertOrgMarketAccess(id, admin)
  if (denial) return denial

  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('community_organizations')
    .update({ deleted_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id)

  if (error) {
    console.error('[admin/events/organizations DELETE] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/events/organizations')
  return NextResponse.json({ success: true })
}
