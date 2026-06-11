// /api/admin/advertisers/[id]/goals
//   GET    → list active goals for an advertiser
//   POST   → create a new goal { metric, target_value, period_start, period_end, notes? }
// /api/admin/advertisers/[id]/goals/[goalId] handles update + delete (separate route)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_METRICS = new Set([
  'phone_taps', 'website_clicks', 'email_opens', 'form_inquiries',
  'short_link_clicks', 'facebook_results', 'total_engagement',
])

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('advertiser_report_goals')
    .select('id, metric, target_value, period_start, period_end, notes, is_active, created_at')
    .eq('advertiser_id', id)
    .eq('is_active', true)
    .order('period_start', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data ?? [] })
}

interface CreateBody {
  metric?:       string
  target_value?: number
  period_start?: string
  period_end?:   string
  notes?:        string | null
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  if (!body.metric || !ALLOWED_METRICS.has(body.metric)) {
    return NextResponse.json({ error: `metric must be one of: ${Array.from(ALLOWED_METRICS).join(', ')}` }, { status: 400 })
  }
  if (!Number.isFinite(body.target_value) || (body.target_value as number) <= 0) {
    return NextResponse.json({ error: 'target_value must be a positive number' }, { status: 400 })
  }
  if (!body.period_start || !body.period_end) {
    return NextResponse.json({ error: 'period_start and period_end (YYYY-MM-DD) required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const ins = await supabase
    .from('advertiser_report_goals')
    .insert({
      advertiser_id: id,
      metric:        body.metric,
      target_value:  body.target_value,
      period_start:  body.period_start,
      period_end:    body.period_end,
      notes:         body.notes ?? null,
      created_by:    admin.adminId,
    })
    .select('id, metric, target_value, period_start, period_end, notes, is_active, created_at')
    .single()
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })

  await recordAuditEvent({
    ctx: admin, req,
    action:       'advertiser_report.goal_created',
    target_table: 'advertiser_report_goals',
    target_id:    (ins.data as { id: string }).id,
    after:        ins.data as Record<string, unknown>,
  })
  revalidatePath(`/admin/advertisers/${id}`)
  return NextResponse.json({ goal: ins.data })
}
