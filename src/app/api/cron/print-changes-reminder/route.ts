// GET/POST /api/cron/print-changes-reminder
//
// Tags the primary GHL contact for every advertiser running an ongoing
// (pickup) ad in next month's issue with `print-changes-due-<MON>`.
// Existing GHL workflows fire off that tag — the editor's standard
// reminder ('your ad runs again next month, send changes by the 10th
// or we use the same art') goes out automatically.
//
// Designed to be hit on the 1st of every month by Vercel Cron (or any
// external scheduler). Auth via Bearer CRON_SECRET when set; open in
// dev so it's testable. Idempotent — GHL drops duplicate tag writes,
// so re-running is safe.
//
// Optional ?month=YYYY-MM to override which issue this run targets.
// Without it, we tag for (today + 1 calendar month) — gives the editor
// roughly 9 days' notice before her standard 10th-of-the-month cutoff.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addTag } from '@/lib/ghl'

export const runtime = 'nodejs'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  return req.headers.get('authorization') === `Bearer ${expected}`
}

function defaultIssueMonth(): string {
  // Mid-month anchor avoids timezone roll-over surprises (running this
  // cron at 1am UTC on the 1st in a Pacific environment would otherwise
  // be 'still last month' to the local Date).
  const d = new Date()
  d.setDate(15)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  const mon = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }).toLowerCase()
  return `${mon}${String(y).slice(-2)}`   // e.g. 'jul26'
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const monthParam = new URL(req.url).searchParams.get('month')?.trim() ?? ''
  const month = /^[0-9]{4}-[0-9]{2}$/.test(monthParam) ? monthParam : defaultIssueMonth()
  const tag   = `print-changes-due-${monShort(month)}`

  const supabase = adminClient()

  // 1. Every placement on the target issue that's a pickup (i.e. an
  // ongoing ad reusing art). Brand-new ads don't need a 'send changes'
  // ping — the editor already knows new art is coming.
  const placRes = await supabase
    .from('print_ad_placements')
    .select('advertiser_account_id')
    .eq('issue_month', month)
    .eq('design', 'pickup')
  if (placRes.error) {
    return NextResponse.json({ error: placRes.error.message }, { status: 500 })
  }
  const advIds = Array.from(new Set(((placRes.data ?? []) as Array<{ advertiser_account_id: string }>)
    .map(r => r.advertiser_account_id)))
  if (advIds.length === 0) {
    return NextResponse.json({ ok: true, month, tag, tagged: 0, missingGhlId: 0, errors: [] })
  }

  // 2. Primary contact's GHL id per advertiser. Migration 128's
  // advertiser_contacts table is the source of truth; the inline
  // ghl_contact_id on the contact row is what we need.
  const conRes = await supabase
    .from('advertiser_contacts')
    .select('advertiser_account_id, ghl_contact_id')
    .in('advertiser_account_id', advIds)
    .eq('is_primary', true)
  if (conRes.error) {
    return NextResponse.json({ error: conRes.error.message }, { status: 500 })
  }
  const ghlByAdv = new Map<string, string>()
  for (const r of (conRes.data ?? []) as Array<{ advertiser_account_id: string; ghl_contact_id: string | null }>) {
    if (r.ghl_contact_id) ghlByAdv.set(r.advertiser_account_id, r.ghl_contact_id)
  }

  // 3. Apply the tag. Track misses (advertisers without a synced primary
  // GHL contact) so the editor can chase those down in /admin/advertisers.
  let tagged = 0
  let missingGhlId = 0
  const errors: string[] = []
  for (const advId of advIds) {
    const ghlId = ghlByAdv.get(advId)
    if (!ghlId) { missingGhlId++; continue }
    const res = await addTag('rrp', ghlId, tag)
    if (!res.success) {
      errors.push(`advertiser ${advId}: ${res.error}`)
      continue
    }
    tagged++
  }
  return NextResponse.json({ ok: errors.length === 0, month, tag, tagged, missingGhlId, errors }, { status: errors.length === 0 ? 200 : 207 })
}

export async function GET(req: NextRequest)  { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }
