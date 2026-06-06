// Daily cron — finds ad_placements whose ends_at lands inside any LIVE
// template's window (30/14/7/1 days before, or 1 day after) and sends
// the corresponding renewal email.
//
// Idempotency: one row per (placement, template, ends_at_snapshot) in
// ad_renewal_log via a unique index. Re-runs in the same day silently
// no-op via ON CONFLICT.
//
// Templates marked is_live=false are skipped. That's the "edit before
// it goes live" gate — the editor can write/preview templates without
// the cron firing them.
//
// Auth: x-vercel-cron header OR ?secret=$CRON_SECRET for manual fire.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime     = 'nodejs'
export const maxDuration = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return new URL(req.url).searchParams.get('secret') === expected
}

interface Template {
  id:            string
  name:          string
  days_before:   number
  subject:       string
  body_html:     string
  body_text:     string | null
  notify_sales:  boolean
}

interface Placement {
  id:               string
  placement_type:   string
  ad_headline:      string | null
  ad_link:          string | null
  ends_at:          string
  advertiser_email: string | null
  sales_rep_email:  string | null
  advertiser:       { business_name: string | null; email: string | null } | null
}

function dayOffset(ends_at: string, today: Date): number {
  const end = new Date(ends_at)
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const b = Date.UTC(end.getUTCFullYear(),    end.getUTCMonth(),    end.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

function renderTemplate(s: string, vars: Record<string, string>): string {
  return s.replace(/{{\s*([\w.]+)\s*}}/g, (_, k) => vars[k] ?? '')
}

function fmtEndDate(ends_at: string): string {
  return new Date(ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const supabase = sb()
  const today    = new Date()

  // Pull live templates and active placements with an end date.
  const [tplRes, plRes] = await Promise.all([
    supabase
      .from('ad_renewal_templates')
      .select('id, name, days_before, subject, body_html, body_text, notify_sales')
      .eq('is_live', true),
    supabase
      .from('ad_placements')
      .select(`
        id, placement_type, ad_headline, ad_link, ends_at,
        advertiser_email, sales_rep_email,
        advertiser:advertiser_account_id(business_name, email)
      `)
      .not('ends_at', 'is', null),
  ])

  if (tplRes.error) return NextResponse.json({ error: tplRes.error.message }, { status: 500 })
  if (plRes.error)  return NextResponse.json({ error: plRes.error.message  }, { status: 500 })

  const templates  = (tplRes.data ?? []) as Template[]
  const placements = (plRes.data  ?? []) as unknown as Placement[]

  if (templates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, note: 'No live templates' })
  }

  const resend = new Resend(apiKey)
  const fromAddress = process.env.AD_RENEWAL_FROM ?? 'River Region Parents <hello@riverregionparents.com>'

  let sent = 0, skipped = 0, failed = 0
  const details: Array<{ placement_id: string; template: string; status: string }> = []

  for (const pl of placements) {
    const offset = dayOffset(pl.ends_at, today)
    const tpl = templates.find(t => t.days_before === offset)
    if (!tpl) continue

    const recipient = pl.advertiser_email ?? pl.advertiser?.email
    if (!recipient) {
      // Log so the editor can see why this didn't fire, but don't crash.
      await supabase.from('ad_renewal_log').upsert({
        placement_id:     pl.id,
        template_id:      tpl.id,
        ends_at_snapshot: pl.ends_at,
        recipient_email:  '(missing)',
        status:           'skipped',
        error_message:    'no advertiser email',
      }, { onConflict: 'placement_id,template_id,ends_at_snapshot', ignoreDuplicates: true })
      skipped++
      details.push({ placement_id: pl.id, template: tpl.name, status: 'skipped:no-email' })
      continue
    }

    const advertiserName = pl.advertiser?.business_name ?? ''
    const firstName      = advertiserName.split(/\s+/)[0] ?? 'there'

    const vars = {
      first_name:        firstName,
      advertiser_name:   advertiserName,
      placement_label:   pl.ad_headline ?? pl.placement_type.replace(/_/g, ' '),
      ends_at:           fmtEndDate(pl.ends_at),
      renewal_url:       pl.ad_link ?? 'https://riverregionparents.com/advertise',
    }

    const subject = renderTemplate(tpl.subject, vars)
    const html    = renderTemplate(tpl.body_html, vars)
    const text    = tpl.body_text ? renderTemplate(tpl.body_text, vars) : undefined

    try {
      // Idempotency probe via upsert WITH the success row. If a row
      // already exists for (placement, template, snapshot), unique
      // index throws → we catch & treat as already-sent.
      const { error: dupErr } = await supabase.from('ad_renewal_log').insert({
        placement_id:     pl.id,
        template_id:      tpl.id,
        ends_at_snapshot: pl.ends_at,
        recipient_email:  recipient,
        status:           'queued',
      })
      if (dupErr?.code === '23505') { continue }   // already fired
      if (dupErr) throw new Error(dupErr.message)

      await resend.emails.send({
        from:    fromAddress,
        to:      [recipient],
        cc:      tpl.notify_sales && pl.sales_rep_email ? [pl.sales_rep_email] : undefined,
        subject,
        html,
        text,
      })

      await supabase
        .from('ad_renewal_log')
        .update({ status: 'sent' })
        .eq('placement_id', pl.id)
        .eq('template_id', tpl.id)
        .eq('ends_at_snapshot', pl.ends_at)

      sent++
      details.push({ placement_id: pl.id, template: tpl.name, status: 'sent' })
    } catch (e) {
      await supabase
        .from('ad_renewal_log')
        .update({ status: 'failed', error_message: e instanceof Error ? e.message : String(e) })
        .eq('placement_id', pl.id)
        .eq('template_id', tpl.id)
        .eq('ends_at_snapshot', pl.ends_at)
      failed++
      details.push({ placement_id: pl.id, template: tpl.name, status: 'failed' })
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed, details })
}
