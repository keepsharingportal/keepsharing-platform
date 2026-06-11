// /api/admin/advertisers/[id]/report-token
//
//   GET    → return the current active token (mints one if missing)
//   POST   → regenerate (revoke prior, mint new)
//   DELETE → deactivate without minting a replacement

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mintToken(): string {
  // 32 bytes → 43 chars base64url. 256 bits of entropy — brute force is
  // intractable. base64url is URL-safe so no encoding/escaping needed.
  return randomBytes(32).toString('base64url')
}

// Default token lifetime. Email forwarding + screenshot leakage is the
// realistic threat — 90 days is long enough that advertisers rarely hit
// it during a normal renewal cadence, short enough that a leaked link
// goes stale before it can compound.
const DEFAULT_LIFETIME_DAYS = 90

function defaultExpiresAt(): string {
  return new Date(Date.now() + DEFAULT_LIFETIME_DAYS * 86_400_000).toISOString()
}

async function ensureActiveToken(advertiserId: string, actorAdminId?: string): Promise<{
  token: string
  view_count: number
  last_viewed_at: string | null
  created_at: string
  expires_at: string | null
}> {
  const supabase = createAdminClient()
  // A row is only useful if it's not yet expired. If the existing active
  // row has passed expiry, deactivate it and mint a fresh one.
  const existing = await supabase
    .from('advertiser_report_tokens')
    .select('id, token, view_count, last_viewed_at, created_at, expires_at')
    .eq('advertiser_id', advertiserId)
    .eq('is_active', true)
    .maybeSingle()
  const existingRow = existing.data as null | {
    id: string; token: string; view_count: number; last_viewed_at: string | null;
    created_at: string; expires_at: string | null;
  }
  if (existingRow) {
    const expired = existingRow.expires_at && new Date(existingRow.expires_at).getTime() < Date.now()
    if (!expired) return existingRow
    // Expired — deactivate, then fall through to mint.
    await supabase.from('advertiser_report_tokens').update({ is_active: false }).eq('id', existingRow.id)
  }

  const token = mintToken()
  const ins = await supabase
    .from('advertiser_report_tokens')
    .insert({ advertiser_id: advertiserId, token, created_by: actorAdminId ?? null, expires_at: defaultExpiresAt() })
    .select('token, view_count, last_viewed_at, created_at, expires_at')
    .single()
  if (ins.error) throw new Error(ins.error.message)
  return ins.data as { token: string; view_count: number; last_viewed_at: string | null; created_at: string; expires_at: string | null }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const t = await ensureActiveToken(id, admin.adminId)
    return NextResponse.json({ ok: true, ...t })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Deactivate any existing active row (history stays).
  await supabase
    .from('advertiser_report_tokens')
    .update({ is_active: false })
    .eq('advertiser_id', id)
    .eq('is_active', true)

  const token = mintToken()
  const ins = await supabase
    .from('advertiser_report_tokens')
    .insert({ advertiser_id: id, token, created_by: admin.adminId, expires_at: defaultExpiresAt() })
    .select('token, view_count, last_viewed_at, created_at, expires_at')
    .single()
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })

  await recordAuditEvent({
    ctx: admin, req,
    action:       'advertiser_report.token_regenerated',
    target_table: 'advertiser_accounts',
    target_id:    id,
  })
  revalidatePath(`/admin/advertisers/${id}`)
  return NextResponse.json({ ok: true, ...(ins.data as object) })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  await supabase
    .from('advertiser_report_tokens')
    .update({ is_active: false })
    .eq('advertiser_id', id)
    .eq('is_active', true)

  await recordAuditEvent({
    ctx: admin, req,
    action:       'advertiser_report.token_revoked',
    target_table: 'advertiser_accounts',
    target_id:    id,
  })
  revalidatePath(`/admin/advertisers/${id}`)
  return NextResponse.json({ ok: true })
}
