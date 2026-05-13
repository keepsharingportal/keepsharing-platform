// ── /admin/advertisers/sponsor-inventory ─────────────────────────────────────
// Sponsor inventory command center.
// Real data from advertiser_accounts overlaid on guide/category structure
// from configs. Filters via URL searchParams (server-rendered).

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GUIDE_CONFIGS } from '@/app/partners/guide/configs'
import type { GuideConfig } from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Sponsor Inventory — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface SponsorRow {
  id: string
  business_name: string
  package_tier:          string | null
  loyalty_tier:          string
  lifecycle_stage:       string
  contract_start_date:   string | null
  contract_end_date:     string | null
  renewal_priority_until:string | null
  upgrade_flagged_at:    string | null
  at_risk_flagged_at:    string | null
  sponsor_guide_slug:    string
  sponsor_category_slug: string
  contact_name:          string | null
  contact_phone:         string | null
}

interface UpgradeRow {
  id: string
  business_name:    string
  package_tier:     string | null
  loyalty_tier:     string
  lifecycle_stage:  string
  upgrade_flagged_at: string | null
}

interface RenewalRow {
  id: string
  business_name:          string
  loyalty_tier:           string
  contract_end_date:      string
  renewal_priority_until: string | null
  sponsor_category_slug:  string | null
  sponsor_guide_slug:     string | null
  lifecycle_stage:        string
}

// ── Status typing ─────────────────────────────────────────────────────────────

type StatusType = 'OPEN' | 'CLAIMED' | 'RENEWAL_HOLD' | 'AT_RISK' | 'DORMANT_HOLD'

type CategoryStatus =
  | { type: 'OPEN' }
  | { type: 'CLAIMED';      sponsor: SponsorRow; monthsActive: number }
  | { type: 'RENEWAL_HOLD'; sponsor: SponsorRow; holdUntil: Date; monthsActive: number }
  | { type: 'AT_RISK';      sponsor: SponsorRow; monthsActive: number }
  | { type: 'DORMANT_HOLD'; dormantSince: Date; releaseDate: Date }

const STATUS_CFG: Record<StatusType, { label: string; dot: string; ring: string; bg: string; text: string }> = {
  OPEN:         { label: 'Open',         dot: '#22c55e', ring: '#bbf7d0', bg: '#f0fdf4', text: '#15803d' },
  CLAIMED:      { label: 'Claimed',      dot: '#3b82f6', ring: '#93c5fd', bg: '#eff6ff', text: '#1e40af' },
  RENEWAL_HOLD: { label: 'Renewal Hold', dot: '#eab308', ring: '#fde047', bg: '#fefce8', text: '#854d0e' },
  AT_RISK:      { label: 'At Risk',      dot: '#ef4444', ring: '#fca5a5', bg: '#fef2f2', text: '#991b1b' },
  DORMANT_HOLD: { label: 'Dormant Hold', dot: '#9ca3af', ring: '#d1d5db', bg: '#f9fafb', text: '#374151' },
}

