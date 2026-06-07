// PATCH  /api/admin/advertiser-contacts/[id]  — edit a contact's fields.
// DELETE /api/admin/advertiser-contacts/[id]  — remove a contact.
//
// PATCH body:
//   { name?, email?, phone?, role?, is_primary?, notes? }
//
// Promoting a contact to primary in the same request demotes the existing
// primary on that account first (single transaction). The trigger in
// migration 128 mirrors name/email/phone onto advertiser_accounts after
// the write completes.
//
// DELETE drops the row; the trigger handles inline-column sync if the
// deleted contact was the primary.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const VALID_ROLES = ['ad_rep', 'billing', 'listing_owner', 'decision_maker', 'other'] as const

const EDITABLE = new Set(['name', 'email', 'phone', 'role', 'is_primary', 'notes'])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue
    updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Validate role if provided.
  if ('role' in updates && !(VALID_ROLES as readonly string[]).includes(updates.role as string)) {
    return NextResponse.json({ error: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }
  // Normalize empty strings to NULL on optional fields so they don't
  // accidentally persist as ''.
  for (const k of ['email', 'phone', 'notes'] as const) {
    if (k in updates) {
      const v = updates[k]
      if (typeof v === 'string') updates[k] = v.trim() || null
    }
  }

  const supabase = createAdminClient()

  // Need the parent advertiser_account_id to scope the primary-demotion
  // when this contact is being promoted. Single read; cheap.
  const { data: existing, error: lookupErr } = await supabase
    .from('advertiser_contacts')
    .select('advertiser_account_id')
    .eq('id', id)
    .single()
  if (lookupErr || !existing) {
    return NextResponse.json({ error: lookupErr?.message ?? 'Contact not found' }, { status: 404 })
  }

  // If promoting to primary, demote any other primary on the same account.
  if (updates.is_primary === true) {
    await supabase
      .from('advertiser_contacts')
      .update({ is_primary: false })
      .eq('advertiser_account_id', existing.advertiser_account_id)
      .eq('is_primary', true)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('advertiser_contacts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error('[advertiser-contacts PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ contact: data })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('advertiser_contacts')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[advertiser-contacts DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
