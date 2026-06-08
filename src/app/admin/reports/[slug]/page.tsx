// /admin/reports/[slug]
// Per-advertiser performance report. Shows the same numbers we'd put in
// a client-facing PDF — but with admin-grade detail (raw counts, per-
// placement breakdown, top traffic sources). Trust badges on every
// metric so we never accidentally fluff a number.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ArrowLeft, Eye, MousePointerClick, MessageSquare, MapPin, Activity,
  Crown, TrendingUp, ExternalLink,
} from 'lucide-react'
import { SectionHelp } from '@/components/admin/AdminHelp'

export const dynamic = 'force-dynamic'

interface Props {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ days?: string }>
}

interface AdvertiserRow {
  id:            string
  slug:          string
  business_name: string
  account_tier:  string | null
  email:         string | null
  phone:         string | null
}

interface PlacementRow {
  id:               string
  placement_type:   string
  placement_context: string | null
  ad_headline:      string | null
  impression_count: number | null
  click_count:      number | null
  is_active:        boolean
  starts_at:        string | null
  ends_at:          string | null
}

interface EventCount {
  placement_id: string
  event_type:   string
  count:        number
}

const VALID_DAYS = [7, 30, 90, 365] as const
type DaysRange = typeof VALID_DAYS[number]

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  return { title: `Report — ${slug} — Admin` }
}

function fmt(n: number | null | undefined): string {
  if (!n || n <= 0) return '0'
  return n.toLocaleString('en-US')
}

function fmtPct(num: number, denom: number): string {
  if (denom <= 0) return '—'
  const pct = (num / denom) * 100
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`
}

function Badge({ kind }: { kind: 'measured' | 'estimated' | 'not_tracked' }) {
  const styles = {
    measured:    { wrap: 'bg-portal-green-lt text-portal-green',   label: 'Measured'        },
    estimated:   { wrap: 'bg-portal-amber-lt text-portal-amber',   label: 'Estimated'       },
    not_tracked: { wrap: 'bg-gray-100  text-portal-sub',    label: 'Not tracked yet' },
  }[kind]
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles.wrap}`}>
      {styles.label}
    </span>
  )
}