const LOYALTY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  bronze:   { label: 'Bronze',   color: '#92400e', bg: '#fef3c7' },
  silver:   { label: 'Silver',   color: '#4b5563', bg: '#f3f4f6' },
  gold:     { label: 'Gold',     color: '#78350f', bg: '#fefce8' },
  platinum: { label: 'Platinum', color: '#4c1d95', bg: '#ede9fe' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCategoryStatus(
  guideSlug: string, categorySlug: string,
  sponsors: SponsorRow[], now: Date
): CategoryStatus {
  const sp = sponsors.find(
    s => s.sponsor_guide_slug === guideSlug && s.sponsor_category_slug === categorySlug
  )
  if (!sp) return { type: 'OPEN' }

  const start = sp.contract_start_date ? new Date(sp.contract_start_date) : now
  const monthsActive = Math.max(0, Math.floor(
    (now.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000)
  ))

  if (sp.at_risk_flagged_at && sp.lifecycle_stage !== 'dormant')
    return { type: 'AT_RISK', sponsor: sp, monthsActive }

  if (sp.lifecycle_stage === 'dormant' && sp.contract_end_date) {
    const dormantSince = new Date(sp.contract_end_date)
    const releaseDate  = new Date(dormantSince.getTime() + 90 * 24 * 60 * 60 * 1000)
    if (releaseDate > now) return { type: 'DORMANT_HOLD', dormantSince, releaseDate }
    return { type: 'OPEN' }
  }

  if (sp.renewal_priority_until && new Date(sp.renewal_priority_until) > now)
    return { type: 'RENEWAL_HOLD', sponsor: sp, holdUntil: new Date(sp.renewal_priority_until), monthsActive }

  return { type: 'CLAIMED', sponsor: sp, monthsActive }
}

function guideStats(g: GuideConfig, sponsors: SponsorRow[], now: Date) {
  const sts = g.categories.map(c => getCategoryStatus(g.slug, c.slug, sponsors, now))
  const claimed = sts.filter(s => s.type === 'CLAIMED' || s.type === 'RENEWAL_HOLD').length
  return {
    total:    sts.length,
    open:     sts.filter(s => s.type === 'OPEN').length,
    claimed,
    atRisk:   sts.filter(s => s.type === 'AT_RISK').length,
    dormant:  sts.filter(s => s.type === 'DORMANT_HOLD').length,
    pct:      sts.length > 0 ? Math.round((claimed / sts.length) * 100) : 0,
  }
}

function fmtMo(n: number): string {
  if (n < 1)  return '< 1mo'
  if (n < 12) return `${n}mo`
  const y = Math.floor(n / 12), m = n % 12
  return m > 0 ? `${y}y ${m}mo` : `${y}y`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(d: Date, now: Date): number {
  return Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function urgencyDot(days: number): string {
  if (days <= 14)  return '#ef4444'
  if (days <= 30)  return '#f97316'
  if (days <= 60)  return '#eab308'
  return '#22c55e'
}

// ── Inline micro-components ───────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
}

function StatusChip({ type }: { type: StatusType }) {
  const c = STATUS_CFG[type]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 3, backgroundColor: c.bg, color: c.text, border: `1px solid ${c.ring}`, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
      <Dot color={c.dot} />
      {c.label}
    </span>
  )
}

function LoyaltyPill({ tier }: { tier: string }) {
  const c = LOYALTY_CFG[tier] ?? LOYALTY_CFG.bronze
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10, backgroundColor: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {tier === 'platinum' ? '♦' : tier === 'gold' ? '★' : '·'} {c.label}
    </span>
  )
}

function MiniBar({ pct, color = '#3b82f6' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  )
}

// ── Category tile ─────────────────────────────────────────────────────────────

