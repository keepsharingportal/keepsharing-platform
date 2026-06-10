// ── /admin/analytics/conversion ─────────────────────────────────────────────
// Did anything happen? Funnel from reader → tap → inquiry.
//
// The site monetizes (indirectly) by getting readers to engage with
// advertisers — listing tap, mailto, website click, form-fill inquiry.
// This page measures the conversion rate of each step, broken down by
// source content so you can see which articles / sections drive the
// most actual contact.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Phone, Mail, Globe, MessageSquare } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange } from '@/lib/admin/date-range'
import { rangeToTs, withPriorPeriod, computeChange, formatPctChange } from '@/lib/admin/period-compare'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'
import { StatWithChange } from '@/components/admin/StatWithChange'

export const metadata: Metadata = { title: 'Conversion — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

export default async function ConversionPage({ searchParams }: PageProps) {
  const current = parseRange(await searchParams)
  const ranges  = withPriorPeriod(current)
  const supabase = createAdminClient()

  const probe = await supabase.from('listing_contact_events').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber">Apply migration 142_listing_contact_events.sql first.</p>
        </div>
      </div>
    )
  }

  const [curTapsRes, priTapsRes, curMsgRes, priMsgRes, curVisitsRes, priVisitsRes] = await Promise.all([
    supabase.from('listing_contact_events').select('event_type, advertiser_id, source_path')
      .gte('occurred_at', rangeToTs(ranges.current).sinceTs)
      .lte('occurred_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('listing_contact_events').select('event_type')
      .gte('occurred_at', rangeToTs(ranges.prior).sinceTs)
      .lte('occurred_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
    supabase.from('listing_messages').select('id, advertiser_account_id, source_url')
      .gte('created_at', rangeToTs(ranges.current).sinceTs)
      .lte('created_at', rangeToTs(ranges.current).untilTs)
      .limit(10_000),
    supabase.from('listing_messages').select('id')
      .gte('created_at', rangeToTs(ranges.prior).sinceTs)
      .lte('created_at', rangeToTs(ranges.prior).untilTs)
      .limit(10_000),
    supabase.from('page_views').select('session_hash', { count: 'exact', head: true })
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs),
    supabase.from('page_views').select('session_hash', { count: 'exact', head: true })
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs),
  ])

  type Tap = { event_type: string; advertiser_id: string; source_path: string | null }
  type Msg = { id: string; advertiser_account_id: string; source_url: string | null }
  const curTaps = (curTapsRes.data ?? []) as Tap[]
  const priTaps = (priTapsRes.data ?? []) as Pick<Tap, 'event_type'>[]
  const curMsgs = (curMsgRes.data ?? []) as Msg[]
  const priMsgs = (priMsgRes.data ?? []) as { id: string }[]

  const phone = curTaps.filter(t => t.event_type === 'tel').length
  const email = curTaps.filter(t => t.event_type === 'mailto').length
  const web   = curTaps.filter(t => t.event_type === 'website').length

  const phonePrior = priTaps.filter(t => t.event_type === 'tel').length
  const emailPrior = priTaps.filter(t => t.event_type === 'mailto').length
  const webPrior   = priTaps.filter(t => t.event_type === 'website').length

  const totalTaps      = phone + email + web
  const totalTapsPrior = phonePrior + emailPrior + webPrior
  const totalActions      = totalTaps + curMsgs.length
  const totalActionsPrior = totalTapsPrior + priMsgs.length

  // Conversion rate — actions per 100 visitor-sessions. Cheap proxy for
  // "what % of readers actually do something."
  const curVisitors = curVisitsRes.count ?? 0
  const priVisitors = priVisitsRes.count ?? 0
  const curConv = curVisitors > 0 ? (totalActions / curVisitors) * 100 : 0
  const priConv = priVisitors > 0 ? (totalActionsPrior / priVisitors) * 100 : 0
  const convChange = computeChange(Math.round(curConv * 100), Math.round(priConv * 100))

  // Per-source breakdown — which pages drive the most contact actions.
  type Source = { path: string; phone: number; email: number; web: number; msgs: number; total: number }
  const bySource = new Map<string, Source>()
  for (const t of curTaps) {
    const path = t.source_path ?? '(unknown)'
    let s = bySource.get(path)
    if (!s) { s = { path, phone: 0, email: 0, web: 0, msgs: 0, total: 0 }; bySource.set(path, s) }
    if (t.event_type === 'tel')     s.phone++
    if (t.event_type === 'mailto')  s.email++
    if (t.event_type === 'website') s.web++
    s.total++
  }
  for (const m of curMsgs) {
    // source_url is a full URL; pull the path. Some old rows have null.
    let path = '(form fill)'
    if (m.source_url) {
      try { path = new URL(m.source_url).pathname } catch {/* keep default */}
    }
    let s = bySource.get(path)
    if (!s) { s = { path, phone: 0, email: 0, web: 0, msgs: 0, total: 0 }; bySource.set(path, s) }
    s.msgs++
    s.total++
  }
  const topSources = Array.from(bySource.values()).sort((a, b) => b.total - a.total).slice(0, 25)

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <AdminDateRangeBar since={ranges.current.since} until={ranges.current.until} />

      {/* Headline strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatWithChange
          label="Phone taps"
          value={phone}
          change={computeChange(phone, phonePrior)}
        />
        <StatWithChange
          label="Email opens"
          value={email}
          change={computeChange(email, emailPrior)}
        />
        <StatWithChange
          label="Website clicks"
          value={web}
          change={computeChange(web, webPrior)}
        />
        <StatWithChange
          label="Form inquiries"
          value={curMsgs.length}
          change={computeChange(curMsgs.length, priMsgs.length)}
        />
        <StatWithChange
          label="Conv. rate"
          value={`${curConv.toFixed(2)}%`}
          change={convChange}
          sublabel="Actions per visitor"
        />
      </div>

      {/* The funnel — visitors → engaged → actions */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Conversion funnel</h2>
        <div className="bg-white border border-portal-border rounded-lg p-5 space-y-3">
          <FunnelStep label="Visitors"    value={curVisitors} pct={100} />
          <FunnelStep label="Listing taps + inquiries" value={totalActions} pct={curVisitors > 0 ? (totalActions / curVisitors) * 100 : 0} />
          <FunnelStep label="Form-fill inquiries (highest intent)" value={curMsgs.length} pct={curVisitors > 0 ? (curMsgs.length / curVisitors) * 100 : 0} />
        </div>
      </section>

      {/* Per-source breakdown — which pages produce the actions */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Top sources of contact actions</h2>
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem_4rem] gap-x-3 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>Path</div>
            <div className="text-right inline-flex items-center justify-end gap-1"><Phone size={11} /></div>
            <div className="text-right inline-flex items-center justify-end gap-1"><Mail size={11} /></div>
            <div className="text-right inline-flex items-center justify-end gap-1"><Globe size={11} /></div>
            <div className="text-right inline-flex items-center justify-end gap-1"><MessageSquare size={11} /></div>
            <div className="text-right">Total</div>
          </div>
          <div className="divide-y divide-portal-border">
            {topSources.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-portal-muted">No contact actions in this period.</div>
            ) : topSources.map(s => (
              <div key={s.path} className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem_4rem] gap-x-3 items-center px-4 py-2">
                <div className="text-sm font-mono text-portal-text truncate" title={s.path}>{s.path}</div>
                <div className="text-right text-sm tabular-nums">{s.phone || ''}</div>
                <div className="text-right text-sm tabular-nums">{s.email || ''}</div>
                <div className="text-right text-sm tabular-nums">{s.web || ''}</div>
                <div className="text-right text-sm tabular-nums">{s.msgs || ''}</div>
                <div className="text-right text-sm tabular-nums font-bold text-portal-blue">{s.total}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-[11px] text-portal-muted leading-relaxed">
        <strong>Conversion rate</strong> = actions per visitor session. <strong>Form inquiries</strong> are the highest-intent signal — those readers raised their hand to a specific advertiser. <Link href="/admin/inquiries" className="text-portal-blue hover:underline">View the inquiry queue</Link> to action them. <Link href="/admin/analytics/acquisition" className="text-portal-blue hover:underline">Acquisition</Link> shows which channels send readers most likely to convert.
      </p>
    </div>
  )
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-portal-text">{label}</span>
        <span className="text-sm font-bold tabular-nums text-portal-blue">{value.toLocaleString()} <span className="text-portal-muted font-normal">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 bg-portal-bg rounded-full overflow-hidden">
        <div className="h-full bg-portal-blue rounded-full" style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </div>
    </div>
  )
}