export default async function AdvertiserReportPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { days: daysParam } = await searchParams
  const days: DaysRange = VALID_DAYS.includes(Number(daysParam) as DaysRange)
    ? Number(daysParam) as DaysRange
    : 30

  const supabase = createAdminClient()

  const { data: advertiser } = await supabase
    .from('advertiser_accounts')
    .select('id, slug, business_name, account_tier, email, phone')
    .eq('slug', slug)
    .maybeSingle()

  if (!advertiser) notFound()
  const adv = advertiser as AdvertiserRow

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Fan out queries in parallel
  const [
    { data: placements },
    { data: eventsLast },
    { data: partnerLeads },
    { data: leadSubmissions },
    { data: trafficSources },
  ] = await Promise.all([
    supabase.from('ad_placements')
      .select('id, placement_type, placement_context, ad_headline, impression_count, click_count, is_active, starts_at, ends_at')
      .eq('advertiser_account_id', adv.id)
      .order('is_active', { ascending: false })
      .order('placement_type', { ascending: true }),

    supabase.from('ad_events')
      .select('ad_placement_id, event_type')
      .gte('occurred_at', sinceIso)
      .in('ad_placement_id',
        // sub-query workaround: server-side .in needs values, so we filter in the JS layer below.
        // Pass empty array so this query returns nothing if placements is empty — corrected below.
        []
      ),

    supabase.from('partner_leads')
      .select('id, lead_first_name, lead_last_name, lead_email, lead_phone, offer_id, source_page, utm_source, utm_medium, utm_campaign, submitted_at')
      .eq('advertiser_id', adv.id)
      .gte('submitted_at', sinceIso)
      .order('submitted_at', { ascending: false })
      .limit(50),

    supabase.from('lead_submissions')
      .select('id, submitter_name, submitter_email, submitter_phone, message, source_page, target_tier_interest, created_at')
      .eq('target_advertiser_id', adv.id)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase.from('attribution_visits')
      .select('first_utm_source, first_utm_medium, first_utm_campaign, first_referrer')
      .gte('first_seen_at', sinceIso)
      .limit(2000),
  ])

  void eventsLast // unused — see real query below

  const placementRows = (placements ?? []) as PlacementRow[]
  const placementIds  = placementRows.map(p => p.id)

  // Re-fetch events filtered to this advertiser's placements (the .in() above
  // was a placeholder so we could parallelize the rest)
  const { data: events } = placementIds.length
    ? await supabase
        .from('ad_events')
        .select('ad_placement_id, event_type')
        .in('ad_placement_id', placementIds)
        .gte('occurred_at', sinceIso)
    : { data: [] as EventCount[] }

  // Roll up per-placement counts within the date window
  const eventsBy: Record<string, { impressions: number; clicks: number }> = {}
  for (const ev of (events ?? []) as Array<{ ad_placement_id: string; event_type: string }>) {
    const slot = eventsBy[ev.ad_placement_id] ??= { impressions: 0, clicks: 0 }
    if (ev.event_type === 'impression') slot.impressions++
    else if (ev.event_type === 'click') slot.clicks++
  }

  const totalImpressions = Object.values(eventsBy).reduce((s, x) => s + x.impressions, 0)
  const totalClicks      = Object.values(eventsBy).reduce((s, x) => s + x.clicks, 0)
  const lifetimeImpressions = placementRows.reduce((s, p) => s + (p.impression_count ?? 0), 0)
  const lifetimeClicks      = placementRows.reduce((s, p) => s + (p.click_count      ?? 0), 0)

  const partnerLeadCount = partnerLeads?.length ?? 0
  const submissionCount  = leadSubmissions?.length ?? 0
  const totalLeads       = partnerLeadCount + submissionCount

  // Top traffic sources across all visitors in the window. This is site-wide
  // (we'd need per-placement attribution for finer detail) — useful context
  // for the report header.
  const sourceCounts: Record<string, number> = {}
  for (const row of (trafficSources ?? []) as Array<{ first_utm_source: string | null; first_referrer: string | null }>) {
    const key = row.first_utm_source || row.first_referrer || 'Direct'
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1
  }
  const topSources = Object.entries(sourceCounts)
    .sort((a, z) => z[1] - a[1])
    .slice(0, 5)

  const daysHref = (d: number) => `/admin/reports/${slug}?days=${d}`
  const tierLabel = adv.account_tier ?? 'Partner'

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> All Reports
          </Link>
          <h1 className="text-2xl font-bold text-portal-text flex items-center gap-2">
            <Activity className="h-5 w-5 text-portal-blue" />
            {adv.business_name}
          </h1>
          <p className="text-sm text-portal-sub mt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-portal-text px-1.5 py-0.5 rounded mr-2">
              {tierLabel}
            </span>
            Performance for the last {days} days
          </p>
        </div>
        {/* /admin/advertisers/businesses was dropped in the CRM
            consolidation — the main advertiser list IS the business
            list now. Point at the list with the search pre-filled. */}
        <Link
          href={`/admin/advertisers?q=${encodeURIComponent(slug)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-portal-border bg-white rounded-lg hover:bg-portal-bg text-portal-text"
        >
          Manage Account <ExternalLink size={11} />
        </Link>
      </div>

      <SectionHelp variant="info" title="How to read this">
        <strong>Measured</strong> numbers come from real event logs.{' '}
        <strong>Estimated</strong> means we have a counter but no per-day log yet.{' '}
        <strong>Not tracked yet</strong> means we plan to instrument this but haven&apos;t. When you
        share this with a client, lead with the measured numbers — leave the rest off.
      </SectionHelp>

      {/* Date range picker */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-semibold text-portal-sub mr-2">Range:</span>
        {VALID_DAYS.map(d => (
          <Link
            key={d}
            href={daysHref(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              days === d ? 'bg-portal-navy text-white' : 'text-portal-sub hover:text-portal-text hover:bg-portal-row-hover'
            }`}
          >
            Last {d}d
          </Link>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-portal-border bg-white p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub">
              <Eye size={12} />
              Impressions
            </div>
            <Badge kind="measured" />
          </div>
          <p className="text-2xl font-bold text-portal-text tabular-nums">{fmt(totalImpressions)}</p>
          <p className="text-[11px] text-portal-sub mt-0.5">in last {days} days</p>
          <p className="text-[11px] text-portal-muted mt-2 border-t border-portal-border pt-2">
            Lifetime: <span className="font-semibold text-portal-sub">{fmt(lifetimeImpressions)}</span>
          </p>
        </div>

        <div className="rounded-lg border border-portal-border bg-white p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub">
              <MousePointerClick size={12} />
              Clicks
            </div>
            <Badge kind="measured" />
          </div>
          <p className="text-2xl font-bold text-portal-text tabular-nums">{fmt(totalClicks)}</p>
          <p className="text-[11px] text-portal-sub mt-0.5">
            CTR <span className="font-semibold">{fmtPct(totalClicks, totalImpressions)}</span>
          </p>
          <p className="text-[11px] text-portal-muted mt-2 border-t border-portal-border pt-2">
            Lifetime: <span className="font-semibold text-portal-sub">{fmt(lifetimeClicks)}</span>
          </p>
        </div>

        <div className="rounded-lg border border-portal-border bg-white p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub">
              <MessageSquare size={12} />
              Leads
            </div>
            <Badge kind="measured" />
          </div>
          <p className="text-2xl font-bold text-portal-text tabular-nums">{fmt(totalLeads)}</p>
          <p className="text-[11px] text-portal-sub mt-0.5">
            {partnerLeadCount} offer · {submissionCount} inquiry
          </p>
          <p className="text-[11px] text-portal-muted mt-2 border-t border-portal-border pt-2">
            CR: <span className="font-semibold text-portal-sub">{fmtPct(totalLeads, totalClicks)}</span>
          </p>
        </div>

        <div className="rounded-lg border border-portal-border bg-white p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub">
              <TrendingUp size={12} />
              Top Source
            </div>
            <Badge kind="estimated" />
          </div>
          {topSources.length > 0 ? (
            <>
              <p className="text-base font-bold text-portal-text truncate">{topSources[0][0]}</p>
              <p className="text-[11px] text-portal-sub mt-0.5">{fmt(topSources[0][1])} visits</p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-portal-muted">No data yet</p>
              <p className="text-[11px] text-portal-muted mt-0.5">Start a UTM-tagged campaign</p>
            </>
          )}
          <p className="text-[11px] text-portal-muted mt-2 border-t border-portal-border pt-2">
            Site-wide, not per-placement
          </p>
        </div>
      </div>

      {/* Per-placement breakdown */}
      <section className="rounded-lg border border-portal-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-portal-text flex items-center gap-2">
              <MapPin size={14} className="text-portal-blue" />
              Ad Placements
            </h2>
            <p className="text-[11px] text-portal-muted mt-0.5">Per-spot performance in the last {days} days</p>
          </div>
          <span className="text-[11px] text-portal-muted">{placementRows.length} placement{placementRows.length !== 1 ? 's' : ''}</span>
        </div>
        {placementRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-portal-sub">
            No ad placements yet for this advertiser.
          </div>
        ) : (
          <div className="divide-y divide-portal-border">
            {placementRows.map(p => {
              const stats = eventsBy[p.id] ?? { impressions: 0, clicks: 0 }
              const isSponsor = p.placement_type === 'section_sponsor'
              return (
                <div key={p.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isSponsor && <Crown size={11} className="text-amber-600 shrink-0" />}
                      <p className="text-sm font-semibold text-portal-text truncate">
                        {p.ad_headline || p.placement_type.replace(/_/g, ' ')}
                      </p>
                      {!p.is_active && (
                        <span className="text-[9px] font-bold uppercase bg-gray-200 text-portal-sub px-1.5 py-0.5 rounded shrink-0">Inactive</span>
                      )}
                    </div>
                    <p className="text-[11px] text-portal-muted truncate">
                      {p.placement_type}
                      {p.placement_context && <> · {p.placement_context}</>}
                    </p>
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Impressions</p>
                    <p className="text-sm font-bold text-portal-text tabular-nums">{fmt(stats.impressions)}</p>
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Clicks</p>
                    <p className="text-sm font-bold text-portal-text tabular-nums">{fmt(stats.clicks)}</p>
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">CTR</p>
                    <p className="text-sm font-semibold text-portal-sub tabular-nums">{fmtPct(stats.clicks, stats.impressions)}</p>
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Lifetime</p>
                    <p className="text-xs text-portal-sub tabular-nums">{fmt(p.impression_count)} / {fmt(p.click_count)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Lead list */}
      <section className="rounded-lg border border-portal-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-portal-border">
          <h2 className="text-sm font-bold text-portal-text flex items-center gap-2">
            <MessageSquare size={14} className="text-portal-green" />
            Recent Leads
          </h2>
          <p className="text-[11px] text-portal-muted mt-0.5">Up to 50 most recent in the last {days} days. Includes UTM where captured.</p>
        </div>
        {totalLeads === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-portal-sub">
            No leads in this window. {topSources.length > 0 && 'Top traffic is arriving — sharing UTM-tagged links will tie those visits back here.'}
          </div>
        ) : (
          <div className="divide-y divide-portal-border">
            {((partnerLeads ?? []) as Array<{
              id: string; lead_first_name: string | null; lead_last_name: string | null;
              lead_email: string | null; lead_phone: string | null;
              utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
              source_page: string | null; submitted_at: string | null;
            }>).map(l => (
              <div key={l.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.5fr_2fr_1.5fr_auto] gap-3 items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-portal-text truncate">
                    {[l.lead_first_name, l.lead_last_name].filter(Boolean).join(' ') || 'Anonymous'}
                  </p>
                  <p className="text-[11px] text-portal-blue truncate">{l.lead_email}</p>
                </div>
                <div className="min-w-0 text-xs text-portal-sub">
                  {l.lead_phone && <p className="font-semibold text-portal-text">{l.lead_phone}</p>}
                  <p className="text-[11px] truncate">{l.source_page ?? '—'}</p>
                </div>
                <div className="min-w-0">
                  {l.utm_campaign || l.utm_source ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded">
                      {l.utm_campaign ?? l.utm_source}
                    </span>
                  ) : (
                    <span className="text-[10px] text-portal-muted">No UTM</span>
                  )}
                </div>
                <div className="text-[11px] text-portal-muted whitespace-nowrap text-right">
                  {l.submitted_at ? new Date(l.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </div>
              </div>
            ))}
            {((leadSubmissions ?? []) as Array<{
              id: string; submitter_name: string | null; submitter_email: string | null;
              submitter_phone: string | null; source_page: string | null;
              target_tier_interest: string | null; created_at: string | null;
            }>).map(l => (
              <div key={l.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.5fr_2fr_1.5fr_auto] gap-3 items-start bg-portal-bg/30">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-portal-text truncate">{l.submitter_name || 'Anonymous'}</p>
                  <p className="text-[11px] text-portal-blue truncate">{l.submitter_email}</p>
                </div>
                <div className="min-w-0 text-xs text-portal-sub">
                  {l.submitter_phone && <p className="font-semibold text-portal-text">{l.submitter_phone}</p>}
                  <p className="text-[11px] truncate">{l.source_page ?? '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold bg-gray-100 text-portal-sub px-1.5 py-0.5 rounded">
                    {l.target_tier_interest ?? 'Inquiry'}
                  </span>
                </div>
                <div className="text-[11px] text-portal-muted whitespace-nowrap text-right">
                  {l.created_at ? new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Traffic sources */}
      {topSources.length > 0 && (
        <section className="rounded-lg border border-portal-border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-portal-text flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-600" />
                Top Traffic Sources
              </h2>
              <p className="text-[11px] text-portal-muted mt-0.5">First-touch attribution across the whole site in the last {days} days.</p>
            </div>
            <Badge kind="estimated" />
          </div>
          <div className="space-y-2">
            {topSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between gap-3 py-1.5 border-b border-portal-border last:border-0">
                <span className="text-sm font-semibold text-portal-text truncate">{source}</span>
                <span className="text-sm text-portal-sub tabular-nums">{fmt(count)} visits</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
