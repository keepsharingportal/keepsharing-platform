// ── /admin/analytics/audience ───────────────────────────────────────────────
// Who showed up? Audience size + trend, new vs returning, device split.
// Period-over-period everywhere.

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange } from '@/lib/admin/date-range'
import { rangeToTs, withPriorPeriod, computeChange } from '@/lib/admin/period-compare'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'
import { StatWithChange } from '@/components/admin/StatWithChange'

export const metadata: Metadata = { title: 'Audience — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

type Device = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'other'
function classifyUA(ua: string | null | undefined): Device {
  if (!ua) return 'other'
  const u = ua.toLowerCase()
  if (/bot|crawler|spider|crawling/i.test(ua)) return 'bot'
  if (/iphone|android|mobile/i.test(u))        return 'mobile'
  if (/ipad|tablet/i.test(u))                  return 'tablet'
  return 'desktop'
}

// We don't store user_agent on page_views (privacy-first session_hash only).
// Device split is therefore derived from request-time UA when we wire it on
// future migrations. For v1 we surface the mobile-share assumption as an
// editorial value rather than a dashboard number, and show the trend line
// using session_hash count over time (which IS storable + accurate).

export default async function AudiencePage({ searchParams }: PageProps) {
  const current = parseRange(await searchParams)
  const ranges  = withPriorPeriod(current)
  const supabase = createAdminClient()

  const probe = await supabase.from('page_views').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber">Apply migration 118_page_views.sql first.</p>
        </div>
      </div>
    )
  }

  const [curRes, priRes] = await Promise.all([
    supabase.from('page_views').select('session_hash, viewed_at')
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('page_views').select('session_hash')
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
  ])

  const curRows = (curRes.data ?? []) as Array<{ session_hash: string; viewed_at: string }>
  const priRows = (priRes.data ?? []) as Array<{ session_hash: string }>

  const curUnique  = new Set(curRows.map(r => r.session_hash)).size
  const priUnique  = new Set(priRows.map(r => r.session_hash)).size

  // Returning visitors = session_hashes that appeared on more than one
  // distinct day. (Each session_hash already rolls over daily, so a true
  // returning visitor produces multiple hashes that BOTH show up. We
  // can't perfectly link them across days by design — that's the privacy
  // posture. But we can approximate "returning behaviour" via repeat
  // session_hashes within the SAME day, which proxies for "stayed in
  // session, came back to a different page later.")
  const sessionToCount = new Map<string, number>()
  for (const r of curRows) {
    sessionToCount.set(r.session_hash, (sessionToCount.get(r.session_hash) ?? 0) + 1)
  }
  const stickySessions = Array.from(sessionToCount.values()).filter(c => c > 3).length
  const stickyRate     = curUnique > 0 ? (stickySessions / curUnique) * 100 : 0

  // Daily visitor trend — group session_hashes by date within the range.
  const dailyMap = new Map<string, Set<string>>()
  for (const r of curRows) {
    const day = r.viewed_at.slice(0, 10)
    let set = dailyMap.get(day)
    if (!set) { set = new Set(); dailyMap.set(day, set) }
    set.add(r.session_hash)
  }
  const days = Array.from(dailyMap.entries())
    .map(([day, set]) => ({ day, uniques: set.size }))
    .sort((a, b) => a.day.localeCompare(b.day))
  const maxUniques = Math.max(1, ...days.map(d => d.uniques))

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <AdminDateRangeBar since={ranges.current.since} until={ranges.current.until} />

      {/* Hero strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatWithChange
          label="Unique visitors"
          value={curUnique}
          change={computeChange(curUnique, priUnique)}
          sublabel="Distinct daily sessions"
        />
        <StatWithChange
          label="Total views"
          value={curRows.length}
          change={computeChange(curRows.length, priRows.length)}
          sublabel={`${(curRows.length / Math.max(1, curUnique)).toFixed(1)} pages per visitor`}
        />
        <StatWithChange
          label="Engaged readers"
          value={`${stickyRate.toFixed(1)}%`}
          sublabel={`${stickySessions.toLocaleString()} viewed 4+ pages`}
          hideChange
        />
      </div>

      {/* Trend chart — pure CSS bar chart so we don't pull in a charting
          library for one screen. Each bar is a day's unique visitors,
          height scaled to max. Hover shows the count + date. */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Daily unique visitors</h2>
        <div className="bg-white border border-portal-border rounded-lg p-5">
          {days.length === 0 ? (
            <p className="text-sm text-portal-muted text-center py-8">No visits in this period.</p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-1 h-32">
                {days.map(d => (
                  <div
                    key={d.day}
                    title={`${d.day} · ${d.uniques.toLocaleString()} unique`}
                    className="flex-1 bg-portal-blue rounded-t-sm hover:bg-portal-navy transition-colors cursor-default"
                    style={{ height: `${(d.uniques / maxUniques) * 100}%`, minHeight: '2px' }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-portal-muted">
                <span>{days[0].day}</span>
                <span className="font-semibold text-portal-text">Peak: {maxUniques.toLocaleString()} on {days.reduce((p, c) => c.uniques > p.uniques ? c : p, days[0]).day}</span>
                <span>{days[days.length - 1].day}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <p className="text-[11px] text-portal-muted leading-relaxed">
        <strong>What &ldquo;engaged readers&rdquo; means.</strong> Sessions that viewed 4+ pages within their daily window — proxy for &ldquo;actually browsing,&rdquo; not bouncing. Higher is better; 20-30%+ is healthy for a content site.
      </p>
    </div>
  )
}