function CategoryTile({
  catName, catSlug, guideSlug, status,
}: {
  catName: string
  catSlug: string
  guideSlug: string
  status: CategoryStatus
}) {
  const s = STATUS_CFG[status.type]
  const hasSponsor = status.type === 'CLAIMED' || status.type === 'RENEWAL_HOLD' || status.type === 'AT_RISK'
  const sponsor = hasSponsor ? (status as { sponsor: SponsorRow }).sponsor : null
  const renewalDate = status.type === 'RENEWAL_HOLD'
    ? (status as { holdUntil: Date }).holdUntil : null
  const releaseDate = status.type === 'DORMANT_HOLD'
    ? (status as { releaseDate: Date }).releaseDate : null

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: `1px solid ${s.ring}`,
      borderLeft: `4px solid ${s.dot}`,
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 110,
    }}>
      {/* Category name + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.35, flex: 1 }}>
          {catName}
        </p>
        <StatusChip type={status.type} />
      </div>

      {/* Sponsor details if claimed */}
      {sponsor && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sponsor.business_name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <LoyaltyPill tier={sponsor.loyalty_tier} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>
              {fmtMo('monthsActive' in status ? (status as { monthsActive: number }).monthsActive : 0)}
            </span>
          </div>
          {sponsor.contract_end_date && (
            <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
              Renews {fmtDate(new Date(sponsor.contract_end_date))}
            </p>
          )}
          {renewalDate && (
            <p style={{ fontSize: 10, color: '#854d0e', fontWeight: 600, margin: 0 }}>
              Hold until {fmtDate(renewalDate)}
            </p>
          )}
        </div>
      )}

      {/* Dormant hold info */}
      {status.type === 'DORMANT_HOLD' && (
        <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>
          Protected until {releaseDate ? fmtDate(releaseDate) : '—'}
        </p>
      )}

      {/* Open — CTA */}
      {status.type === 'OPEN' && (
        <Link
          href={`/admin/proposals/new?guide=${guideSlug}&category=${catSlug}`}
          style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textDecoration: 'none', marginTop: 'auto' }}
        >
          + Available for sponsorship
        </Link>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SponsorInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string; status?: string }>
}) {
  const params      = await searchParams
  const filterGuide  = params.guide  ?? 'all'
  const filterStatus = params.status ?? 'all'

  const supabase = await createClient()
  const now      = new Date()

  // ── Parallel data fetch ──────────────────────────────────────────────────
  const [sponsorsRes, upgradeRes, renewalsRes] = await Promise.all([
    supabase
      .from('advertiser_accounts')
      .select([
        'id', 'business_name', 'package_tier', 'loyalty_tier', 'lifecycle_stage',
        'contract_start_date', 'contract_end_date', 'renewal_priority_until',
        'upgrade_flagged_at', 'at_risk_flagged_at',
        'sponsor_guide_slug', 'sponsor_category_slug',
        'contact_name', 'contact_phone',
      ].join(', '))
      .not('sponsor_category_slug', 'is', null),

    supabase
      .from('advertiser_accounts')
      .select('id, business_name, package_tier, loyalty_tier, lifecycle_stage, upgrade_flagged_at')
      .in('lifecycle_stage', ['upgrade-ready', 'sponsor-qualified'])
      .order('upgrade_flagged_at', { ascending: true }),

    supabase
      .from('advertiser_accounts')
      .select('id, business_name, loyalty_tier, contract_end_date, renewal_priority_until, sponsor_category_slug, sponsor_guide_slug, lifecycle_stage')
      .gte('contract_end_date', now.toISOString())
      .lte('contract_end_date', new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('contract_end_date', { ascending: true }),
  ])

  const sponsors  = (sponsorsRes.data  ?? []) as unknown as SponsorRow[]
  const upgraders = (upgradeRes.data   ?? []) as UpgradeRow[]
  const renewals  = (renewalsRes.data  ?? []) as RenewalRow[]

  // ── Ecosystem-wide stats ─────────────────────────────────────────────────
  const allStats = GUIDE_CONFIGS.map(g => ({ guide: g, stats: guideStats(g, sponsors, now) }))

  const totalCats    = allStats.reduce((s, g) => s + g.stats.total,   0)
  const totalOpen    = allStats.reduce((s, g) => s + g.stats.open,    0)
  const totalClaimed = allStats.reduce((s, g) => s + g.stats.claimed, 0)
  const totalAtRisk  = allStats.reduce((s, g) => s + g.stats.atRisk,  0)
  const renewals60   = renewals.filter(r => daysUntil(new Date(r.contract_end_date), now) <= 60).length
  const claimPct     = totalCats > 0 ? Math.round((totalClaimed / totalCats) * 100) : 0

  // ── Seasonal opportunity detection ───────────────────────────────────────
  const month = now.getMonth() + 1 // 1-based
  const seasonalAlerts: { guide: string; emoji: string; msg: string }[] = []
  if (month >= 11 || month <= 1)
    seasonalAlerts.push({ guide: 'summer-camp-guide', emoji: '⛺', msg: 'Camp planning season opens Jan. Sponsor positions should be filled now.' })
  if (month >= 5 && month <= 7)
    seasonalAlerts.push({ guide: 'afterschool-guide', emoji: '🎨', msg: 'Fall enrollment window opens Aug. Positions should be claimed before school starts.' })
  if (month >= 8 && month <= 10)
    seasonalAlerts.push({ guide: 'private-school-guide', emoji: '📚', msg: 'Tour season Oct–Jan. School sponsors need to be visible now.' })

  // ── Guide + category rendering ───────────────────────────────────────────
  const visibleGuides = filterGuide === 'all'
    ? GUIDE_CONFIGS
    : GUIDE_CONFIGS.filter(g => g.slug === filterGuide)

  function shouldShowCategory(status: CategoryStatus): boolean {
    if (filterStatus === 'all') return true
    const map: Record<string, StatusType> = {
      open:         'OPEN',
      claimed:      'CLAIMED',
      'renewal-hold': 'RENEWAL_HOLD',
      'at-risk':    'AT_RISK',
      'dormant-hold': 'DORMANT_HOLD',
    }
    const target = map[filterStatus]
    return target ? status.type === target : true
  }

  // ── Filter URL builder ───────────────────────────────────────────────────
  function filterUrl(guide: string, status: string): string {
    const p = new URLSearchParams()
    if (guide  !== 'all') p.set('guide', guide)
    if (status !== 'all') p.set('status', status)
    const q = p.toString()
    return `/admin/advertisers/sponsor-inventory${q ? `?${q}` : ''}`
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px' }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Link href="/admin/advertisers" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>← Advertisers</Link>
              <span style={{ color: '#d1d5db' }}>›</span>
              <span style={{ fontSize: 12, color: '#374151' }}>Sponsor Inventory</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>
              Sponsor Inventory
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, margin: 0 }}>
              Category ownership map · {totalCats} positions across {GUIDE_CONFIGS.length} guides · Updated {fmtDate(now)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin/advertisers/partner-ops" style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>
              Ops Blueprint
            </Link>
            <Link href="/admin/proposals/new" style={{ fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#1e3a5f', borderRadius: 6 }}>
              + New Proposal
            </Link>
          </div>
        </div>

        {/* ── EXECUTIVE METRICS ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Positions',    value: totalCats,    sub: 'across all guides',        dot: '#6b7280' },
            { label: 'Open for Claim',     value: totalOpen,    sub: `${100 - claimPct}% available`, dot: '#22c55e' },
            { label: 'Claimed / Protected',value: totalClaimed, sub: `${claimPct}% of inventory`,    dot: '#3b82f6' },
            { label: 'Renewals in 60d',    value: renewals60,   sub: 'require attention',         dot: '#eab308' },
            { label: 'At Risk',            value: totalAtRisk,  sub: 'sponsors flagged',          dot: '#ef4444' },
            { label: 'Upgrade Ready',      value: upgraders.length, sub: 'awaiting conversation', dot: '#c4622d' },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Dot color={m.dot} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#111827', margin: '0 0 3px' }}>{m.value}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── SEASONAL ALERTS ────────────────────────────────────────────── */}
        {seasonalAlerts.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {seasonalAlerts.map(a => (
              <div key={a.guide} style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '10px 16px' }}>
                <span style={{ fontSize: 18 }}>{a.emoji}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#854d0e', margin: 0 }}>{a.msg}</p>
                <Link href={filterUrl(a.guide, 'open')} style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', textDecoration: 'none', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  View open positions →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ── GUIDE HEALTH CARDS ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Guide Health</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* All guides tab */}
            <Link
              href={filterUrl('all', filterStatus)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 14px', borderRadius: 8, textDecoration: 'none', minWidth: 90,
                backgroundColor: filterGuide === 'all' ? '#1e3a5f' : '#fff',
                border: `1px solid ${filterGuide === 'all' ? '#1e3a5f' : '#e5e7eb'}`,
              }}
            >
              <span style={{ fontSize: 16 }}>🗺️</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: filterGuide === 'all' ? '#fff' : '#374151' }}>All Guides</span>
              <span style={{ fontSize: 10, color: filterGuide === 'all' ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{totalCats} total</span>
            </Link>

            {allStats.map(({ guide, stats }) => (
              <Link
                key={guide.slug}
                href={filterUrl(guide.slug, filterStatus)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  padding: '10px 14px', borderRadius: 8, textDecoration: 'none', minWidth: 130,
                  backgroundColor: filterGuide === guide.slug ? '#1e3a5f' : '#fff',
                  border: `1px solid ${filterGuide === guide.slug ? '#1e3a5f' : '#e5e7eb'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{guide.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: filterGuide === guide.slug ? '#fff' : '#374151', lineHeight: 1.2 }}>
                    {guide.shortName}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: filterGuide === guide.slug ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
                    {stats.claimed}/{stats.total} claimed
                  </span>
                  {stats.atRisk > 0 && (
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ {stats.atRisk}</span>
                  )}
                </div>
                <MiniBar pct={stats.pct} color={filterGuide === guide.slug ? 'rgba(255,255,255,0.6)' : (stats.atRisk > 0 ? '#ef4444' : '#3b82f6')} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── STATUS FILTER CHIPS ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all',          label: 'All Categories' },
            { key: 'open',         label: 'Open' },
            { key: 'claimed',      label: 'Claimed' },
            { key: 'renewal-hold', label: 'Renewal Hold' },
            { key: 'at-risk',      label: 'At Risk' },
            { key: 'dormant-hold', label: 'Dormant Hold' },
          ].map(f => (
            <Link
              key={f.key}
              href={filterUrl(filterGuide, f.key)}
              style={{
                fontSize: 12, fontWeight: 600, textDecoration: 'none',
                padding: '5px 12px', borderRadius: 20,
                backgroundColor: filterStatus === f.key ? '#1e3a5f' : '#fff',
                color:           filterStatus === f.key ? '#fff' : '#374151',
                border:          `1px solid ${filterStatus === f.key ? '#1e3a5f' : '#d1d5db'}`,
              }}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {visibleGuides.map(guide => {
            const stats = guideStats(guide, sponsors, now)
            const catStatuses = guide.categories.map(cat => ({
              cat,
              status: getCategoryStatus(guide.slug, cat.slug, sponsors, now),
            }))
            const visible = catStatuses.filter(({ status }) => shouldShowCategory(status))
            if (visible.length === 0 && filterStatus !== 'all') return null

            return (
              <div key={guide.slug} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                {/* Guide section header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{guide.emoji}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>{guide.name}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{stats.total} categories</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {/* Health stats */}
                    {[
                      { label: 'Open',    value: stats.open,    color: '#22c55e' },
                      { label: 'Claimed', value: stats.claimed, color: '#3b82f6' },
                      { label: 'At Risk', value: stats.atRisk,  color: '#ef4444' },
                      { label: 'Dormant', value: stats.dormant, color: '#9ca3af' },
                    ].filter(s => s.value > 0).map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Dot color={s.color} />
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{s.value} {s.label}</span>
                      </div>
                    ))}
                    {/* Health bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${stats.pct}%`, backgroundColor: stats.atRisk > 0 ? '#ef4444' : '#3b82f6', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{stats.pct}%</span>
                    </div>
                    <Link href={`/partners/guide/${guide.slug}`} target="_blank" style={{ fontSize: 11, color: '#6b7280', textDecoration: 'none' }}>
                      Public page →
                    </Link>
                  </div>
                </div>

                {/* Category tiles */}
                <div style={{ padding: '16px 20px' }}>
                  {visible.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                      No categories match the current filter.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {visible.map(({ cat, status }) => (
                        <CategoryTile
                          key={cat.slug}
                          catName={cat.name}
                          catSlug={cat.slug}
                          guideSlug={guide.slug}
                          status={status}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── BOTTOM PANELS ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 28 }}>

          {/* Opportunity Panel */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>Upgrade &amp; Sponsor Opportunities</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Partners ready for the next conversation</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {upgraders.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No upgrade-ready or sponsor-qualified advertisers right now.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upgraders.map(u => {
                    const lc = LOYALTY_CFG[u.loyalty_tier] ?? LOYALTY_CFG.bronze
                    const isSponsorQ = u.lifecycle_stage === 'sponsor-qualified'
                    return (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: isSponsorQ ? '#fefce8' : '#f9fafb', border: `1px solid ${isSponsorQ ? '#fde047' : '#e5e7eb'}`, borderRadius: 8, gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{u.business_name}</p>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, backgroundColor: isSponsorQ ? '#fef9e7' : '#e0f2fe', color: isSponsorQ ? '#854d0e' : '#075985' }}>
                              {isSponsorQ ? '★ Sponsor Qualified' : '↑ Upgrade Ready'}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, backgroundColor: lc.bg, color: lc.color }}>
                              {u.loyalty_tier}
                            </span>
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{u.package_tier ?? 'unknown tier'}</span>
                          </div>
                        </div>
                        <Link href={`/admin/proposals/new?account=${u.id}`} style={{ fontSize: 11, fontWeight: 700, color: '#c4622d', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Start proposal →
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Open categories with no listings (sponsorship opportunity) */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>High-Value Open Positions</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allStats
                    .flatMap(({ guide, stats: gs }) =>
                      gs.open > 0 ? guide.categories
                        .filter(cat => getCategoryStatus(guide.slug, cat.slug, sponsors, now).type === 'OPEN')
                        .slice(0, 2)
                        .map(cat => ({
                          guideName: guide.shortName,
                          guideSlug: guide.slug,
                          catName: cat.name,
                          catSlug: cat.slug,
                          urgency: guide.urgency,
                        }))
                        : []
                    )
                    .slice(0, 12)
                    .map(op => (
                      <Link
                        key={`${op.guideSlug}-${op.catSlug}`}
                        href={`/admin/proposals/new?guide=${op.guideSlug}&category=${op.catSlug}`}
                        style={{ fontSize: 11, fontWeight: 600, color: op.urgency === 'time-critical' ? '#854d0e' : '#374151', padding: '3px 10px', borderRadius: 4, backgroundColor: op.urgency === 'time-critical' ? '#fefce8' : '#f3f4f6', border: `1px solid ${op.urgency === 'time-critical' ? '#fde047' : '#e5e7eb'}`, textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        {op.guideName}: {op.catName}
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Renewal Timeline */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>Renewal Timeline</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Next 90 days · {renewals.length} contracts expiring</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {renewals.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No contracts expiring in the next 90 days.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {renewals.map(r => {
                    const endDate = new Date(r.contract_end_date)
                    const days    = daysUntil(endDate, now)
                    const dot     = urgencyDot(days)
                    const isSponsored = !!r.sponsor_category_slug
                    const lc = LOYALTY_CFG[r.loyalty_tier] ?? LOYALTY_CFG.bronze
                    const inPriorityWindow = r.renewal_priority_until && new Date(r.renewal_priority_until) > now

                    return (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderLeft: `4px solid ${dot}`, borderRadius: 8, gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.business_name}
                            </p>
                            {isSponsored && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#854d0e', backgroundColor: '#fefce8', padding: '1px 6px', borderRadius: 3, border: '1px solid #fde047', whiteSpace: 'nowrap' }}>
                                CAT SPONSOR
                              </span>
                            )}
                            {inPriorityWindow && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#4c1d95', backgroundColor: '#ede9fe', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                                IN PRIORITY WINDOW
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <LoyaltyPill tier={r.loyalty_tier} />
                            {r.sponsor_guide_slug && (
                              <span style={{ fontSize: 10, color: '#6b7280' }}>
                                {GUIDE_CONFIGS.find(g => g.slug === r.sponsor_guide_slug)?.emoji} {r.sponsor_guide_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Guide', 'Gd.')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: dot, margin: '0 0 2px' }}>
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                          </p>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{fmtDate(endDate)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {renewals.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {[
                      { color: '#ef4444', label: '≤ 14 days' },
                      { color: '#f97316', label: '15–30 days' },
                      { color: '#eab308', label: '31–60 days' },
                      { color: '#22c55e', label: '61–90 days' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Dot color={l.color} />
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── GOVERNANCE RULES FOOTER ────────────────────────────────────── */}
        <div style={{ marginTop: 24, padding: '14px 20px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'center', flexShrink: 0 }}>Governance</p>
          {[
            { dot: '#eab308', rule: '60-day priority renewal hold before market exposure' },
            { dot: '#9ca3af', rule: '90-day dormant hold before category re-opens' },
            { dot: '#4c1d95', rule: 'Platinum (36mo+) gets first right of refusal on any opening' },
            { dot: '#ef4444', rule: 'Never offer open position while renewal hold is active' },
          ].map(g => (
            <div key={g.rule} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Dot color={g.dot} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{g.rule}</span>
            </div>
          ))}
          <Link href="/admin/advertisers/partner-ops#sponsor-rules" style={{ fontSize: 11, fontWeight: 700, color: '#374151', textDecoration: 'none', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Full governance rules →
          </Link>
        </div>

      </div>
    </div>
  )
}
