// ── /admin/engagement ──────────────────────────────────────────────────────────
// Audience Growth & Engagement Engine.
// Strategic intelligence dashboard for the hyperlocal family ecosystem.
// Derives insights from real participation data (submissions, guides, sponsors).
// engagement_signals table is wired in as public pages grow.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { SUBMISSION_TYPES } from '@/lib/submissions'
import { GUIDE_CONFIGS }    from '@/app/partners/guide/configs'
import type { EngagementCampaignRow } from '@/types/db'
import {
  normalizePublication,
  type PublicationSlug,
} from '@/lib/queries/publications'
import { PubFilterBar } from '@/components/admin/PubFilterBar'

export const metadata: Metadata = { title: 'Engagement — Admin' }

// ── Local-only types (narrow projections from shared tables) ──────────────────

interface SubStat {
  submission_type:    string
  target_publication: string
  status:             string
  created_at:         string
}

interface ArticleStat {
  guide_slug:  string
  created_at:  string
}

interface SponsorStat {
  sponsor_category_slug: string | null
  lifecycle_stage:       string
  business_name:         string
}

// ── Static config ─────────────────────────────────────────────────────────────

const VIEWS = [
  { key: 'overview',      label: 'Overview',       icon: '📊' },
  { key: 'participation', label: 'Participation',  icon: '🤝' },
  { key: 'content',       label: 'Content Health', icon: '📖' },
  { key: 'email',         label: 'Email Growth',   icon: '📧' },
  { key: 'campaigns',     label: 'Campaigns',      icon: '🎯' },
] as const
type ViewKey = (typeof VIEWS)[number]['key']

const HIGH_SHARE_TYPES = new Set([
  'student-spotlight', 'birthday-celebration', 'teacher-of-the-month',
  'mom-to-mom', 'grands-are-the-greatest', 'play-ball',
])

// Submission type → sponsor category (for gap analysis)
const TYPE_TO_SPONSOR_CATEGORY: Record<string, string> = {
  'student-spotlight':       'tutoring-enrichment',
  'play-ball':               'sports-recreation',
  'school-news':             'private-independent-schools',
  'teacher-of-the-month':    'private-independent-schools',
  'parent-picks':            'family-services',
  'mom-to-mom':              'mom-wellness',
  'birthday-celebration':    'shopping-boutiques',
  'event-submission':        'events-activities',
  'grands-are-the-greatest': 'senior-living',
}

// Family participation signals: types that represent direct community engagement
const PARTICIPATION_TYPES = new Set([
  'teacher-of-the-month', 'student-spotlight', 'birthday-celebration',
  'grands-are-the-greatest', 'play-ball', 'mom-to-mom',
])

const CAMPAIGN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  participation: { label: 'Participation',  color: '#2563eb' },
  newsletter:    { label: 'Newsletter',     color: '#7c3aed' },
  seasonal:      { label: 'Seasonal',       color: '#d97706' },
  sponsor:       { label: 'Sponsor',        color: '#16a34a' },
  content:       { label: 'Content',        color: '#0891b2' },
  retention:     { label: 'Retention',      color: '#dc2626' },
}

const CAMPAIGN_STATUS_STYLE: Record<string, string> = {
  idea:     'bg-gray-100 text-portal-sub',
  planned:  'bg-portal-blue-lt text-portal-blue',
  active:   'bg-green-100 text-green-700',
  complete: 'bg-purple-100 text-purple-700',
  paused:   'bg-portal-amber-lt text-portal-amber',
}

