// ── /admin/operations ─────────────────────────────────────────────────────────
// Operator Command Center — the daily starting screen for the RRP ecosystem.
// Aggregates data from sponsor governance, advertiser lifecycle, content health,
// and seasonal planning into a single guided operational view.
//
// Complements /admin/today (print production) — this is the digital ecosystem layer.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GUIDE_CONFIGS } from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Operations — Admin' }

// ── Seasonal planning calendar ────────────────────────────────────────────────
// (Same source of truth as content/operations — month filter applied below)
const SEASONAL_NUDGES: { months: number[]; msg: string; link: string; guide: string | null }[] = [
  { months: [11,12,1], guide: 'summer-camp-guide',    link: '/admin/content/operations', msg: '⛺ Camp planning season. Summer Camp Guide editorial content should be live now.' },
  { months: [1,2],     guide: 'private-school-guide', link: '/admin/content/operations', msg: '📚 Private school application window. Editorial support drives high-intent guide traffic.' },
  { months: [7,8],     guide: 'afterschool-guide',    link: '/admin/content/operations', msg: '🎨 After-school enrollment window opens this month. Guide content and sponsors must be live before school starts.' },
  { months: [8,9],     guide: 'healthy-kids-guide',   link: '/admin/content/operations', msg: '🩺 Back-to-school healthcare season. Pediatrician and specialist content sees highest annual traffic.' },
  { months: [9,10],    guide: 'private-school-guide', link: '/admin/content/operations', msg: '🏫 Private school tour season begins October. Comparison and guide content should be refreshed now.' },
]

