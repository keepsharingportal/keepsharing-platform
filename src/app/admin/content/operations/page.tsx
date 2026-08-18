// ── /admin/content/operations ─────────────────────────────────────────────────
// Editorial and content operations command center.
// Surfaces ecosystem content health, article pipeline, guide gaps, seasonal
// planning, events freshness, and actionable operator guidance.
// Real data from guide_articles, calendar_events, guide_listings, guide_categories.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { GUIDE_CONFIGS } from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Content Operations — Admin' }

// ── guide_type_slug → guide config slug mapping ───────────────────────────────
// guide_listings uses guide_type_slug internally; guide_articles uses guide_slug.
const GUIDE_TYPE_MAP: Record<string, string> = {
  newcomer: 'family-resource-guide',
}
function configSlugFromTypeSlug(typeSlug: string): string {
  return GUIDE_TYPE_MAP[typeSlug] ?? typeSlug
}

// ── Seasonal content calendar ─────────────────────────────────────────────────
interface SeasonalItem {
  months: number[]  // 1-based month numbers when this is relevant
  title:  string
  desc:   string
  guide:  string | null
  urgency:'critical' | 'high' | 'medium' | 'low'
  icon:   string
}

const SEASONAL_CALENDAR: SeasonalItem[] = [
  { months:[11,12,1], title:'Camp Planning Season Launch',      icon:'⛺', guide:'summer-camp-guide',    urgency:'critical', desc:'Families start summer camp research in January. Guide editorial content must be live before Dec/Jan to capture early planners.' },
  { months:[1,2],     title:'Private School Application Window', icon:'📚', guide:'private-school-guide', urgency:'high',     desc:'Application deadlines cluster Jan–Feb. Editorial support for comparison guides and "how to choose" content drives high-intent traffic.' },
  { months:[2,3],     title:'Spring Enrollment Content',         icon:'🌸', guide:'afterschool-guide',    urgency:'medium',   desc:'Spring after-school enrollment window. Programs filling for fall — families research now for both spring and next fall.' },
  { months:[3,4,5],   title:'Camp Registration Urgency',         icon:'📋', guide:'summer-camp-guide',    urgency:'high',     desc:'Registration is open and closing. "Camps still accepting" and "last spots" content drives urgency conversions.' },
  { months:[5,6],     title:'Summer Preview & Fun Guide',        icon:'☀️', guide:'summer-fun-guide',     urgency:'high',     desc:'Summer Fun Guide traffic peaks June–August. Pools, splash pads, outdoor adventures content must be live and fresh before Memorial Day.' },
  { months:[6,7],     title:'Back-to-School Early Planning',     icon:'🎒', guide:'family-resource-guide', urgency:'medium',  desc:'Families start back-to-school research in June. Childcare, tutoring, and after-school articles begin driving traffic.' },
  { months:[7,8],     title:'After-School Guide Launch Window',  icon:'🎨', guide:'afterschool-guide',    urgency:'critical', desc:'Fall enrollment opens August. After-school editorial content must be live BEFORE school starts. Programs fill in 6–8 weeks.' },
  { months:[8,9],     title:'Back-to-School Healthcare Season',  icon:'🩺', guide:'healthy-kids-guide',   urgency:'high',     desc:'Annual checkup season. Pediatrician and specialist content sees highest annual traffic Aug–Sep.' },
  { months:[9,10],    title:'Private School Tour Season',        icon:'🏫', guide:'private-school-guide', urgency:'high',     desc:'Tour season October–January. Editorial guides about "what to look for on a school tour" and category comparison are highest-value content.' },
  { months:[10,11],   title:'Family Favorites Season Prep',      icon:'⭐', guide: null,                  urgency:'medium',   desc:'Family Favorites nominations and voting cycle. Editorial support, partner visibility, and reader engagement content peak.' },
  { months:[11,12],   title:'Holiday & Year-End Content',        icon:'🎄', guide: null,                  urgency:'low',      desc:'Holiday activities, family events, year-end roundups. Light content volume but high engagement. Plan January camp push now.' },
]

