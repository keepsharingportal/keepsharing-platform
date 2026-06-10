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

async function ensureActiveToken(advertiserId: string, actorAdminId?: string): Promise<{
  token: string
  view_count: number
  last_viewed_at: string | null
  created_at: string
}> {
  const supabase = createAdminClient()
  const existing = await supabase
    .from('advertiser_report_tokens')
    .select('token, view_count, last_viewed_at, created_at')
    .eq('advertiser_id', advertiserId)
    .eq('is_active', true)
    .maybeSingle()
  if (existing.data) return existing.data as { token: string; view_count: number; last_viewed_at: string | null; created_at: string }

  const token = mintToken()
  const ins = await supabase
    .from('advertiser_report_tokens')
    .insert({ advertiser_id: advertiserId, token, created_by: actorAdminId ?? null })
    .select('token, view_count, last_viewed_at, created_at')
    .single()
  if (ins.error) throw new Error(ins.error.message)
  return ins.data as { token: string; view_count: number; last_viewed_at: string | null; created_at: string }
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
    .insert({ advertiser_id: id, token, created_by: admin.adminId })
    .select('token, view_count, last_viewed_at, created_at')
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
