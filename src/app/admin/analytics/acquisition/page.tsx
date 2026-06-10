// ── /admin/analytics/acquisition ────────────────────────────────────────────
// Where do readers come from? Top referrer hosts (Facebook, Google, direct),
// UTM-tagged campaigns, channel mix. Period-over-period everywhere.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, Mail, MapPin, Share2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange } from '@/lib/admin/date-range'
import { rangeToTs, withPriorPeriod, computeChange, formatPctChange } from '@/lib/admin/period-compare'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'
import { StatWithChange } from '@/components/admin/StatWithChange'

export const metadata: Metadata = { title: 'Acquisition — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

// Channel buckets — turn the raw referrer host into a high-level category
// you actually act on ("Facebook" vs "Direct" vs "Google" vs "Email"
// vs "Other"). Keeps the dashboard meaningful even when readers hit you
// from m.facebook.com, l.instagram.com, etc.
const CHANNEL_RULES: Array<{ name: string; icon: React.ElementType; match: (host: string) => boolean }> = [
  { name: 'Facebook',    icon: Share2, match: h => /(^|\.)facebook\.com$|(^|\.)fb\.com$|^l\./.test(h) },
  { name: 'Instagram',   icon: Share2, match: h => /(^|\.)instagram\.com$/.test(h) },
  { name: 'Google',      icon: Search,   match: h => /(^|\.)google\.[a-z.]+$/.test(h) },
  { name: 'Bing/Yahoo',  icon: Search,   match: h => /(^|\.)(bing|yahoo|duckduckgo)\.com$/.test(h) },
  { name: 'Email',       icon: Mail,     match: h => /(^|\.)(mail|gmail|outlook|yahoo)\./.test(h) },
  { name: 'Magazine QR', icon: MapPin,   match: h => /(^|\.)riverregionparents\.com$/.test(h) },  // self-referrer = in-site nav
]

function classifyHost(host: string | null): string {
  if (!host) return 'Direct'
  for (const r of CHANNEL_RULES) if (r.match(host)) return r.name
  return 'Other'
}

export default async function AcquisitionPage({ searchParams }: PageProps) {
  const current = parseRange(await searchParams)
  const ranges  = withPriorPeriod(current)
  const supabase = createAdminClient()

  // Probe both schema migrations (146 adds the attribution columns)
  const probe = await supabase.from('page_views').select('referrer_host').limit(1)
  if (probe.error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber mb-1">Migration 146 needed</p>
          <p className="text-sm text-portal-amber leading-relaxed">
            Apply <code className="bg-portal-amber-lt px-1 rounded">146_page_views_attribution.sql</code> to enable referrer + UTM capture.
            Until then page_views won&apos;t have the columns this report queries.
          </p>
        </div>
      </div>
    )
  }

  const [curRes, priRes] = await Promise.all([
    supabase.from('page_views')
      .select('session_hash, referrer_host, utm_source, utm_medium, utm_campaign')
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('page_views')
      .select('session_hash, referrer_host')
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
  ])

  type CurRow = { session_hash: string; referrer_host: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }
  type PriRow = { session_hash: string; referrer_host: string | null }
  const curRows = (curRes.data ?? []) as CurRow[]
  const priRows = (priRes.data ?? []) as PriRow[]

  // First-touch per session — credit the FIRST row we see for each
  // session_hash. Since session_hash rolls daily, this is "first hit
  // that day," which is the best approximation we can do without
  // cross-day session linking.
  function rollFirstTouch<T extends { session_hash: string }>(rows: T[]): Map<string, T> {
    const m = new Map<string, T>()
    for (const r of rows) if (!m.has(r.session_hash)) m.set(r.session_hash, r)
    return m
  }
  const curFirstTouch = rollFirstTouch(curRows)
  const priFirstTouch = rollFirstTouch(priRows)

  // Channel rollup — group by channel name → unique visitors.
  function channelStats<T extends { session_hash: string; referrer_host: string | null }>(map: Map<string, T>): Map<string, number> {
    const stats = new Map<string, number>()
    for (const r of map.values()) {
      const channel = classifyHost(r.referrer_host)
      stats.set(channel, (stats.get(channel) ?? 0) + 1)
    }
    return stats
  }
  const curChannels = channelStats(curFirstTouch)
  const priChannels = channelStats(priFirstTouch)

  const channelList = Array.from(curChannels.keys()).map(name => ({
    name,
    current: curChannels.get(name) ?? 0,
    prior:   priChannels.get(name) ?? 0,
  })).sort((a, b) => b.current - a.current)

  // Top referrer hosts — raw, sorted by visitor count.
  const refHosts = new Map<string, number>()
  for (const r of curFirstTouch.values()) {
    const host = r.referrer_host ?? '(direct)'
    refHosts.set(host, (refHosts.get(host) ?? 0) + 1)
  }
  const topRefs = Array.from(refHosts.entries())
    .map(([host, n]) => ({ host, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 25)

  // UTM campaigns — only show rows where utm_source is set; if you never
  // tag, this section is empty.
  const utmMap = new Map<string, { source: string; medium: string | null; campaign: string | null; unique: number }>()
  for (const r of curFirstTouch.values()) {
    if (!r.utm_source) continue
    const key = `${r.utm_source}|${r.utm_medium ?? ''}|${r.utm_campaign ?? ''}`
    let v = utmMap.get(key)
    if (!v) { v = { source: r.utm_source, medium: r.utm_medium, campaign: r.utm_campaign, unique: 0 }; utmMap.set(key, v) }
    v.unique++
  }
  const utmRows = Array.from(utmMap.values()).sort((a, b) => b.unique - a.unique).slice(0, 25)

  const totalCur = curFirstTouch.size
  const totalPri = priFirstTouch.size
  const directCur = curChannels.get('Direct') ?? 0
  const directPri = priChannels.get('Direct') ?? 0

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <AdminDateRangeBar since={ranges.current.since} until={ranges.current.until} />

      {/* Hero strip — total + direct share + top channel */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatWithChange
          label="Sessions w/ source"
          value={totalCur}
          change={computeChange(totalCur, totalPri)}
          sublabel="Excludes /admin and crawlers"
        />
        <StatWithChange
          label="Direct"
          value={`${totalCur > 0 ? ((directCur / totalCur) * 100).toFixed(1) : '0'}%`}
          change={computeChange(directCur, directPri)}
          sublabel="Typed URL or referrer-stripped"
        />
        <StatWithChange
          label="Top channel"
          value={channelList[0]?.name ?? '—'}
          sublabel={channelList[0] ? `${channelList[0].current.toLocaleString()} sessions` : 'No data yet'}
          hideChange
        />
      </div>

      {/* Channel mix table */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Channel mix</h2>
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_5rem_5rem_6rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>Channel</div>
            <div className="text-right">Current</div>
            <div className="text-right">Prior</div>
            <div className="text-right">Δ</div>
            <div className="text-right">Change</div>
          </div>
          <div className="divide-y divide-portal-border">
            {channelList.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-portal-muted">No referrer data captured yet — apply migration 146 and wait for new visits to come in.</div>
            ) : channelList.map(c => {
              const ch = computeChange(c.current, c.prior)
              const f  = formatPctChange(ch)
              const shareCur = totalCur > 0 ? (c.current / totalCur) * 100 : 0
              return (
                <div key={c.name} className="grid grid-cols-[1fr_5rem_5rem_5rem_6rem] gap-x-4 items-center px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-portal-text">{c.name}</span>
                    <span className="text-[11px] text-portal-muted">{shareCur.toFixed(1)}%</span>
                  </div>
                  <div className="text-right text-sm tabular-nums font-semibold text-portal-text">{c.current.toLocaleString()}</div>
                  <div className="text-right text-sm tabular-nums text-portal-muted">{c.prior.toLocaleString()}</div>
                  <div className={`text-right text-sm tabular-nums font-semibold ${ch.delta > 0 ? 'text-portal-green' : ch.delta < 0 ? 'text-portal-red' : 'text-portal-muted'}`}>
                    {ch.delta > 0 ? '+' : ''}{ch.delta.toLocaleString()}
                  </div>
                  <div className={`text-right text-xs font-semibold ${f.tone === 'up' ? 'text-portal-green' : f.tone === 'down' ? 'text-portal-red' : f.tone === 'new' ? 'text-portal-blue' : 'text-portal-muted'}`}>
                    {f.text}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Top referrer hosts */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Top referrer hosts</h2>
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_6rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>#</div>
            <div>Host</div>
            <div className="text-right">Sessions</div>
          </div>
          <div className="divide-y divide-portal-border">
            {topRefs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-portal-muted">No host-level data yet.</div>
            ) : topRefs.map((r, i) => (
              <div key={r.host} className="grid grid-cols-[2.5rem_1fr_6rem] gap-x-4 items-center px-4 py-2">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="text-sm font-mono text-portal-text truncate">{r.host}</div>
                <div className="text-right text-sm tabular-nums font-semibold text-portal-blue">{r.n.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UTM campaign table */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Tagged campaigns (UTM)</h2>
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_8rem_10rem_6rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>Source</div>
            <div>Medium</div>
            <div>Campaign</div>
            <div className="text-right">Sessions</div>
          </div>
          <div className="divide-y divide-portal-border">
            {utmRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-portal-muted">
                <p>No UTM-tagged traffic yet.</p>
                <p className="mt-1 text-[11px]">Tag your Facebook posts, email links, and external promos with <code className="font-mono bg-portal-bg px-1 rounded">?utm_source=facebook&amp;utm_medium=post</code> to see them broken out here.</p>
              </div>
            ) : utmRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_8rem_10rem_6rem] gap-x-4 items-center px-4 py-2">
                <div className="text-sm font-semibold text-portal-text">{r.source}</div>
                <div className="text-sm text-portal-sub">{r.medium ?? '—'}</div>
                <div className="text-sm text-portal-sub truncate" title={r.campaign ?? ''}>{r.campaign ?? '—'}</div>
                <div className="text-right text-sm tabular-nums font-semibold text-portal-blue">{r.unique.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-[11px] text-portal-muted leading-relaxed">
        <strong>UTM tagging pays compounding dividends.</strong> Tag every social post and email link with <code className="font-mono">utm_source</code>, <code className="font-mono">utm_medium</code>, <code className="font-mono">utm_campaign</code> — even loose tagging gives you a much clearer picture than referrer host alone (which collapses all of Facebook into one bucket). The Acquisition report becomes way more useful once you start tagging consistently. <Link href="/admin/content/short-links" className="text-portal-blue hover:underline font-semibold">QR Codes / Links</Link> auto-tags magazine QR scans for you.
      </p>
    </div>
  )
}