// ── Pipeline stage definitions ────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key:'published',    label:'Published',     color:'#22c55e', bg:'#f0fdf4', border:'#bbf7d0' },
  { key:'needs-refresh',label:'Needs Refresh', color:'#f97316', bg:'#fff7ed', border:'#fed7aa' },
  { key:'approved',     label:'Ready to Pub.', color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
  { key:'draft',        label:'In Progress',   color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe' },
  { key:'ideas',        label:'Opportunity',   color:'#6b7280', bg:'#f9fafb', border:'#e5e7eb' },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null, now: Date): number {
  if (!dateStr) return 9999
  return Math.floor((now.getTime() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000))
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(s: string, now: Date): number {
  return Math.ceil((new Date(s).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function freshnessLabel(days: number): { label: string; color: string; bg: string } {
  if (days === 9999) return { label: 'No articles',  color: '#991b1b', bg: '#fef2f2' }
  if (days < 60)    return { label: 'Fresh',         color: '#166534', bg: '#f0fdf4' }
  if (days < 120)   return { label: 'Aging',         color: '#854d0e', bg: '#fefce8' }
  if (days < 180)   return { label: 'Stale',         color: '#c2410c', bg: '#fff7ed' }
  return                   { label: 'Very Stale',    color: '#991b1b', bg: '#fef2f2' }
}

function healthScore(articleCount: number, listingCount: number, daysSinceArticle: number): number {
  let score = 100
  if (articleCount === 0) score -= 40
  else if (articleCount < 3) score -= 20
  if (daysSinceArticle > 180) score -= 25
  else if (daysSinceArticle > 90) score -= 10
  if (listingCount < 5) score -= 15
  else if (listingCount < 10) score -= 5
  return Math.max(0, score)
}

function urgencyColor(urgency: SeasonalItem['urgency']): string {
  return urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#f97316' : urgency === 'medium' ? '#eab308' : '#6b7280'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ContentOperationsPage() {
  const supabase = await createClient()
  const now      = new Date()
  const month    = now.getMonth() + 1 // 1-indexed

  // ── Parallel data fetch ──────────────────────────────────────────────────
  const [
    allArticlesRes, articlesByGuideRes, draftArticlesRes, staleArticlesRes,
    eventsUpcomingRes, eventsExpiredRes, listingsByGuideRes,
  ] = await Promise.all([
    // All published articles (count + dates for freshness)
    supabase.from('guide_articles')
      .select('id, guide_slug, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false }),

    // Published article counts — used for per-guide breakdown
    supabase.from('guide_articles')
      .select('guide_slug, published_at')
      .eq('published', true),

    // Draft / in-progress articles
    supabase.from('guide_articles')
      .select('id, title, guide_slug, column_slug, editorial_review_status, created_at')
      .eq('published', false)
      .order('created_at', { ascending: false })
      .limit(25),

    // Stale published articles (oldest first)
    supabase.from('guide_articles')
      .select('id, title, guide_slug, column_slug, published_at')
      .eq('published', true)
      .order('published_at', { ascending: true })
      .limit(12),

    // Upcoming events
    supabase.from('calendar_events')
      .select('id, title, start_date, status')
      .gte('start_date', now.toISOString())
      .order('start_date', { ascending: true })
      .limit(10),

    // Events that may be expired but still active
    supabase.from('calendar_events')
      .select('id', { count: 'exact' })
      .lt('start_date', now.toISOString())
      .neq('status', 'expired')
      .neq('status', 'cancelled'),

    // All listings — for per-guide count
    supabase.from('guide_listings')
      .select('guide_type_slug, listing_type')
      .limit(2000),
  ])

  // ── Normalize data ───────────────────────────────────────────────────────

  interface ArticleRow { id: string; guide_slug: string; published_at: string | null }
  interface DraftRow   { id: string; title: string; guide_slug: string; column_slug: string | null; editorial_review_status: string | null; created_at: string }
  interface StaleRow   { id: string; title: string; guide_slug: string; column_slug: string | null; published_at: string | null }
  interface EventRow   { id: string; title: string; start_date: string; status: string }
  interface ListingRow { guide_type_slug: string; listing_type: string }

  const allArticles   = (allArticlesRes.data  ?? []) as ArticleRow[]
  const draftArticles = (draftArticlesRes.data ?? []) as DraftRow[]
  const staleArticles = (staleArticlesRes.data ?? []) as StaleRow[]
  const eventsUp      = (eventsUpcomingRes.data ?? []) as EventRow[]
  const expiredCount  = (eventsExpiredRes.count ?? 0)
  const allListings   = (listingsByGuideRes.data ?? []) as ListingRow[]

  const totalPublished = allArticles.length

  // Article pipeline stage counts
  const readyToPublish = draftArticles.filter(a => a.editorial_review_status === 'approved').length
  const inProgress     = draftArticles.filter(a => a.editorial_review_status !== 'approved').length
  const needsRefresh   = staleArticles.filter(a => daysSince(a.published_at, now) > 90).length
  const veryStale      = staleArticles.filter(a => daysSince(a.published_at, now) > 180).length

  // Articles by guide slug → count + latest date
  const articlesByGuide: Record<string, { count: number; latestDate: string | null }> = {}
  allArticles.forEach(a => {
    if (!articlesByGuide[a.guide_slug]) articlesByGuide[a.guide_slug] = { count: 0, latestDate: null }
    articlesByGuide[a.guide_slug].count++
    const d = a.published_at
    if (d && (!articlesByGuide[a.guide_slug].latestDate || d > articlesByGuide[a.guide_slug].latestDate!)) {
      articlesByGuide[a.guide_slug].latestDate = d
    }
  })

  // Listings by config slug
  const listingsByGuide: Record<string, number> = {}
  allListings.forEach(l => {
    const cs = configSlugFromTypeSlug(l.guide_type_slug)
    listingsByGuide[cs] = (listingsByGuide[cs] ?? 0) + 1
  })

  // ── Guide content health rows ────────────────────────────────────────────
  const guideHealth = GUIDE_CONFIGS.map(g => {
    const arts      = articlesByGuide[g.slug] ?? { count: 0, latestDate: null }
    const listings  = listingsByGuide[g.slug] ?? 0
    const daysSinceArt = daysSince(arts.latestDate, now)
    const freshness    = freshnessLabel(daysSinceArt)
    const score        = healthScore(arts.count, listings, daysSinceArt)
    return { guide: g, articleCount: arts.count, listingCount: listings, latestDate: arts.latestDate, daysSince: daysSinceArt, freshness, score }
  }).sort((a, b) => a.score - b.score) // worst first

  // ── Operator guidance alerts ─────────────────────────────────────────────
  interface Guidance { type: 'critical' | 'warning' | 'info'; msg: string; link: string; linkLabel: string }
  const guidance: Guidance[] = []

  // Guides with zero articles
  GUIDE_CONFIGS.forEach(g => {
    if ((articlesByGuide[g.slug]?.count ?? 0) === 0) {
      guidance.push({ type: 'warning', msg: `${g.emoji} ${g.name} has no published articles. Guides without editorial content see lower return visits and weaker SEO.`, link: '/admin/content/new', linkLabel: 'Add article' })
    }
  })

  // Very stale content
  if (veryStale > 0) {
    guidance.push({ type: 'critical', msg: `${veryStale} published article${veryStale > 1 ? 's' : ''} haven't been updated in 6+ months. Stale content weakens guide authority and search ranking.`, link: '/admin/content/operations#freshness', linkLabel: 'Review stale' })
  }

  // Pipeline bottleneck
  if (readyToPublish > 0) {
    guidance.push({ type: 'info', msg: `${readyToPublish} article${readyToPublish > 1 ? 's' : ''} ${readyToPublish > 1 ? 'are' : 'is'} approved and ready to publish. These are holding up guide freshness.`, link: '/admin/articles/review', linkLabel: 'Publish now' })
  }

  // Expired events still showing
  if (expiredCount > 0) {
    guidance.push({ type: 'warning', msg: `${expiredCount} past event${expiredCount > 1 ? 's' : ''} may still be visible in the guide. Expired events degrade the Things To Do experience.`, link: '/admin/content/calendar', linkLabel: 'Review events' })
  }

  // Seasonal urgency for current month
  SEASONAL_CALENDAR.filter(s => s.months.includes(month) && (s.urgency === 'critical' || s.urgency === 'high')).forEach(s => {
    const guideArticleCount = s.guide ? (articlesByGuide[s.guide]?.count ?? 0) : 1
    if (guideArticleCount === 0 && s.guide) {
      guidance.push({ type: 'critical', msg: `📅 ${s.title}: ${s.guide.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} needs editorial content this month. ${s.desc}`, link: '/admin/content/new', linkLabel: 'Create content' })
    }
  })

  // Sort guidance: critical first
  guidance.sort((a, b) => { const order = { critical: 0, warning: 1, info: 2 }; return order[a.type] - order[b.type] })

  // ── Current + upcoming seasonal items ────────────────────────────────────
  const activeSeasonalItems = SEASONAL_CALENDAR.filter(s =>
    s.months.some(m => {
      // Show if within +/- 1 month of the item's relevant window
      return Math.abs(m - month) <= 1 || (month === 12 && m === 1) || (month === 1 && m === 12)
    })
  )

  // ── Content opportunity gaps ─────────────────────────────────────────────
  const opportunities = GUIDE_CONFIGS
    .filter(g => (articlesByGuide[g.slug]?.count ?? 0) < 2)
    .map(g => ({
      guide: g,
      articleCount: articlesByGuide[g.slug]?.count ?? 0,
      listingCount: listingsByGuide[g.slug] ?? 0,
    }))
    .sort((a, b) => b.listingCount - a.listingCount) // most listings first = most valuable gap

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Link href="/admin/content" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>← Content</Link>
              <span style={{ color: '#d1d5db' }}>›</span>
              <span style={{ fontSize: 12, color: '#374151' }}>Operations</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>Content Operations</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Ecosystem editorial health · {totalPublished} published articles · {GUIDE_CONFIGS.length} guides · {fmtDate(now.toISOString())}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin/content/new"       style={{ fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#1e3a5f', borderRadius: 6 }}>+ New Article</Link>
            <Link href="/admin/content/calendar"  style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>Events Calendar</Link>
            <Link href="/admin/articles/review"   style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>Article Review</Link>
          </div>
        </div>

        {/* ── ECOSYSTEM HEALTH STRIP ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Published',      value: totalPublished,  dot: '#22c55e', sub: 'articles live' },
            { label: 'In Progress',    value: inProgress,      dot: '#8b5cf6', sub: 'draft articles' },
            { label: 'Ready to Pub.',  value: readyToPublish,  dot: '#3b82f6', sub: 'awaiting publish' },
            { label: 'Needs Refresh',  value: needsRefresh,    dot: '#f97316', sub: '>90 days old' },
            { label: 'Very Stale',     value: veryStale,       dot: '#ef4444', sub: '>180 days old' },
            { label: 'Expired Events', value: expiredCount,    dot: '#9ca3af', sub: 'still showing' },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: m.dot, display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 2px' }}>{m.value}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── OPERATOR GUIDANCE ────────────────────────────────────────────── */}
        {guidance.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Action Required · {guidance.length} item{guidance.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guidance.slice(0, 6).map((g, i) => {
                const colors = { critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '🔴' }, warning: { bg: '#fefce8', border: '#fde047', text: '#854d0e', icon: '⚠️' }, info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: 'ℹ️' } }
                const c = colors[g.type]
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 16px', backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                      <p style={{ fontSize: 13, color: c.text, lineHeight: 1.55, margin: 0 }}>{g.msg}</p>
                    </div>
                    <Link href={g.link} style={{ fontSize: 12, fontWeight: 700, color: c.text, textDecoration: 'none', padding: '5px 12px', border: `1px solid ${c.border}`, borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {g.linkLabel} →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Article Pipeline */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Article Pipeline</p>
                <Link href="/admin/articles/review" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>Review queue →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { ...PIPELINE_STAGES[0], count: totalPublished },
                  { ...PIPELINE_STAGES[1], count: needsRefresh },
                  { ...PIPELINE_STAGES[2], count: readyToPublish },
                  { ...PIPELINE_STAGES[3], count: inProgress },
                  { ...PIPELINE_STAGES[4], count: opportunities.length },
                ].map(s => (
                  <div key={s.key} style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: '0 0 4px' }}>{s.count}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Draft articles list */}
              {draftArticles.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>In Progress</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {draftArticles.slice(0, 8).map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title ?? '(untitled)'}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                            {a.guide_slug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            {a.column_slug && ` · ${a.column_slug}`}
                          </p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
                          backgroundColor: a.editorial_review_status === 'approved' ? '#eff6ff' : '#f5f3ff',
                          color:           a.editorial_review_status === 'approved' ? '#1e40af' : '#7c3aed',
                        }}>
                          {a.editorial_review_status === 'approved' ? 'Ready' : (a.editorial_review_status ?? 'Draft')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Guide Content Health */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Guide Content Health</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Sorted by health score — weakest first</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Guide', 'Articles', 'Listings', 'Last Article', 'Freshness', 'Health', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guideHealth.map(row => (
                      <tr key={row.guide.slug} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{row.guide.emoji}</span>
                            <Link href={`/admin/go/partners/guide/${row.guide.slug}`} target="_blank" style={{ fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
                              {row.guide.shortName}
                            </Link>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: row.articleCount === 0 ? '#ef4444' : '#111827' }}>{row.articleCount}</td>
                        <td style={{ padding: '10px 16px', color: '#374151' }}>{row.listingCount}</td>
                        <td style={{ padding: '10px 16px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {row.latestDate ? fmtDate(row.latestDate) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 4, backgroundColor: row.freshness.bg, color: row.freshness.color }}>
                            {row.freshness.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${row.score}%`, backgroundColor: row.score >= 70 ? '#22c55e' : row.score >= 40 ? '#eab308' : '#ef4444', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: row.score >= 70 ? '#166534' : row.score >= 40 ? '#854d0e' : '#991b1b' }}>{row.score}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          <Link href={`/admin/content/new?guide=${row.guide.slug}`} style={{ fontSize: 11, fontWeight: 700, color: '#ef6442', textDecoration: 'none' }}>+ Article</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stale Content Monitor */}
            <div id="freshness" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Freshness Monitor</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Oldest published articles first</p>
              </div>
              <div style={{ padding: '16px 22px' }}>
                {staleArticles.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No published articles found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {staleArticles.map(a => {
                      const dOld   = daysSince(a.published_at, now)
                      const fresh  = freshnessLabel(dOld)
                      return (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: '#f9fafb', border: `1px solid ${dOld > 180 ? '#fca5a5' : dOld > 90 ? '#fed7aa' : '#e5e7eb'}`, borderLeft: `4px solid ${fresh.color}`, borderRadius: 8, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title ?? '(untitled)'}</p>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>{a.guide_slug?.replace(/-/g, ' ')}</span>
                              {a.published_at && <span style={{ fontSize: 11, color: '#9ca3af' }}>Published {fmtDate(a.published_at)}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 4, backgroundColor: fresh.bg, color: fresh.color }}>
                              {dOld < 9999 ? `${dOld}d old` : 'No date'}
                            </span>
                            <Link href={`/admin/articles/${a.id}/edit`} style={{ fontSize: 11, fontWeight: 700, color: '#ef6442', textDecoration: 'none' }}>Refresh →</Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Seasonal Planning Board */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>Seasonal Planning</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                  {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · next 90 days
                </p>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {activeSeasonalItems.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No seasonal focus items for this period.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {activeSeasonalItems.map((s, i) => {
                      const uColor = urgencyColor(s.urgency)
                      const articleCount = s.guide ? (articlesByGuide[s.guide]?.count ?? 0) : 1
                      return (
                        <div key={i} style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: `1px solid #e5e7eb`, borderLeft: `4px solid ${uColor}`, borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ fontSize: 16 }}>{s.icon}</span>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>{s.title}</p>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 3, backgroundColor: `${uColor}15`, color: uColor, flexShrink: 0 }}>
                              {s.urgency}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginBottom: 8 }}>{s.desc}</p>
                          {s.guide && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                {articleCount === 0 ? '⚠ No articles yet' : `${articleCount} article${articleCount > 1 ? 's' : ''} published`}
                              </span>
                              <Link href={`/admin/content/new?guide=${s.guide}`} style={{ fontSize: 11, fontWeight: 700, color: '#ef6442', textDecoration: 'none' }}>
                                + Add →
                              </Link>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Events */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Upcoming Events</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {expiredCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', backgroundColor: '#fef2f2', padding: '2px 9px', borderRadius: 4 }}>{expiredCount} expired</span>}
                  <Link href="/admin/content/calendar" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>Manage →</Link>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {eventsUp.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', margin: '0 0 10px' }}>No upcoming events scheduled.</p>
                    <Link href="/admin/content/calendar" style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', textDecoration: 'none' }}>Add events →</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {eventsUp.map(e => {
                      const days = daysUntil(e.start_date, now)
                      const dColor = days <= 3 ? '#ef4444' : days <= 7 ? '#f97316' : days <= 14 ? '#eab308' : '#22c55e'
                      return (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 6 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title ?? '(untitled event)'}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{fmtDate(e.start_date)}</p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: dColor, flexShrink: 0 }}>
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Content Opportunity Engine */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>Content Opportunities</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Guides with listings but few articles — high editorial impact</p>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {opportunities.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                    <span style={{ fontSize: 20 }}>✓</span>
                    <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>All guides have editorial support. Ecosystem is in good shape.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {opportunities.slice(0, 7).map(op => (
                      <div key={op.guide.slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                          <span style={{ fontSize: 16 }}>{op.guide.emoji}</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{op.guide.shortName}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                              {op.articleCount === 0 ? 'No articles' : `${op.articleCount} article${op.articleCount > 1 ? 's' : ''}`}
                              {op.listingCount > 0 && ` · ${op.listingCount} listings`}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {op.listingCount > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#1e40af', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                              HIGH IMPACT
                            </span>
                          )}
                          <Link href={`/admin/content/new?guide=${op.guide.slug}`} style={{ fontSize: 11, fontWeight: 700, color: '#ef6442', textDecoration: 'none' }}>+ Article</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recurring annual content ideas */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Annual Recurring Content</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      'Best Summer Camps in River Region',
                      'Private School Comparison Guide',
                      'Best Pediatricians — New Family Guide',
                      'After-School Programs: Complete Guide',
                      'Best Playgrounds & Splash Pads',
                      'Family Favorites Nominations',
                      'Back-to-School Healthcare Checklist',
                      'Holiday Family Activities Guide',
                    ].map(idea => (
                      <Link key={idea} href={`/admin/content/new?title=${encodeURIComponent(idea)}`} style={{ fontSize: 11, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '4px 10px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                        {idea}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