// Email growth opportunity definitions (editorial, not live analytics)
const EMAIL_OPPORTUNITIES = [
  {
    trigger: 'Family Favorites nomination flow',
    why: 'Families who nominate are emotionally invested — highest newsletter conversion moment',
    page: '/family-favorites',
    urgency: 'high',
    signup_type: 'Newsletter + nomination updates',
  },
  {
    trigger: 'Community submission thank-you page',
    why: 'Submitters already trust us enough to share — perfect newsletter opt-in moment',
    page: '/submit/*',
    urgency: 'high',
    signup_type: 'Newsletter + story live notification',
  },
  {
    trigger: 'Event calendar browse',
    why: 'Families browsing events want to be reminded — event alert subscriptions',
    page: '/events (planned)',
    urgency: 'medium',
    signup_type: 'Event reminder + newsletter',
  },
  {
    trigger: 'Guide explore pages',
    why: 'Families researching guides are high-intent — "Follow this guide" subscription',
    page: '/family-resource-guide/*',
    urgency: 'medium',
    signup_type: '"Guide updated" alerts + newsletter',
  },
  {
    trigger: 'Student spotlight & birthday pages',
    why: 'Emotional, shareable content — families who read spotlights return for more',
    page: '/editorial/* (student, birthday)',
    urgency: 'medium',
    signup_type: 'Newsletter + similar story alerts',
  },
  {
    trigger: 'School news pages',
    why: 'School-connected families are recurring readers — high lifetime value',
    page: '/school-news/* (planned)',
    urgency: 'low',
    signup_type: '"School updates" + newsletter',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function guideHealthStatus(count: number, daysSinceLast: number): { label: string; color: string } {
  if (count === 0)           return { label: 'No content',  color: '#ef4444' }
  if (daysSinceLast > 90)   return { label: 'Dormant',      color: '#f97316' }
  if (daysSinceLast > 30)   return { label: 'Slow',         color: '#d97706' }
  return                            { label: 'Active',       color: '#16a34a' }
}

// ── Server actions ────────────────────────────────────────────────────────────

async function createCampaign(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name     = (formData.get('name')             as string).trim()
  if (!name) return
  await supabase.from('engagement_campaigns').insert({
    name,
    campaign_type:    formData.get('campaign_type')  as string,
    publication:     (formData.get('publication')    as string) || null,
    target_category: (formData.get('target_category')as string) || null,
    goal:            (formData.get('goal')           as string) || null,
    owner:           (formData.get('owner')          as string) || null,
    start_date:      (formData.get('start_date')     as string) || null,
    end_date:        (formData.get('end_date')       as string) || null,
    status:          'idea',
  })
  redirect('/admin/engagement?view=campaigns')
}

async function advanceCampaignStatus(formData: FormData) {
  'use server'
  const supabase     = await createClient()
  const id           = formData.get('id')         as string
  const nextStatus   = formData.get('next_status')as string
  const resultNotes  = formData.get('result_notes')as string | null
  await supabase.from('engagement_campaigns')
    .update({ status: nextStatus, result_notes: resultNotes || null })
    .eq('id', id)
  redirect('/admin/engagement?view=campaigns')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; pub?: string }>
}) {
  const { view: rawView = 'overview', pub: rawPub } = await searchParams
  const activeView = (VIEWS.some(v => v.key === rawView) ? rawView : 'overview') as ViewKey
  const filterPub  = normalizePublication(rawPub)

  const supabase = await createClient()

  // ── Parallel data queries ─────────────────────────────────────────────────

  const now30   = new Date(Date.now() - 30  * 86400000).toISOString()
  const now60   = new Date(Date.now() - 60  * 86400000).toISOString()
  const now90   = new Date(Date.now() - 90  * 86400000).toISOString()

  // Apply publication filter to submission queries
  let subs30Query = supabase
    .from('community_submissions')
    .select('submission_type, target_publication, status, created_at')
    .gte('created_at', now30)
    .limit(500)
  let allSubsQuery = supabase
    .from('community_submissions')
    .select('submission_type, target_publication, status, created_at')
    .limit(2000)
  if (filterPub) {
    subs30Query  = subs30Query.eq('target_publication', filterPub)
    allSubsQuery = allSubsQuery.eq('target_publication', filterPub)
  }

  const [
    { data: rawSubs30 },
    { data: rawAllSubs },
    { data: rawArticles },
    { data: rawSponsors },
    { data: rawCampaigns },
    { data: rawSignals },
  ] = await Promise.all([
    subs30Query,
    allSubsQuery,
    supabase
      .from('guide_articles')
      .select('guide_slug, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('advertiser_accounts')
      .select('sponsor_category_slug, lifecycle_stage, business_name')
      .in('lifecycle_stage', ['active', 'renewal', 'sponsor-qualified', 'upgrade-ready'])
      .not('sponsor_category_slug', 'is', null)
      .limit(200),
    supabase
      .from('engagement_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('engagement_signals')
      .select('signal_type, source_category, source_guide_slug, publication, created_at')
      .gte('created_at', now30)
      .limit(500),
  ])

  const subs30     = (rawSubs30    ?? []) as SubStat[]
  const allSubs    = (rawAllSubs   ?? []) as SubStat[]
  const articles   = (rawArticles  ?? []) as ArticleStat[]
  const sponsors   = (rawSponsors  ?? []) as SponsorStat[]
  const campaigns  = (rawCampaigns ?? []) as unknown as EngagementCampaignRow[]
  const signals30  = (rawSignals   ?? [])

  // ── Participation analysis ─────────────────────────────────────────────────

  // All-time type distribution
  const typeCounts = new Map<string, number>()
  for (const s of allSubs) {
    typeCounts.set(s.submission_type, (typeCounts.get(s.submission_type) ?? 0) + 1)
  }
  const sortedTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
  const maxTypeCount = sortedTypes[0]?.[1] ?? 1

  // 30-day type distribution
  const typeCounts30 = new Map<string, number>()
  for (const s of subs30) {
    typeCounts30.set(s.submission_type, (typeCounts30.get(s.submission_type) ?? 0) + 1)
  }

  // Publication distribution (all time)
  const pubCounts = new Map<string, number>()
  for (const s of allSubs) {
    pubCounts.set(s.target_publication, (pubCounts.get(s.target_publication) ?? 0) + 1)
  }

  // Family participation types (30 days)
  const participationCount30 = subs30.filter(s => PARTICIPATION_TYPES.has(s.submission_type)).length
  const highShareCount30     = subs30.filter(s => HIGH_SHARE_TYPES.has(s.submission_type)).length

  // Monthly breakdown (last 6 months) for velocity chart
  const monthBuckets = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d  = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthBuckets.set(key, 0)
  }
  for (const s of allSubs) {
    const key = s.created_at.slice(0, 7)
    if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1)
  }
  const monthData = [...monthBuckets.entries()]
  const maxMonth  = Math.max(...monthData.map(([, v]) => v), 1)

  // ── Guide health analysis ─────────────────────────────────────────────────

  const guideArticleMap = new Map<string, { count: number; latest: string }>()
  for (const a of articles) {
    const cur = guideArticleMap.get(a.guide_slug)
    if (!cur) {
      guideArticleMap.set(a.guide_slug, { count: 1, latest: a.created_at })
    } else {
      cur.count++
      if (a.created_at > cur.latest) cur.latest = a.created_at
    }
  }

  const guideHealth = GUIDE_CONFIGS.map(g => {
    const stat = guideArticleMap.get(g.slug)
    const days = stat ? daysSince(stat.latest) : 999
    return {
      slug:   g.slug,
      name:   g.name,
      emoji:  g.emoji,
      count:  stat?.count ?? 0,
      days,
      status: guideHealthStatus(stat?.count ?? 0, days),
    }
  }).sort((a, b) => b.count - a.count)

  const activeGuides  = guideHealth.filter(g => g.status.label === 'Active').length
  const dormantGuides = guideHealth.filter(g => g.status.label === 'Dormant' || g.status.label === 'No content').length

  // ── Sponsor gap analysis ──────────────────────────────────────────────────

  const sponsoredCats = new Set(sponsors.map(s => s.sponsor_category_slug).filter(Boolean) as string[])

  // Find content types with strong participation but unsponsored category
  const sponsorGaps = sortedTypes
    .filter(([type]) => {
      const cat = TYPE_TO_SPONSOR_CATEGORY[type]
      return cat && !sponsoredCats.has(cat)
    })
    .slice(0, 5)
    .map(([type, count]) => ({
      type,
      count,
      category: TYPE_TO_SPONSOR_CATEGORY[type],
      tc: SUBMISSION_TYPES.find(t => t.type === type),
    }))

  // ── Campaign stats ────────────────────────────────────────────────────────
  const activeCampaigns  = campaigns.filter(c => c.status === 'active').length
  const plannedCampaigns = campaigns.filter(c => c.status === 'planned').length

  // ── Ecosystem health score (0–100) ────────────────────────────────────────
  const guideScore       = Math.round((activeGuides / Math.max(GUIDE_CONFIGS.length, 1)) * 100)
  const participationOk  = subs30.length >= 5 ? 100 : Math.round((subs30.length / 5) * 100)
  const sponsorScore     = Math.round((sponsoredCats.size / Math.max(Object.keys(TYPE_TO_SPONSOR_CATEGORY).length, 1)) * 100)
  const ecosystemHealth  = Math.round((guideScore + participationOk + sponsorScore) / 3)

  // ── Render ────────────────────────────────────────────────────────────────

  const viewHref = (v: string) =>
    filterPub ? `/admin/engagement?view=${v}&pub=${filterPub}` : `/admin/engagement?view=${v}`
  const pubHref = (p: PublicationSlug | null) =>
    p ? `/admin/engagement?view=${activeView}&pub=${p}` : `/admin/engagement?view=${activeView}`

  return (
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-portal-text tracking-tight">Audience Engagement Engine</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            Strategic growth intelligence — participation, content health, email growth, and campaign planning.
          </p>
        </div>
        <PubFilterBar
          activePub={filterPub}
          makeHref={p => pubHref(p as PublicationSlug | null)}
          variant="light"
        />
      </div>

      {/* ── View tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {VIEWS.map(v => (
          <Link
            key={v.key}
            href={viewHref(v.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeView === v.key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
            }`}
          >
            <span>{v.icon}</span>
            <span>{v.label}</span>
          </Link>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: OVERVIEW
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'overview' && (
        <div className="space-y-6">

          {/* Ecosystem health strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: 'Ecosystem Health',  val: `${ecosystemHealth}%`, color: ecosystemHealth >= 70 ? '#16a34a' : ecosystemHealth >= 45 ? '#d97706' : '#ef4444', sub: 'guides + participation + sponsors' },
              { label: 'Submissions (30d)', val: subs30.length,          color: '#2563eb',  sub: `${participationCount30} family participation` },
              { label: 'Active Guides',     val: `${activeGuides} / ${GUIDE_CONFIGS.length}`, color: '#7c3aed', sub: `${dormantGuides} dormant` },
              { label: 'Sponsor Gaps',      val: sponsorGaps.length,    color: sponsorGaps.length > 3 ? '#ef4444' : '#d97706', sub: 'high-engagement, unsponsored' },
            ] as const).map(({ label, val, color, sub }) => (
              <div key={label} className="bg-white border border-portal-border rounded-xl px-4 py-4">
                <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                <p className="text-xs font-semibold text-portal-sub mt-0.5">{label}</p>
                <p className="text-[10px] text-portal-muted mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Participation velocity — 6-month bar chart */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-portal-text">Submission Velocity — Last 6 Months</h2>
              <Link href={viewHref('participation')} className="text-xs text-indigo-600 hover:underline font-semibold">Full breakdown →</Link>
            </div>
            <div className="flex items-end gap-2 h-24">
              {monthData.map(([key, val]) => {
                const pct   = Math.round((val / maxMonth) * 100)
                const month = new Date(key + '-01').toLocaleString('en-US', { month: 'short' })
                return (
                  <div key={key} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-portal-sub">{val > 0 ? val : ''}</span>
                    <div className="w-full rounded-t-md transition-all" style={{
                      height: `${Math.max(pct, 4)}%`,
                      backgroundColor: pct > 60 ? '#2563eb' : pct > 30 ? '#7c3aed' : '#e5e7eb',
                    }} />
                    <span className="text-[10px] text-portal-muted">{month}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick wins — strategic callouts */}
          <div>
            <h2 className="text-sm font-bold text-portal-text mb-3">Strategic Opportunities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {sponsorGaps.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4">
                  <p className="text-xs font-bold text-green-800 mb-1">💰 Sponsor Revenue Gap</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    <strong>{sponsorGaps[0]?.tc?.label ?? sponsorGaps[0]?.type}</strong> is your top participation category with no sponsor.
                    {sponsorGaps[0]?.count} submissions total — strong audience signal.
                  </p>
                  <Link href={viewHref('participation')} className="text-[11px] text-green-600 font-semibold mt-2 block hover:underline">
                    See gap analysis →
                  </Link>
                </div>
              )}

              {dormantGuides > 0 && (
                <div className="bg-portal-amber-lt border border-amber-200 rounded-xl px-4 py-4">
                  <p className="text-xs font-bold text-portal-amber mb-1">📖 Guide Content Gaps</p>
                  <p className="text-xs text-portal-amber leading-relaxed">
                    {dormantGuides} guide{dormantGuides !== 1 ? 's are' : ' is'} dormant or empty.
                    Active guides drive recurring readers — these need content attention.
                  </p>
                  <Link href={viewHref('content')} className="text-[11px] text-amber-600 font-semibold mt-2 block hover:underline">
                    Guide health →
                  </Link>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-4">
                <p className="text-xs font-bold text-purple-800 mb-1">📧 Email Growth Moment</p>
                <p className="text-xs text-purple-700 leading-relaxed">
                  Community submission thank-you page is an untapped newsletter capture moment.
                  Submitters are already high-trust — ideal signup context.
                </p>
                <Link href={viewHref('email')} className="text-[11px] text-purple-600 font-semibold mt-2 block hover:underline">
                  Email growth map →
                </Link>
              </div>

            </div>
          </div>

          {/* Top participation types (compact) */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-portal-text">Top Participation Categories</h2>
              <span className="text-[11px] text-portal-muted">All time</span>
            </div>
            <div className="space-y-2.5">
              {sortedTypes.slice(0, 6).map(([type, count]) => {
                const tc   = SUBMISSION_TYPES.find(t => t.type === type)
                const pct  = Math.round((count / maxTypeCount) * 100)
                const isHS = HIGH_SHARE_TYPES.has(type)
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-base w-6 shrink-0">{tc?.emoji ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-semibold text-portal-text truncate">{tc?.label ?? type}</p>
                        {isHS && <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded font-bold">High share</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-portal-sub font-semibold shrink-0 w-6 text-right">{count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Signals foundation note */}
          <div className="bg-portal-bg border border-portal-border rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">🔌</span>
              <div>
                <p className="text-xs font-bold text-portal-sub mb-1">Engagement Signals — Foundation Ready</p>
                <p className="text-xs text-portal-muted leading-relaxed">
                  The <code className="font-mono bg-gray-100 px-1 rounded">engagement_signals</code> table is live and waiting.
                  Signals wire in as public pages grow: guide follows, event saves, newsletter signups, return visits, social shares.
                  {signals30.length > 0
                    ? ` ${signals30.length} signals captured in the last 30 days.`
                    : ' No signals yet — tracking begins when wired to public page events.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Active campaigns */}
          {activeCampaigns + plannedCampaigns > 0 && (
            <div className="bg-white border border-portal-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-portal-text">Active Campaigns</h2>
                <Link href={viewHref('campaigns')} className="text-xs text-indigo-600 hover:underline font-semibold">All campaigns →</Link>
              </div>
              <div className="space-y-2">
                {campaigns.filter(c => c.status === 'active' || c.status === 'planned').slice(0, 4).map(c => {
                  const ct = CAMPAIGN_TYPE_LABELS[c.campaign_type]
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold text-white shrink-0`}
                        style={{ backgroundColor: ct?.color ?? '#374151' }}>
                        {ct?.label ?? c.campaign_type}
                      </span>
                      <p className="text-xs font-medium text-portal-text flex-1 truncate">{c.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CAMPAIGN_STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: PARTICIPATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'participation' && (
        <div className="space-y-6">
          <div className="bg-portal-blue-lt border border-portal-blue/20 rounded-lg px-5 py-3">
            <p className="text-xs text-portal-blue font-medium">
              🤝 Participation data is your most honest engagement signal. These families chose to contribute — they&apos;re your most engaged readers. Understand what&apos;s driving submissions and create more of it.
            </p>
          </div>

          {/* 30-day summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: 'Submissions (30d)',          val: subs30.length,            color: '#2563eb' },
              { label: 'Family Participation (30d)', val: participationCount30,      color: '#7c3aed' },
              { label: 'High-Share Types (30d)',     val: highShareCount30,          color: '#ec4899' },
              { label: 'Total All Time',             val: allSubs.length,            color: '#374151' },
            ] as const).map(({ label, val, color }) => (
              <div key={label} className="bg-white border border-portal-border rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                <p className="text-[11px] text-portal-muted mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Type distribution — full */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-portal-text mb-4">All Submission Types — All Time</h2>
            <div className="space-y-3">
              {sortedTypes.map(([type, count]) => {
                const tc        = SUBMISSION_TYPES.find(t => t.type === type)
                const pct       = Math.round((count / maxTypeCount) * 100)
                const isHS      = HIGH_SHARE_TYPES.has(type)
                const isPartic  = PARTICIPATION_TYPES.has(type)
                const sponsorCat = TYPE_TO_SPONSOR_CATEGORY[type]
                const isSponsored = sponsorCat && sponsoredCats.has(sponsorCat)
                const count30   = typeCounts30.get(type) ?? 0
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xl w-7 shrink-0 text-center">{tc?.emoji ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <p className="text-xs font-semibold text-portal-text">{tc?.label ?? type}</p>
                        {isHS      && <span className="text-[10px] bg-pink-100 text-pink-600 px-1 rounded font-bold">High share</span>}
                        {isPartic  && <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1 rounded font-bold">Participation</span>}
                        {sponsorCat && !isSponsored && <span className="text-[10px] bg-red-100 text-portal-red px-1 rounded font-bold">No sponsor</span>}
                        {sponsorCat && isSponsored  && <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded font-bold">Sponsored</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{
                            width: `${pct}%`,
                            backgroundColor: isHS ? '#ec4899' : isPartic ? '#2563eb' : '#6b7280',
                          }} />
                        </div>
                        <span className="text-xs font-bold text-portal-sub shrink-0 w-8 text-right">{count}</span>
                        {count30 > 0 && <span className="text-[10px] text-indigo-500 shrink-0">+{count30} (30d)</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {sortedTypes.length === 0 && (
                <p className="text-sm text-portal-muted text-center py-4">No submissions yet.</p>
              )}
            </div>
          </div>

          {/* Sponsor gap analysis */}
          {sponsorGaps.length > 0 && (
            <div className="bg-white border border-portal-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-portal-text">Engagement → Sponsorship Gap</h2>
                <span className="text-[11px] text-portal-muted">High participation, no sponsor</span>
              </div>
              <p className="text-xs text-portal-sub mb-4 leading-relaxed">
                These content types have strong community participation but no active sponsor. Each represents a direct sales opportunity — families are already engaged, a sponsor would reach warm audience.
              </p>
              <div className="space-y-3">
                {sponsorGaps.map(({ type, count, category, tc }) => (
                  <div key={type} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <span className="text-xl shrink-0">{tc?.emoji ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-portal-text">{tc?.label ?? type}</p>
                      <p className="text-[11px] text-portal-sub">{count} total submissions · sponsor category: <span className="font-mono">{category}</span></p>
                    </div>
                    <Link href="/admin/advertisers/pipeline" className="text-xs text-portal-red hover:underline font-semibold shrink-0">
                      Sales opp →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publication breakdown */}
          {pubCounts.size > 1 && (
            <div className="bg-white border border-portal-border rounded-lg p-5">
              <h2 className="text-sm font-bold text-portal-text mb-3">Submissions by Publication</h2>
              <div className="space-y-2">
                {[...pubCounts.entries()].sort((a, b) => b[1] - a[1]).map(([pub, count]) => {
                  const pct = Math.round((count / allSubs.length) * 100)
                  return (
                    <div key={pub} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-portal-sub w-12 shrink-0 uppercase">{pub}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-portal-sub w-8 text-right shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI future */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Participation Intelligence — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Identify Viral Story Potential', 'Suggest Participation Pushes', 'Detect Seasonal Interest Spikes', 'Predict High-Share Content'].map(label => (
                <button key={label} disabled
                  className="text-xs px-3 py-1.5 border border-portal-border rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: CONTENT HEALTH
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'content' && (
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-5 py-3">
            <p className="text-xs text-indigo-800 font-medium">
              📖 Guide health drives recurring readership. Families who find value in a guide return repeatedly — each guide is a retention loop, not a one-time visit.
            </p>
          </div>

          {/* Guide health overview cards */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'Active Guides',   count: guideHealth.filter(g => g.status.label === 'Active').length,   color: '#16a34a' },
              { label: 'Slow / Aging',    count: guideHealth.filter(g => g.status.label === 'Slow').length,     color: '#d97706' },
              { label: 'Dormant / Empty', count: guideHealth.filter(g => ['Dormant','No content'].includes(g.status.label)).length, color: '#ef4444' },
            ] as const).map(({ label, count, color }) => (
              <div key={label} className="bg-white border border-portal-border rounded-xl px-4 py-4 text-center">
                <p className="text-3xl font-bold" style={{ color }}>{count}</p>
                <p className="text-[11px] text-portal-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Guide health table */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-portal-text">Guide-by-Guide Health</h2>
              <span className="text-[11px] text-portal-muted">Based on published articles</span>
            </div>
            <div className="divide-y divide-portal-border">
              {guideHealth.map(g => (
                <div key={g.slug} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-lg shrink-0">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-portal-text truncate">{g.name}</p>
                    <p className="text-[10px] text-portal-muted font-mono">{g.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-portal-sub">{g.count} articles</span>
                    {g.count > 0 && <span className="text-[10px] text-portal-muted">{g.days}d ago</span>}
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-bold shrink-0"
                    style={{ backgroundColor: g.status.color + '20', color: g.status.color }}
                  >
                    {g.status.label}
                  </span>
                  <Link href={`/admin/guides?guide=${g.slug}`} className="text-xs text-portal-muted hover:text-indigo-600 hover:underline shrink-0">
                    →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* High-share content signal */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-portal-text mb-3">High-Share Content Types</h2>
            <p className="text-xs text-portal-sub mb-4">
              These content types naturally spread through family social networks. Prioritize them in editorial planning for organic reach amplification.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...HIGH_SHARE_TYPES].map(type => {
                const tc    = SUBMISSION_TYPES.find(t => t.type === type)
                const count = typeCounts.get(type) ?? 0
                return (
                  <div key={type} className="bg-pink-50 border border-pink-100 rounded-xl px-4 py-3">
                    <p className="text-xl mb-1">{tc?.emoji}</p>
                    <p className="text-xs font-semibold text-portal-text leading-tight">{tc?.label ?? type}</p>
                    <p className="text-[11px] text-portal-muted mt-0.5">{count} total submissions</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Underperforming sections */}
          {guideHealth.filter(g => g.status.label !== 'Active').length > 0 && (
            <div className="bg-portal-amber-lt border border-amber-200 rounded-lg p-5">
              <h2 className="text-xs font-bold text-portal-amber mb-3">🔧 Guides Needing Attention</h2>
              <div className="space-y-2">
                {guideHealth.filter(g => g.status.label !== 'Active').slice(0, 5).map(g => (
                  <div key={g.slug} className="flex items-center gap-2">
                    <span>{g.emoji}</span>
                    <p className="text-xs text-portal-amber flex-1">{g.name}</p>
                    <span className="text-[10px] font-semibold text-amber-600">
                      {g.count === 0 ? 'No articles' : `Last: ${g.days}d ago`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI content hooks */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Content Intelligence — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Suggest Guide Content', 'Identify Coverage Gaps', 'Predict Seasonal Spikes', 'Suggest Newsletter Growth'].map(label => (
                <button key={label} disabled
                  className="text-xs px-3 py-1.5 border border-portal-border rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: EMAIL GROWTH
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'email' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-100 rounded-lg px-5 py-3">
            <p className="text-xs text-purple-800 font-medium">
              📧 Email is the retention backbone. Every newsletter subscriber is a recurring relationship. These are the highest-leverage moments to add subscribers — mapped by intent and trust level.
            </p>
          </div>

          {/* Opportunity cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-portal-text">High-Value Newsletter Capture Moments</h2>
            {EMAIL_OPPORTUNITIES.map((opp, i) => (
              <div key={i} className="bg-white border border-portal-border rounded-xl overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="shrink-0 mt-0.5">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                      opp.urgency === 'high'   ? 'bg-green-100 text-green-700' :
                      opp.urgency === 'medium' ? 'bg-portal-blue-lt text-portal-blue'  :
                                                  'bg-gray-100 text-portal-sub'
                    }`}>
                      {opp.urgency === 'high' ? '⚡ High value' : opp.urgency === 'medium' ? '📍 Medium' : '📌 Low'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-portal-text mb-0.5">{opp.trigger}</p>
                    <p className="text-xs text-portal-sub leading-relaxed mb-1.5">{opp.why}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] bg-gray-100 text-portal-sub px-2 py-0.5 rounded font-mono">{opp.page}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">{opp.signup_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lead magnet ideas */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-portal-text mb-3">Lead Magnet Opportunities by Category</h2>
            <p className="text-xs text-portal-sub mb-4">
              High-value free resources create email capture moments. Each represents a downloadable or emailable resource tied to an existing guide.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { guide: 'Summer Camp Guide',        magnet: '"Summer Camp Packing Checklist PDF"',   type: 'checklist' },
                { guide: 'Childcare Guide',          magnet: '"Questions to Ask a Daycare Center"',   type: 'checklist' },
                { guide: 'Private School Guide',     magnet: '"School Visit Evaluation Worksheet"',   type: 'worksheet' },
                { guide: 'Birthday Party Guide',     magnet: '"Ultimate Local Birthday Party Planner"',type: 'planner'  },
                { guide: 'Afterschool Guide',        magnet: '"Afterschool Activity Cost Comparison"', type: 'comparison'},
                { guide: 'Family Resource Guide',    magnet: '"New Family Moving to River Region Guide"',type: 'guide' },
              ].map(({ guide, magnet, type }) => (
                <div key={guide} className="bg-portal-bg border border-portal-border rounded-xl px-4 py-3">
                  <p className="text-[10px] text-portal-muted font-semibold uppercase tracking-wide mb-0.5">{guide}</p>
                  <p className="text-xs font-semibold text-portal-text">{magnet}</p>
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring engagement loops */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-portal-text mb-3">Future Recurring Engagement Loops</h2>
            <p className="text-xs text-portal-sub mb-3">Foundation structures ready — implementation follows as platform grows.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'School Alerts',       desc: 'Follow a school for news and spotlights',           status: 'planned' },
                { name: 'Guide Follows',       desc: '"Follow this guide" for new listing/article alerts', status: 'planned' },
                { name: 'Event Reminders',     desc: 'Save an event + get a day-before reminder',          status: 'planned' },
                { name: 'Seasonal Alerts',     desc: 'Camp/school registration season early access',       status: 'planned' },
                { name: 'Birthday Spotlights', desc: 'Families who submitted get "your story is live" email', status: 'planned' },
                { name: 'Guide Update Digest', desc: 'Monthly email: what\'s new in guides you follow',   status: 'planned' },
              ].map(({ name, desc }) => (
                <div key={name} className="border border-dashed border-portal-border rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-portal-text">{name}</p>
                  <p className="text-[10px] text-portal-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI email growth hooks */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <p className="text-xs font-bold text-portal-muted uppercase tracking-wide mb-2">AI Email Growth — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Suggest Newsletter Growth Opportunities', 'Identify High-Conversion Content', 'Suggest Engagement Campaigns'].map(label => (
                <button key={label} disabled
                  className="text-xs px-3 py-1.5 border border-portal-border rounded-lg text-portal-muted cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: CAMPAIGNS
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'campaigns' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-100 rounded-lg px-5 py-3">
            <p className="text-xs text-green-800 font-medium">
              🎯 Campaigns are operator-planned engagement pushes. Track ideas from concept through execution. Each campaign should have a clear goal and a named owner.
            </p>
          </div>

          {/* Status summary */}
          <div className="grid grid-cols-5 gap-2">
            {(['idea','planned','active','complete','paused'] as const).map(s => {
              const count = campaigns.filter(c => c.status === s).length
              return (
                <div key={s} className={`text-center px-3 py-3 rounded-xl border ${count > 0 ? 'bg-white border-portal-border' : 'bg-portal-bg border-gray-50'}`}>
                  <p className={`text-xl font-bold ${count > 0 ? 'text-portal-text' : 'text-gray-300'}`}>{count}</p>
                  <p className="text-[10px] text-portal-muted capitalize mt-0.5">{s}</p>
                </div>
              )
            })}
          </div>

          {/* Campaigns list */}
          {campaigns.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-portal-text">All Campaigns</h2>
              {campaigns.map(c => {
                const ct = CAMPAIGN_TYPE_LABELS[c.campaign_type]
                const STATUS_NEXT: Record<string, { next: string; label: string } | null> = {
                  idea:     { next: 'planned',  label: 'Mark Planned' },
                  planned:  { next: 'active',   label: 'Start Campaign' },
                  active:   { next: 'complete', label: 'Mark Complete' },
                  complete: null,
                  paused:   { next: 'active',   label: 'Resume' },
                }
                const nextStep = STATUS_NEXT[c.status]
                return (
                  <div key={c.id} className="bg-white border border-portal-border rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 p-4">
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: ct?.color ?? '#374151' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-portal-text truncate">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded font-bold text-white"
                                style={{ backgroundColor: ct?.color ?? '#374151' }}
                              >
                                {ct?.label ?? c.campaign_type}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CAMPAIGN_STATUS_STYLE[c.status]}`}>
                                {c.status}
                              </span>
                              {c.publication && <span className="text-[10px] text-portal-muted font-semibold uppercase">{c.publication}</span>}
                              {c.owner && <span className="text-[10px] text-portal-muted">👤 {c.owner}</span>}
                            </div>
                          </div>
                          {nextStep && (
                            <form action={advanceCampaignStatus} className="shrink-0">
                              <input type="hidden" name="id"          value={c.id} />
                              <input type="hidden" name="next_status" value={nextStep.next} />
                              <button type="submit" className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 whitespace-nowrap">
                                {nextStep.label}
                              </button>
                            </form>
                          )}
                        </div>
                        {c.goal && <p className="text-xs text-portal-sub mt-1.5 leading-relaxed">{c.goal}</p>}
                        {(c.start_date || c.end_date) && (
                          <p className="text-[10px] text-portal-muted mt-1">
                            {c.start_date && `Start: ${c.start_date}`}
                            {c.start_date && c.end_date && ' · '}
                            {c.end_date && `End: ${c.end_date}`}
                          </p>
                        )}
                        {c.result_notes && (
                          <p className="text-[11px] text-portal-muted italic mt-1.5 bg-portal-bg rounded px-2 py-1">{c.result_notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Create campaign form */}
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-portal-text mb-4">New Engagement Campaign</h2>
            <form action={createCampaign} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Back-to-School Teacher Nominations Push"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Type</label>
                  <select name="campaign_type"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300">
                    {Object.entries(CAMPAIGN_TYPE_LABELS).map(([v, { label }]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Publication</label>
                  <select name="publication"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300">
                    <option value="">All publications</option>
                    {[['rrp','RRP'], ['mbp','MBP'], ['aop','AOP'], ['esp','ESP'], ['gpp','GPP'], ['boom','Boom']].map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Start Date</label>
                  <input type="date" name="start_date"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">End Date</label>
                  <input type="date" name="end_date"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Target Category (optional)</label>
                  <input type="text" name="target_category" placeholder="sports-recreation"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-portal-sub mb-1">Owner</label>
                  <input type="text" name="owner" placeholder="Jason"
                    className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-portal-sub mb-1">Goal</label>
                <textarea name="goal" rows={2}
                  placeholder="What are we trying to achieve? Be specific — growth target, content output, newsletter list size, etc."
                  className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-indigo-300 resize-none" />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="text-sm px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
                  Add Campaign Idea
                </button>
              </div>
            </form>
          </div>

          {campaigns.length === 0 && (
            <div className="bg-portal-bg border border-portal-border rounded-lg px-6 py-8 text-center">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm text-portal-sub font-semibold">No campaigns yet</p>
              <p className="text-xs text-portal-muted mt-1">Create your first engagement campaign above. Start with an idea — move it through planned → active → complete.</p>
            </div>
          )}
        </div>
      )}

    </main>
  )
}
