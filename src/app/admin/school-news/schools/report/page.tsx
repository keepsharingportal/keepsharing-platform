// ── /admin/school-news/schools/report ───────────────────────────────────────
// Per-school engagement leaderboard. Shows for each school:
//   - Total approved bits
//   - Total reader opens (clicks → lightbox)
//   - Total impressions (card-in-view in the public feed)
//   - Avg clicks per bit (engagement quality)
//   - Last bit date (is this school still active?)
//
// What this is for: knowing which schools' parents actually engage tells
// you where to invest in teacher relationships, who to court for sponsor
// support, and which underrepresented schools are worth the outreach.
// Submission count is the upstream signal (who's reaching out at all);
// click_count is the downstream signal (do their bits land).

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, MousePointerClick, Eye, FileText, Clock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { AREA_SHORT_LABELS, isValidArea, type Area } from '@/lib/school-news/areas'

export const metadata: Metadata = { title: 'School Engagement Report — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MARKET = 'rrp'

interface SchoolStats {
  school_id:        string
  school_name:      string
  area:             Area | null
  is_private:       boolean
  bits_total:       number
  bits_approved:    number
  bits_pending:     number
  views_total:      number
  clicks_total:     number
  clicks_per_bit:   number     // approved bits only
  ctr_pct:          number     // clicks / views as %
  last_bit_at:      string | null
}

interface SchoolMeta {
  id:         string
  name:       string
  area:       string
  is_private: boolean
}

interface BitForStats {
  id:           string
  school_id:    string | null
  school_name:  string
  status:       string
  view_count:   number | null
  click_count:  number | null
  published_at: string | null
  created_at:   string
}

export default async function SchoolEngagementReportPage() {
  const supabase = supabaseAdmin()

  // Probe for migration 136 — graceful fallback if the engagement columns
  // aren't there yet.
  const probe = await supabase.from('school_bits').select('view_count').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <main className="p-6 max-w-3xl mx-auto">
          <BackLink />
          <div className="mt-4 rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-portal-amber mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/136_school_bits_engagement.sql</code> to enable engagement tracking.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const [bitsRes, schoolsRes] = await Promise.all([
    supabase
      .from('school_bits')
      .select('id, school_id, school_name, status, view_count, click_count, published_at, created_at')
      .eq('market', MARKET)
      .limit(5000),
    supabase
      .from('schools')
      .select('id, name, area, is_private')
      .eq('market', MARKET)
      .eq('status', 'active'),
  ])

  const bits    = (bitsRes.data    ?? []) as unknown as BitForStats[]
  const schools = (schoolsRes.data ?? []) as SchoolMeta[]

  // Roll up per-school. Group on school_id (canonical) but fall back to
  // school_name for legacy rows that pre-date the schools registry.
  const schoolMap = new Map<string, SchoolMeta>()
  for (const s of schools) schoolMap.set(s.id, s)

  const buckets = new Map<string, SchoolStats>()
  for (const b of bits) {
    const key = b.school_id ?? `__name:${b.school_name}`
    const meta = b.school_id ? schoolMap.get(b.school_id) : undefined
    let row = buckets.get(key)
    if (!row) {
      row = {
        school_id:      b.school_id ?? key,
        school_name:    meta?.name ?? b.school_name ?? '(unknown school)',
        area:           meta && isValidArea(meta.area) ? meta.area : null,
        is_private:     meta?.is_private ?? false,
        bits_total:     0,
        bits_approved:  0,
        bits_pending:   0,
        views_total:    0,
        clicks_total:   0,
        clicks_per_bit: 0,
        ctr_pct:        0,
        last_bit_at:    null,
      }
      buckets.set(key, row)
    }
    row.bits_total++
    if (b.status === 'approved') row.bits_approved++
    if (b.status === 'pending')  row.bits_pending++
    row.views_total  += b.view_count  ?? 0
    row.clicks_total += b.click_count ?? 0
    const candidate = b.published_at ?? b.created_at
    if (candidate && (!row.last_bit_at || candidate > row.last_bit_at)) {
      row.last_bit_at = candidate
    }
  }
  for (const row of buckets.values()) {
    row.clicks_per_bit = row.bits_approved > 0 ? row.clicks_total / row.bits_approved : 0
    row.ctr_pct        = row.views_total   > 0 ? (row.clicks_total / row.views_total) * 100 : 0
  }

  // Schools that have an active registry entry but no bits yet — surface
  // them at the bottom so it's obvious where there's outreach to do.
  const seenSchoolIds = new Set(Array.from(buckets.values()).map(b => b.school_id))
  for (const s of schools) {
    if (seenSchoolIds.has(s.id)) continue
    buckets.set(s.id, {
      school_id:      s.id,
      school_name:    s.name,
      area:           isValidArea(s.area) ? s.area : null,
      is_private:     s.is_private,
      bits_total:     0,
      bits_approved:  0,
      bits_pending:   0,
      views_total:    0,
      clicks_total:   0,
      clicks_per_bit: 0,
      ctr_pct:        0,
      last_bit_at:    null,
    })
  }

  const ranked = Array.from(buckets.values())
    .sort((a, b) => b.clicks_total - a.clicks_total || b.bits_total - a.bits_total)

  // Totals strip
  const totals = ranked.reduce(
    (acc, r) => {
      acc.bits   += r.bits_total
      acc.views  += r.views_total
      acc.clicks += r.clicks_total
      return acc
    },
    { bits: 0, views: 0, clicks: 0 },
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-6 max-w-[1200px] mx-auto space-y-6 pb-16">
        <BackLink />

        <header>
          <h1 className="text-xl font-bold text-portal-text tracking-tight">School Engagement Report</h1>
          <p className="text-sm text-portal-sub mt-1">
            Sorted by total reader opens. Clicks (lightbox opens) are the high-intent signal;
            views are the impression signal. Schools with no bits surface at the bottom.
          </p>
        </header>

        {/* Totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Schools tracked" value={ranked.length}      icon="schools" />
          <Stat label="Total bits"      value={totals.bits}        icon="bits" />
          <Stat label="Reader opens"    value={totals.clicks}      icon="clicks" />
          <Stat label="Impressions"     value={totals.views}       icon="views" />
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_5rem_5rem_5rem_5rem_5.5rem_6.5rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>#</div>
            <div>School</div>
            <div className="text-right">Bits</div>
            <div className="text-right">Opens</div>
            <div className="text-right">Views</div>
            <div className="text-right">CTR</div>
            <div className="text-right">Avg / bit</div>
            <div className="text-right">Last bit</div>
          </div>
          <div className="divide-y divide-portal-border">
            {ranked.map((s, i) => (
              <SchoolRow key={s.school_id} rank={i + 1} stats={s} />
            ))}
            {ranked.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-portal-muted">
                No bits or schools yet.
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-portal-muted">
          Tracking dedupes per session — one reader scrolling past a card or paging next/prev in the
          lightbox only counts once. Numbers are cumulative since migration 136.
        </p>
      </main>
    </div>
  )
}

function SchoolRow({ rank, stats }: { rank: number; stats: SchoolStats }) {
  const areaLabel = stats.is_private
    ? 'Private'
    : (stats.area ? AREA_SHORT_LABELS[stats.area] : '—')
  const lastBit = stats.last_bit_at
    ? new Date(stats.last_bit_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—'
  const noBits = stats.bits_total === 0

  return (
    <div className={`grid grid-cols-[2.5rem_1fr_5rem_5rem_5rem_5rem_5.5rem_6.5rem] gap-x-4 items-center px-4 py-3 ${
      noBits ? 'bg-portal-bg/60' : 'hover:bg-portal-bg/60'
    }`}>
      <div className="text-sm font-bold text-portal-muted tabular-nums">{rank}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-portal-text truncate">{stats.school_name}</div>
        <div className="text-[11px] text-portal-sub">
          {areaLabel}
          {stats.bits_pending > 0 && (
            <span className="ml-2 text-portal-amber font-semibold">· {stats.bits_pending} pending</span>
          )}
          {noBits && <span className="ml-2 text-portal-muted">· no bits yet</span>}
        </div>
      </div>
      <div className="text-right text-sm tabular-nums text-portal-text font-semibold">{stats.bits_approved}</div>
      <div className="text-right text-sm tabular-nums text-portal-blue font-semibold">{stats.clicks_total > 0 ? stats.clicks_total.toLocaleString() : '—'}</div>
      <div className="text-right text-sm tabular-nums text-portal-sub">{stats.views_total > 0 ? stats.views_total.toLocaleString() : '—'}</div>
      <div className="text-right text-sm tabular-nums text-portal-sub">{stats.views_total > 0 ? `${stats.ctr_pct.toFixed(1)}%` : '—'}</div>
      <div className="text-right text-sm tabular-nums text-portal-sub">{stats.bits_approved > 0 ? stats.clicks_per_bit.toFixed(1) : '—'}</div>
      <div className="text-right text-xs tabular-nums text-portal-sub">{lastBit}</div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: 'schools' | 'bits' | 'clicks' | 'views' }) {
  const Icon = icon === 'clicks' ? MousePointerClick
            : icon === 'views'  ? Eye
            : icon === 'bits'   ? FileText
            : Clock
  return (
    <div className="bg-white border border-portal-border rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted inline-flex items-center gap-1">
        <Icon size={11} /> {label}
      </p>
      <p className="text-2xl font-bold text-portal-text mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/admin/school-news/schools" className="inline-flex items-center gap-1 text-sm font-semibold text-portal-sub hover:text-portal-text">
      <ArrowLeft size={14} /> Back to Schools Manager
    </Link>
  )
}
