// POST /api/admin/advertisers/[id]/send-report
//
// Fires a webhook to GoHighLevel with the advertiser's report URL so a
// GHL workflow can email it to them. The webhook URL is configured via
// env var GHL_REPORT_SEND_WEBHOOK_URL — the workflow on the other end
// owns the email template, opt-out handling, and delivery tracking.
//
// We pass GHL everything it needs to template a personal email:
//   advertiser_email, advertiser_name, business_name, report_url,
//   report_label (e.g. "May 2026"), sent_by_email, market.
//
// On dispatch we write to advertiser_report_sends so the admin panel can
// show "last sent" + a paper-trail count.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WEBHOOK_URL = process.env.GHL_REPORT_SEND_WEBHOOK_URL
const SITE_BASE   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: 'GHL webhook not configured. Set GHL_REPORT_SEND_WEBHOOK_URL in env to enable sending.' },
      { status: 503 },
    )
  }

  const supabase = createAdminClient()

  // Pull everything we need in two queries — advertiser identity + the
  // current active token.
  const [advRes, tokRes] = await Promise.all([
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, slug, contact_name, contact_email, market')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('advertiser_report_tokens')
      .select('token')
      .eq('advertiser_id', id)
      .eq('is_active', true)
      .maybeSingle(),
  ])
  const adv = advRes.data as {
    id: string; business_name: string; slug: string | null;
    contact_name: string | null; contact_email: string | null; market: string | null
  } | null
  const tok = tokRes.data as { token: string } | null

  if (!adv)       return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  if (!tok)       return NextResponse.json({ error: 'No active report token. Generate one first.' }, { status: 400 })
  if (!adv.contact_email) return NextResponse.json({ error: 'Advertiser has no contact_email on file.' }, { status: 400 })

  const reportUrl = `${SITE_BASE}/r/${tok.token}`
  const now       = new Date()
  const reportLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  // Open the send row up-front so a webhook failure is still visible in
  // the admin's history.
  const sendIns = await supabase
    .from('advertiser_report_sends')
    .insert({
      advertiser_id:   adv.id,
      sent_by:         admin.adminId,
      channel:         'ghl',
      recipient_email: adv.contact_email,
      report_url:      reportUrl,
      status:          'pending',
    })
    .select('id')
    .single()
  const sendId = (sendIns.data as { id: string } | null)?.id

  // Fire the webhook. Don't trust GHL to be fast — 10s timeout.
  const payload = {
    advertiser_id:    adv.id,
    advertiser_name:  adv.contact_name ?? adv.business_name,
    business_name:    adv.business_name,
    advertiser_email: adv.contact_email,
    report_url:       reportUrl,
    report_label:     reportLabel,
    sent_by_email:    admin.email,
    market:           adv.market ?? 'rrp',
  }

  // Retry with exponential backoff so a transient GHL outage doesn't
  // silently lose the send. Most GHL hiccups resolve in seconds; three
  // attempts with 1s / 3s / 9s spacing covers the realistic outage
  // window without keeping the admin waiting forever. Total budget:
  // ~30s including request timeouts. On final failure the send row stays
  // status='failed' so the admin can click "Send via GHL" again manually
  // — which is the right escape hatch when GHL is down for hours.
  let status: 'sent' | 'failed' = 'failed'
  let statusCode: number | null = null
  let errorMsg: string | null   = null
  const attempts: Array<{ statusCode: number | null; error: string | null; backoffMs: number }> = []
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(10_000),
      })
      statusCode = res.status
      if (res.ok) {
        status = 'sent'
        errorMsg = null
        attempts.push({ statusCode, error: null, backoffMs: 0 })
        break
      }
      // 4xx (other than 429) is a permanent failure — payload is wrong.
      // Don't waste attempts retrying; surface the error now.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        errorMsg = `Webhook returned ${res.status} ${res.statusText} — payload rejected (no retry).`
        attempts.push({ statusCode, error: errorMsg, backoffMs: 0 })
        break
      }
      errorMsg = `Webhook returned ${res.status} ${res.statusText}`
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e)
    }
    const backoffMs = attempt === 1 ? 1_000 : attempt === 2 ? 3_000 : 0
    attempts.push({ statusCode, error: errorMsg, backoffMs })
    if (attempt < 3) await new Promise(r => setTimeout(r, backoffMs))
  }

  if (sendId) {
    await supabase
      .from('advertiser_report_sends')
      .update({ status, status_code: statusCode, error: errorMsg })
      .eq('id', sendId)
  }

  await recordAuditEvent({
    ctx: admin, req,
    action:       status === 'sent' ? 'advertiser_report.sent' : 'advertiser_report.send_failed',
    target_table: 'advertiser_accounts',
    target_id:    adv.id,
    meta:         {
      channel:        'ghl',
      report_url:     reportUrl,
      recipient_email: adv.contact_email,
      status_code:    statusCode,
      error:          errorMsg,
      attempts,
    },
  })

  revalidatePath(`/admin/advertisers/${adv.id}`)

  if (status === 'sent') {
    return NextResponse.json({ ok: true, status: 'sent', report_url: reportUrl })
  }
  return NextResponse.json({ ok: false, status: 'failed', error: errorMsg ?? 'Unknown error' }, { status: 502 })
}