// ── Critical checklist keys (lightweight proxy for blocked onboarding) ────────
const CRITICAL_KEYS = ['photo_received', 'description_approved', 'listing_created', 'listing_go_live_set'] as const
function isOnboardingBlocked(cl: Record<string, boolean> | null): boolean {
  if (!cl) return true
  return CRITICAL_KEYS.some(k => !cl[k])
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(s: string | null, now: Date): number {
  if (!s) return 9999
  return Math.floor((now.getTime() - new Date(s).getTime()) / (24 * 60 * 60 * 1000))
}
function daysUntilDate(s: string, now: Date): number {
  return Math.ceil((new Date(s).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Priority item type ────────────────────────────────────────────────────────
interface PriorityItem {
  urgency: 'critical' | 'high' | 'medium'
  icon:    string
  title:   string
  desc:    string
  action:  string
  url:     string
}

// ── Data types ────────────────────────────────────────────────────────────────
interface OnboardingRow {
  id: string; business_name: string; onboarding_started_at: string | null
  ops_checklist: Record<string, boolean> | null; package_tier: string | null
}
interface RenewalRow {
  id: string; business_name: string; loyalty_tier: string
  contract_end_date: string; sponsor_category_slug: string | null
  sponsor_guide_slug: string | null; lifecycle_stage: string
  renewal_priority_until: string | null
}
interface ProposalRow {
  id: string; business_name: string; lifecycle_stage: string; last_contact_at: string | null
}
interface SponsorRow { id: string; sponsor_guide_slug: string; sponsor_category_slug: string }
interface AtRiskRow  { id: string; business_name: string; at_risk_flagged_at: string | null }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationsPage() {
  const supabase = await createClient()
  const now   = new Date()
  const month = now.getMonth() + 1
  const hour  = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr   = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // ── Parallel data fetch ──────────────────────────────────────────────────
  const [
    onboardingRes, proposalRes, renewalRes, atRiskRes, sponsorsRes,
    upgradeRes, staleCountRes, approvedRes, expiredEventsRes,
    lifecycleCountsRes, articleCountRes,
  ] = await Promise.all([
    supabase.from('advertiser_accounts')
      .select('id, business_name, onboarding_started_at, ops_checklist, package_tier')
      .eq('lifecycle_stage', 'onboarding').limit(30),

    supabase.from('advertiser_accounts')
      .select('id, business_name, lifecycle_stage, last_contact_at')
      .in('lifecycle_stage', ['consultation', 'proposal'])
      .order('last_contact_at', { ascending: true, nullsFirst: true }).limit(20),

    supabase.from('advertiser_accounts')
      .select('id, business_name, loyalty_tier, contract_end_date, sponsor_category_slug, sponsor_guide_slug, lifecycle_stage, renewal_priority_until')
      .gte('contract_end_date', now.toISOString())
      .lte('contract_end_date', new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('contract_end_date', { ascending: true }).limit(20),

    supabase.from('advertiser_accounts')
      .select('id, business_name, at_risk_flagged_at')
      .not('at_risk_flagged_at', 'is', null)
      .neq('lifecycle_stage', 'dormant'),

    supabase.from('advertiser_accounts')
      .select('id, sponsor_guide_slug, sponsor_category_slug')
      .not('sponsor_category_slug', 'is', null),

    supabase.from('advertiser_accounts')
      .select('id, business_name, lifecycle_stage, upgrade_flagged_at')
      .in('lifecycle_stage', ['upgrade-ready', 'sponsor-qualified']),

    supabase.from('guide_articles')
      .select('id', { count: 'exact' })
      .eq('published', true)
      .lt('published_at', new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()),

    supabase.from('guide_articles')
      .select('id, title, guide_slug')
      .eq('published', false).eq('editorial_review_status', 'approved').limit(10),

    supabase.from('calendar_events')
      .select('id', { count: 'exact' })
      .lt('start_date', now.toISOString())
      .neq('status', 'expired').neq('status', 'cancelled'),

    supabase.from('advertiser_accounts')
      .select('lifecycle_stage'),

    supabase.from('guide_articles')
      .select('id', { count: 'exact' })
      .eq('published', true),
  ])

  // ── Normalize ────────────────────────────────────────────────────────────
  const onboarding   = (onboardingRes.data   ?? []) as OnboardingRow[]
  const proposals    = (proposalRes.data      ?? []) as ProposalRow[]
  const renewals     = (renewalRes.data       ?? []) as RenewalRow[]
  const atRisk       = (atRiskRes.data        ?? []) as AtRiskRow[]
  const sponsors     = (sponsorsRes.data      ?? []) as SponsorRow[]
  const upgradeReady = (upgradeRes.data       ?? []) as { id: string; business_name: string; lifecycle_stage: string }[]
  const approvedArts = (approvedRes.data      ?? []) as { id: string; title: string; guide_slug: string }[]
  const staleCount   = staleCountRes.count    ?? 0
  const expiredEventsCount = expiredEventsRes.count ?? 0
  const totalPublished     = articleCountRes.count  ?? 0

  // Lifecycle counts
  const allAccounts = (lifecycleCountsRes.data ?? []) as { lifecycle_stage: string }[]
  const activeCount = allAccounts.filter(a => a.lifecycle_stage === 'active').length

  // Derived counts
  const blockedOnboarding = onboarding.filter(a => isOnboardingBlocked(a.ops_checklist))
  const overdueOnboarding = onboarding.filter(a => daysSince(a.onboarding_started_at, now) > 14)
  const renewals30 = renewals.filter(r => daysUntilDate(r.contract_end_date, now) <= 30)
  const renewals60 = renewals.filter(r => { const d = daysUntilDate(r.contract_end_date, now); return d > 30 && d <= 60 })
  const overdueProposals = proposals.filter(p => daysSince(p.last_contact_at, now) > 7)
  const sponsorRenewals  = renewals.filter(r => !!r.sponsor_category_slug)

  // Category positions
  const totalPositions = GUIDE_CONFIGS.reduce((s, g) => s + g.categories.length, 0)
  const claimedPositions = sponsors.length
  const openPositions = totalPositions - claimedPositions

  // Article counts by guide
  const articleGuides = new Set((approvedArts).map(a => a.guide_slug))
  const guidesNoArticles = GUIDE_CONFIGS.filter(g =>
    !sponsors.some(s => s.sponsor_guide_slug === g.slug) // just for reference
  ).length // simplified — see content/operations for detailed per-guide article counts

  // ── Compute priorities ───────────────────────────────────────────────────
  const priorities: PriorityItem[] = []

  // CRITICAL
  atRisk.forEach(s => {
    priorities.push({ urgency: 'critical', icon: '🔴', title: `${s.business_name} — sponsor at risk`, desc: 'Flagged for retention risk. Personal outreach needed this week.', action: 'View inventory', url: '/admin/advertisers/sponsor-inventory?status=at-risk' })
  })
  renewals.filter(r => daysUntilDate(r.contract_end_date, now) <= 7).forEach(r => {
    const days = daysUntilDate(r.contract_end_date, now)
    priorities.push({ urgency: 'critical', icon: '⏰', title: `${r.business_name} — renewal in ${days} day${days !== 1 ? 's' : ''}`, desc: r.sponsor_category_slug ? 'Category Sponsor position will be released if not renewed.' : 'Agreement expires imminently.', action: 'View', url: '/admin/advertisers/sponsor-inventory' })
  })
  if (blockedOnboarding.length > 0 && overdueOnboarding.length > 0) {
    priorities.push({ urgency: 'critical', icon: '🚧', title: `${overdueOnboarding.length} onboarding account${overdueOnboarding.length > 1 ? 's' : ''} stuck 14+ days`, desc: 'These partners have been in onboarding too long. Check for missing assets or approval bottlenecks.', action: 'Review', url: '/admin/advertisers/onboarding' })
  }

  // HIGH
  if (renewals30.length > 0) {
    priorities.push({ urgency: 'high', icon: '📅', title: `${renewals30.length} renewal${renewals30.length > 1 ? 's' : ''} due within 30 days`, desc: renewals30.some(r => r.sponsor_category_slug) ? 'Includes Category Sponsor positions. Renewal conversation should be active now.' : 'Agreements expiring soon — personal renewal outreach needed.', action: 'View renewals', url: '/admin/advertisers/sponsor-inventory' })
  }
  if (approvedArts.length > 0) {
    priorities.push({ urgency: 'high', icon: '📝', title: `${approvedArts.length} approved article${approvedArts.length > 1 ? 's' : ''} waiting to publish`, desc: 'These are reviewed and ready. Every day unpublished is a day of missed guide freshness.', action: 'Publish', url: '/admin/articles/review' })
  }
  if (overdueProposals.length > 0) {
    priorities.push({ urgency: 'high', icon: '📋', title: `${overdueProposals.length} proposal${overdueProposals.length > 1 ? 's' : ''} need follow-up`, desc: 'These accounts haven\'t been contacted in 7+ days. Proposals go cold quickly.', action: 'Follow up', url: '/admin/advertisers/proposals' })
  }
  if (blockedOnboarding.length > 0 && overdueOnboarding.length === 0) {
    priorities.push({ urgency: 'high', icon: '📦', title: `${blockedOnboarding.length} onboarding account${blockedOnboarding.length > 1 ? 's' : ''} missing assets`, desc: 'Critical checklist items incomplete. These listings can\'t go live until resolved.', action: 'Review', url: '/admin/advertisers/onboarding' })
  }

  // MEDIUM
  if (staleCount > 0) {
    priorities.push({ urgency: 'medium', icon: '🔄', title: `${staleCount} article${staleCount > 1 ? 's' : ''} haven't been updated in 6+ months`, desc: 'Stale content weakens guide authority and repeat visits. Schedule a refresh cycle.', action: 'Review', url: '/admin/content/operations#freshness' })
  }
  if (expiredEventsCount > 0) {
    priorities.push({ urgency: 'medium', icon: '📆', title: `${expiredEventsCount} past event${expiredEventsCount > 1 ? 's' : ''} may still be showing`, desc: 'Expired events degrade the Things To Do experience for families.', action: 'Clean up', url: '/admin/content/calendar' })
  }
  if (renewals60.length > 0 && renewals30.length === 0) {
    priorities.push({ urgency: 'medium', icon: '🗓️', title: `${renewals60.length} renewal${renewals60.length > 1 ? 's' : ''} due in 30–60 days`, desc: 'Good time to send personalized renewal emails and gauge commitment.', action: 'Plan outreach', url: '/admin/advertisers/sponsor-inventory' })
  }

  // Seasonal nudges
  SEASONAL_NUDGES.filter(s => s.months.includes(month)).forEach(s => {
    priorities.push({ urgency: 'medium', icon: '📅', title: 'Seasonal: ' + s.msg.slice(2, s.msg.indexOf('.')+1), desc: s.msg.slice(s.msg.indexOf('.')+2), action: 'View content ops', url: s.link })
  })

  // Sort: critical → high → medium
  const ORDER = { critical: 0, high: 1, medium: 2 }
  priorities.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency])
  const shownPriorities = priorities.slice(0, 8)

  // ── Operator guidance ────────────────────────────────────────────────────
  const guidanceMessages: string[] = []
  if (upgradeReady.length > 0)
    guidanceMessages.push(`⬆️ ${upgradeReady.length} advertiser${upgradeReady.length > 1 ? 's are' : ' is'} upgrade-ready. Schedule the upgrade conversation — don't wait for them to ask.`)
  if (openPositions > 0)
    guidanceMessages.push(`👑 ${openPositions} category sponsor position${openPositions > 1 ? 's are' : ' is'} open across ${GUIDE_CONFIGS.length} guides. Each open position is uncaptured recurring revenue.`)
  if (approvedArts.length > 0)
    guidanceMessages.push(`📰 ${approvedArts.length} article${approvedArts.length > 1 ? 's are' : ' is'} approved and sitting unpublished. Guide freshness drops every day these stay in the queue.`)
  if (sponsorRenewals.length > 0)
    guidanceMessages.push(`🔐 ${sponsorRenewals.length} Category Sponsor${sponsorRenewals.length > 1 ? 's have' : ' has'} a renewal in the next 90 days. Sponsor renewals require personal outreach — never an automated email.`)

  // ── Calendar/Timeline items ──────────────────────────────────────────────
  interface CalItem { date: Date; label: string; type: 'renewal' | 'seasonal' | 'print'; urgency: string }
  const calItems: CalItem[] = []

  renewals.slice(0, 5).forEach(r => {
    calItems.push({ date: new Date(r.contract_end_date), label: `${r.business_name} renewal`, type: 'renewal', urgency: daysUntilDate(r.contract_end_date, now) <= 14 ? 'critical' : 'normal' })
  })

  // Next print deadline (15th of current or next month)
  const printDeadline = new Date(now.getFullYear(), now.getMonth(), 15)
  if (printDeadline <= now) printDeadline.setMonth(printDeadline.getMonth() + 1)
  calItems.push({ date: printDeadline, label: 'Print ad deadline', type: 'print', urgency: daysUntilDate(printDeadline.toISOString(), now) <= 7 ? 'critical' : 'normal' })

  calItems.sort((a, b) => a.date.getTime() - b.date.getTime())

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const URGENCY_BORDER: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: 'system-ui, sans-serif', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 4px' }}>{dateStr}</p>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: '0 0 6px' }}>
              {greeting}. {priorities.filter(p => p.urgency === 'critical').length > 0
                ? `${priorities.filter(p => p.urgency === 'critical').length} critical item${priorities.filter(p => p.urgency === 'critical').length > 1 ? 's' : ''} need attention.`
                : priorities.length > 0
                  ? `${priorities.length} thing${priorities.length > 1 ? 's' : ''} to address today.`
                  : 'Ecosystem looks healthy today.'}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              {activeCount} active partners · {totalPublished} published articles · {openPositions} open sponsor positions
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/advertisers/sponsor-inventory" style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>Sponsor Inventory</Link>
            <Link href="/admin/advertisers/onboarding"        style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>Onboarding</Link>
            <Link href="/admin/content/operations"            style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>Content Ops</Link>
          </div>
        </div>

        {/* ── TODAY'S PRIORITIES ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Today&apos;s Focus · {shownPriorities.length} item{shownPriorities.length !== 1 ? 's' : ''}
            </p>
            {priorities.length > 8 && (
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>+{priorities.length - 8} more in detail pages</p>
            )}
          </div>

          {shownPriorities.length === 0 ? (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>✓</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Everything looks good today.</p>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No critical or high-priority items. Use the opportunity section below to be proactive.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {shownPriorities.map((p, i) => (
                <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${URGENCY_BORDER[p.urgency]}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 4px', lineHeight: 1.3 }}>{p.title}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, margin: 0 }}>{p.desc}</p>
                    </div>
                  </div>
                  <Link href={p.url} style={{ fontSize: 11, fontWeight: 700, color: URGENCY_BORDER[p.urgency], textDecoration: 'none', alignSelf: 'flex-end' }}>
                    {p.action} →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── OPERATOR GUIDANCE ────────────────────────────────────────────── */}
        {guidanceMessages.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Operator Guidance</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guidanceMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ECOSYSTEM HEALTH STRIP ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Active Partners', value: activeCount,         dot: '#22c55e' },
            { label: 'In Onboarding',  value: onboarding.length,   dot: '#3b82f6', warn: blockedOnboarding.length > 0 },
            { label: 'Proposals Out',  value: proposals.filter(p => p.lifecycle_stage === 'proposal').length, dot: '#eab308' },
            { label: 'Renewals 90d',   value: renewals.length,     dot: renewals30.length > 0 ? '#ef4444' : '#f97316' },
            { label: 'Open Positions', value: openPositions,       dot: '#22c55e' },
            { label: 'Stale Articles', value: staleCount,          dot: staleCount > 0 ? '#ef4444' : '#22c55e' },
            { label: 'Active Sponsors',value: sponsors.length,     dot: '#b8860b' },
            { label: 'Upgrade Ready',  value: upgradeReady.length, dot: '#8b5cf6', warn: false },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: '#fff', border: `1px solid ${m.warn ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: m.dot, display: 'inline-block' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN BODY: TWO COLUMNS ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28, alignItems: 'start' }}>

          {/* LEFT: Workflow Queues */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Workflow Queues</p>

            {/* Queue cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {/* Onboarding queue */}
              <Link href="/admin/advertisers/onboarding" style={{ textDecoration: 'none', display: 'block', backgroundColor: '#fff', border: blockedOnboarding.length > 0 ? '1px solid #fca5a5' : '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Onboarding</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div><p style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>{onboarding.length}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>active</p></div>
                  {blockedOnboarding.length > 0 && <div><p style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', margin: 0 }}>{blockedOnboarding.length}</p><p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>blocked</p></div>}
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>Manage →</p>
              </Link>

              {/* Proposals queue */}
              <Link href="/admin/advertisers/proposals" style={{ textDecoration: 'none', display: 'block', backgroundColor: '#fff', border: overdueProposals.length > 0 ? '1px solid #fde68a' : '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Proposals</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div><p style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>{proposals.filter(p => p.lifecycle_stage === 'consultation').length}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>in consult.</p></div>
                  <div><p style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>{proposals.filter(p => p.lifecycle_stage === 'proposal').length}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>sent</p></div>
                  {overdueProposals.length > 0 && <div><p style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', margin: 0 }}>{overdueProposals.length}</p><p style={{ fontSize: 11, color: '#f59e0b', margin: 0 }}>overdue</p></div>}
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>Manage →</p>
              </Link>

              {/* Sponsor renewals */}
              <Link href="/admin/advertisers/sponsor-inventory" style={{ textDecoration: 'none', display: 'block', backgroundColor: '#fff', border: renewals30.length > 0 ? '1px solid #fca5a5' : '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Renewals</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div><p style={{ fontSize: 22, fontWeight: 900, color: renewals30.length > 0 ? '#ef4444' : '#111827', margin: 0 }}>{renewals30.length}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>within 30d</p></div>
                  <div><p style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>{renewals60.length}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>within 60d</p></div>
                  {sponsorRenewals.length > 0 && <div><p style={{ fontSize: 22, fontWeight: 900, color: '#b8860b', margin: 0 }}>{sponsorRenewals.length}</p><p style={{ fontSize: 11, color: '#b8860b', margin: 0 }}>sponsors</p></div>}
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>View inventory →</p>
              </Link>

              {/* Content queue */}
              <Link href="/admin/content/operations" style={{ textDecoration: 'none', display: 'block', backgroundColor: '#fff', border: (staleCount > 0 || approvedArts.length > 0) ? '1px solid #fde68a' : '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Content</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  {approvedArts.length > 0 && <div><p style={{ fontSize: 22, fontWeight: 900, color: '#3b82f6', margin: 0 }}>{approvedArts.length}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>ready to pub.</p></div>}
                  <div><p style={{ fontSize: 22, fontWeight: 900, color: staleCount > 0 ? '#f59e0b' : '#111827', margin: 0 }}>{staleCount}</p><p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>stale 6mo+</p></div>
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>Content ops →</p>
              </Link>
            </div>

            {/* Upcoming renewals detail */}
            {renewals.length > 0 && (
              <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0 }}>Upcoming Renewals</p>
                </div>
                <div style={{ padding: '8px 18px' }}>
                  {renewals.slice(0, 6).map(r => {
                    const days = daysUntilDate(r.contract_end_date, now)
                    const color = days <= 7 ? '#ef4444' : days <= 30 ? '#f59e0b' : '#6b7280'
                    return (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f9fafb', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.business_name}</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{fmtDate(r.contract_end_date)}</p>
                            {r.sponsor_category_slug && <span style={{ fontSize: 9, fontWeight: 800, color: '#854d0e', backgroundColor: '#fefce8', padding: '1px 6px', borderRadius: 3 }}>SPONSOR</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Calendar + Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Timeline</p>

            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              {calItems.slice(0, 8).map((item, i) => {
                const days = Math.ceil((item.date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                const dColor = days <= 3 ? '#ef4444' : days <= 7 ? '#f97316' : days <= 14 ? '#eab308' : '#6b7280'
                const typeColor = item.type === 'renewal' ? '#b8860b' : item.type === 'print' ? '#1e3a5f' : '#6b7280'
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: i < calItems.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: dColor, lineHeight: 1 }}>{days === 0 ? 'NOW' : `${days}d`}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</p>
                      <span style={{ fontSize: 9, fontWeight: 800, color: typeColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.type}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, margin: 0 }}>{fmtDate(item.date.toISOString())}</p>
                  </div>
                )
              })}
              {calItems.length === 0 && (
                <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 16px', fontStyle: 'italic' }}>No upcoming milestones.</p>
              )}
            </div>

            {/* Quick links */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Quick Access</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Partner Operations Blueprint', href: '/admin/advertisers/partner-ops' },
                  { label: 'Sponsor Inventory Grid',       href: '/admin/advertisers/sponsor-inventory' },
                  { label: 'Proposal Preparation',         href: '/admin/advertisers/proposals' },
                  { label: 'Content Operations',           href: '/admin/content/operations' },
                  { label: 'Article Review Queue',         href: '/admin/articles/review' },
                  { label: 'Events Calendar',              href: '/admin/content/calendar' },
                  { label: 'Public: Partner Overview',     href: '/partners', target: '_blank' as const },
                ].map(link => (
                  <Link key={link.href} href={link.href} target={link.target} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#374151', textDecoration: 'none', padding: '5px 0', borderBottom: '1px solid #f9fafb' }}>
                    {link.label}
                    <span style={{ color: '#d1d5db' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── OPPORTUNITY ENGINE ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Opportunities</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>

            {/* Upgrade-ready */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #ede9fe', borderLeft: '4px solid #8b5cf6', borderRadius: 8, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Upgrade Conversations</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 6px' }}>{upgradeReady.length}</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginBottom: 10 }}>
                {upgradeReady.length > 0
                  ? `${upgradeReady.map(u => u.business_name).slice(0, 2).join(', ')}${upgradeReady.length > 2 ? ` +${upgradeReady.length - 2} more` : ''}`
                  : 'No upgrade-ready accounts currently.'
                }
              </p>
              <Link href="/admin/advertisers/proposals" style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textDecoration: 'none' }}>Schedule conversations →</Link>
            </div>

            {/* Open sponsor positions */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #fef9e7', borderLeft: '4px solid #b8860b', borderRadius: 8, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#b8860b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Open Sponsor Positions</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 6px' }}>{openPositions}</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginBottom: 10 }}>
                Across {GUIDE_CONFIGS.length} guides · {sponsors.length} positions claimed. Each open position is potential recurring revenue.
              </p>
              <Link href="/admin/advertisers/sponsor-inventory?status=open" style={{ fontSize: 11, fontWeight: 700, color: '#b8860b', textDecoration: 'none' }}>View open positions →</Link>
            </div>

            {/* Content gaps */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e0f2fe', borderLeft: '4px solid #0284c7', borderRadius: 8, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Content Gap Opportunity</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 6px' }}>{approvedArts.length > 0 ? approvedArts.length : staleCount}</p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginBottom: 10 }}>
                {approvedArts.length > 0
                  ? `${approvedArts.length} article${approvedArts.length > 1 ? 's' : ''} approved and ready to publish. Adding these improves guide freshness immediately.`
                  : `${staleCount} article${staleCount !== 1 ? 's' : ''} should be refreshed. Fresh content drives return visits.`
                }
              </p>
              <Link href="/admin/content/operations" style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>View content ops →</Link>
            </div>

            {/* Seasonal sales window */}
            {SEASONAL_NUDGES.filter(s => s.months.includes(month)).slice(0, 1).map((s, i) => (
              <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: 8, padding: '16px 18px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Seasonal Sales Window</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 6, lineHeight: 1.3 }}>{s.msg.slice(0, s.msg.indexOf('.') + 1)}</p>
                <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginBottom: 10 }}>
                  {s.guide && openPositions > 0 ? `Open sponsor positions available in this guide now.` : 'Seasonal traffic is active — ensure this guide is fresh and sponsored.'}
                </p>
                <Link href={s.guide ? `/admin/advertisers/sponsor-inventory?guide=${s.guide}` : '/admin/content/operations'} style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textDecoration: 'none' }}>
                  {s.guide ? 'View guide inventory →' : 'View content ops →'}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI ASSIST LAYER (FOUNDATIONAL) ──────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>AI-Assisted Guidance</p>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 9px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Coming with AI Integration
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {[
              { icon: '🤖', title: 'Sponsor Outreach Ideas',        desc: 'AI will surface specific businesses to approach for open categories based on seasonal demand, current listings activity, and category gaps.' },
              { icon: '✍️', title: 'Content Refresh Suggestions',   desc: 'AI will recommend which articles to refresh first, based on search trends, sponsor relationships, and seasonal timing.' },
              { icon: '📧', title: 'Newsletter Theme Ideas',        desc: 'AI will suggest weekly newsletter themes based on seasonal focus, active sponsors, and recent editorial content.' },
              { icon: '💡', title: 'Proposal Opportunity Signals',  desc: 'AI will identify businesses showing purchase intent signals — guide visits, return visits, competitor research behavior.' },
            ].map(card => (
              <div key={card.title} style={{ backgroundColor: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 10, padding: '16px 18px', opacity: 0.75 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{card.icon}</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', margin: 0 }}>{card.title}</p>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
