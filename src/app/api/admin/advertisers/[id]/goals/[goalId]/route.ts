// /api/admin/advertisers/[id]/goals/[goalId]
//   PATCH  → edit { target_value?, period_start?, period_end?, notes? }
//   DELETE → soft-delete (is_active = false)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PatchBody {
  target_value?: number
  period_start?: string
  period_end?:   string
  notes?:        string | null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; goalId: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id, goalId } = await ctx.params
  if (!id || !goalId) return NextResponse.json({ error: 'id + goalId required' }, { status: 400 })

  const body = await req.json().catch(() => null) as PatchBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.target_value !== undefined) {
    if (!Number.isFinite(body.target_value) || body.target_value <= 0) {
      return NextResponse.json({ error: 'target_value must be positive' }, { status: 400 })
    }
    updates.target_value = body.target_value
  }
  if (body.period_start !== undefined) updates.period_start = body.period_start
  if (body.period_end   !== undefined) updates.period_end   = body.period_end
  if (body.notes        !== undefined) updates.notes        = body.notes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('advertiser_report_goals')
    .update(updates)
    .eq('id', goalId)
    .eq('advertiser_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx: admin, req,
    action:       'advertiser_report.goal_updated',
    target_table: 'advertiser_report_goals',
    target_id:    goalId,
    after:        updates as Record<string, unknown>,
  })
  revalidatePath(`/admin/advertisers/${id}`)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; goalId: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id, goalId } = await ctx.params
  if (!id || !goalId) return NextResponse.json({ error: 'id + goalId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('advertiser_report_goals')
    .update({ is_active: false })
    .eq('id', goalId)
    .eq('advertiser_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx: admin, req,
    action:       'advertiser_report.goal_deleted',
    target_table: 'advertiser_report_goals',
    target_id:    goalId,
  })
  revalidatePath(`/admin/advertisers/${id}`)
  return NextResponse.json({ ok: true })
}
