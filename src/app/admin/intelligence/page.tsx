// ── /admin/intelligence ────────────────────────────────────────────────────────
// Ecosystem Intelligence & Executive Command Layer.
// Jason's morning dashboard — operational pulse, ecosystem awareness,
// revenue signals, editorial health, and strategic opportunity surface.
//
// All intelligence derived from real platform data.
// No fabricated precision. No invented metrics. No fake ROI.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { SUBMISSION_TYPES } from '@/lib/submissions'
import { GUIDE_CONFIGS }    from '@/app/partners/guide/configs'
import type {
  SubmissionRow, AdvertiserRow, AITaskRow, MediaAssetRow,
  PartnerLeadRow, ProposalRow,
} from '@/types/db'
import {
  normalizePublication,
  publicationName,
  type PublicationSlug,
} from '@/lib/queries/publications'
import { ACTIVE_LIFECYCLE_STAGES } from '@/lib/queries/advertisers'
import { MetricCard }           from '@/components/admin/MetricCard'
import { PubFilterBar }         from '@/components/admin/PubFilterBar'

export const metadata: Metadata = { title: 'Intelligence — Admin' }

// ── Local-only types (not shared across pages) ────────────────────────────────

interface FFNomination {
  id:         string
  status:     string
  vote_count: number
  created_at: string
}

// ── Static config ─────────────────────────────────────────────────────────────

const HIGH_SHARE_TYPES = new Set([
  'student-spotlight', 'birthday-celebration', 'teacher-of-the-month',
  'mom-to-mom', 'grands-are-the-greatest', 'play-ball',
])

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

// ── Intelligence computation ───────────────────────────────────────────────────

interface RecommendedAction {
  id:       string
  priority: 'urgent' | 'high' | 'medium'
  icon:     string
  title:    string
  detail:   string
  href:     string
  count?:   number
}

interface AIOpportunity {
  icon:     string
  category: string
  headline: string
  detail:   string
  href:     string
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function daysUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
}

function guideStatus(count: number, lastDays: number): 'active' | 'slow' | 'dormant' | 'empty' {
  if (count === 0)          return 'empty'
  if (lastDays > 90)        return 'dormant'
  if (lastDays > 30)        return 'slow'
  return                           'active'
}

function computeRecommendedActions(p: {
  submissions:   SubmissionRow[]
  advertisers:   AdvertiserRow[]
  proposals:     ProposalRow[]
  aiTasks:       AITaskRow[]
  assets:        MediaAssetRow[]
  guideHealth:   Array<{ slug: string; name: string; count: number; lastDays: number; status: string }>
  sponsoredCats: Set<string>
  subTypeCounts: Map<string, number>
}): RecommendedAction[] {
  const { submissions, advertisers, proposals, aiTasks, assets, guideHealth, sponsoredCats, subTypeCounts } = p
  const actions: RecommendedAction[] = []

  // Editorial review backlog
  const pendingReview = submissions.filter(s => s.status === 'needs-review' || s.status === 'new')
  if (pendingReview.length > 0) {
    actions.push({
      id: 'editorial-backlog', priority: pendingReview.length >= 10 ? 'urgent' : 'high',
      icon: '📋',
      title: `${pendingReview.length} submission${pendingReview.length !== 1 ? 's' : ''} need editorial review`,
      detail: 'Community contributors submitted content waiting in queue. Respond before interest cools.',
      href: '/admin/community', count: pendingReview.length,
    })
  }

  // AI tasks awaiting human review (safety invariant — always surface this)
  const aiPending = aiTasks.filter(t => t.status === 'completed' || t.status === 'needs_review')
  if (aiPending.length > 0) {
    actions.push({
      id: 'ai-pending', priority: aiPending.length >= 5 ? 'urgent' : 'high',
      icon: '🤖',
      title: `${aiPending.length} AI task${aiPending.length !== 1 ? 's' : ''} awaiting human review`,
      detail: 'AI output must be reviewed and approved before use anywhere in the platform.',
      href: '/admin/ai-tasks', count: aiPending.length,
    })
  }

  // Proposals expiring within 7 days
  const expiringProposals = proposals.filter(p => {
    if (p.status !== 'sent' && p.status !== 'viewed') return false
    if (!p.expires_at) return false
    const d = daysUntil(p.expires_at)
    return d >= 0 && d <= 7
  })
  if (expiringProposals.length > 0) {
    actions.push({
      id: 'proposals-expiring', priority: 'urgent',
      icon: '⏰',
      title: `${expiringProposals.length} proposal${expiringProposals.length !== 1 ? 's' : ''} expiring within 7 days`,
      detail: 'Follow up before the window closes — a viewed proposal has real intent signal.',
      href: '/admin/proposals', count: expiringProposals.length,
    })
  }

  // At-risk advertisers
  const atRisk = advertisers.filter(a => a.at_risk_flagged_at)
  if (atRisk.length > 0) {
    actions.push({
      id: 'at-risk', priority: 'urgent',
      icon: '🚨',
      title: `${atRisk.length} advertiser${atRisk.length !== 1 ? 's' : ''} flagged at-risk`,
      detail: 'These accounts show churn or non-renewal signals. Personal outreach is the intervention.',
      href: '/admin/advertisers', count: atRisk.length,
    })
  }

  // Upgrade-ready advertisers
  const upgradeReady = advertisers.filter(a => a.lifecycle_stage === 'upgrade-ready' || a.upgrade_flagged_at)
  if (upgradeReady.length > 0) {
    actions.push({
      id: 'upgrade-ready', priority: 'high',
      icon: '⬆️',
      title: `${upgradeReady.length} advertiser${upgradeReady.length !== 1 ? 's' : ''} ready for tier upgrade`,
      detail: 'These accounts show engagement signals and fit for a higher package. Good time for an upgrade conversation.',
      href: '/admin/advertisers/pipeline', count: upgradeReady.length,
    })
  }

  // Social approved but not exported
  const socialUnexported = submissions.filter(s => s.approved_social && !s.exported_to_social_planner)
  if (socialUnexported.length >= 3) {
    actions.push({
      id: 'social-export', priority: 'medium',
      icon: '📱',
      title: `${socialUnexported.length} approved social posts not yet exported to planner`,
      detail: 'Content cleared for social is queued and waiting. A quick export session keeps momentum.',
      href: '/admin/distribution/social-export', count: socialUnexported.length,
    })
  }

  // Newsletter items without teasers
  const noTeaser = submissions.filter(s => s.newsletter_include && !s.newsletter_teaser)
  if (noTeaser.length >= 3) {
    actions.push({
      id: 'newsletter-teasers', priority: 'medium',
      icon: '📧',
      title: `${noTeaser.length} newsletter items missing teasers`,
      detail: 'These will export with empty descriptions. Add teasers in the Approval Desk.',
      href: '/admin/editorial/approval', count: noTeaser.length,
    })
  }

  // Dormant seasonal guides
  const dormantSeasonal = guideHealth.filter(g => {
    const gc = GUIDE_CONFIGS.find(c => c.slug === g.slug)
    return (g.status === 'dormant' || g.status === 'empty') && gc?.urgency === 'seasonal'
  })
  if (dormantSeasonal.length > 0) {
    actions.push({
      id: 'dormant-guides', priority: 'medium',
      icon: '📖',
      title: `${dormantSeasonal.length} seasonal guide${dormantSeasonal.length !== 1 ? 's' : ''} need content before the season peaks`,
      detail: `Dormant seasonal guides miss families actively planning. Content now captures the window.`,
      href: '/admin/guides', count: dormantSeasonal.length,
    })
  }

  // High-participation type with no sponsor
  const topGap = [...subTypeCounts.entries()]
    .filter(([type]) => {
      const cat = TYPE_TO_SPONSOR_CATEGORY[type]
      return cat && !sponsoredCats.has(cat)
    })
    .sort((a, b) => b[1] - a[1])[0]
  if (topGap && topGap[1] >= 5) {
    const tc = SUBMISSION_TYPES.find(t => t.type === topGap[0])
    actions.push({
      id: 'sponsor-gap', priority: 'medium',
      icon: '💰',
      title: `${tc?.label ?? topGap[0]} is active with no sponsor — revenue opportunity`,
      detail: `${topGap[1]} total submissions. A sponsor here would reach a warm, engaged audience.`,
      href: '/admin/advertisers/pipeline',
    })
  }

  // Assets with no permission confirmed
  const noPermission = assets.filter(a => !a.permission_confirmed && a.content_category !== 'sponsor')
  if (noPermission.length >= 5) {
    actions.push({
      id: 'asset-permission', priority: 'medium',
      icon: '🔒',
      title: `${noPermission.length} media assets missing permission confirmation`,
      detail: 'School photos and personal images need permission confirmed before publishing.',
      href: '/admin/assets?view=readiness', count: noPermission.length,
    })
  }

  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2 }
  return actions
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 8)
}

function computeAIOpportunities(p: {
  submissions:   SubmissionRow[]
  guideHealth:   Array<{ slug: string; name: string; emoji: string; count: number; lastDays: number; status: string }>
  advertisers:   AdvertiserRow[]
  subTypeCounts: Map<string, number>
  sponsoredCats: Set<string>
  month:         number
}): AIOpportunity[] {
  const { submissions, guideHealth, advertisers, subTypeCounts, sponsoredCats, month } = p
  const opps: AIOpportunity[] = []

  // High-share posts ready but not amplified
  const highShareReady = submissions.filter(s =>
    HIGH_SHARE_TYPES.has(s.submission_type) && s.status === 'approved' && !s.exported_to_social_planner
  )
  if (highShareReady.length > 0) {
    opps.push({
      icon: '📱', category: 'Content',
      headline: `${highShareReady.length} high-share post${highShareReady.length !== 1 ? 's' : ''} ready for social amplification.`,
      detail: 'Student spotlights and community recognition posts perform significantly above average. These are waiting.',
      href: '/admin/distribution/social-export',
    })
  }

  // Dormant guide near seasonal peak
  const isSummerApproach = month >= 3 && month <= 5 // April–June → summer approaching
  const isBackToSchool   = month >= 6 && month <= 7 // July–Aug
  const isHoliday        = month >= 9 && month <= 10 // Oct–Nov

  const dormantGuide = guideHealth.find(g => g.status === 'dormant' || g.status === 'empty')
  if (dormantGuide) {
    opps.push({
      icon: '📖', category: 'Content',
      headline: `${dormantGuide.emoji} ${dormantGuide.name} hasn't been updated in ${dormantGuide.lastDays === 999 ? 'a long time' : `${dormantGuide.lastDays} days`}.`,
      detail: 'Active guides drive recurring readership and sponsor value. A content push here has compounding returns.',
      href: `/admin/guides`,
    })
  }

  // Sponsor gap in top category
  const topGap = [...subTypeCounts.entries()]
    .filter(([type]) => {
      const cat = TYPE_TO_SPONSOR_CATEGORY[type]
      return cat && !sponsoredCats.has(cat)
    })
    .sort((a, b) => b[1] - a[1])[0]
  if (topGap) {
    const cat = TYPE_TO_SPONSOR_CATEGORY[topGap[0]]
    const tc  = SUBMISSION_TYPES.find(t => t.type === topGap[0])
    opps.push({
      icon: '💡', category: 'Revenue',
      headline: `${tc?.label ?? topGap[0]} activity is high. The ${cat} sponsor category is open.`,
      detail: 'Strong community participation signals audience interest. A local sponsor here would reach families already engaged.',
      href: '/admin/advertisers/pipeline',
    })
  }

  // Seasonal awareness
  if (isSummerApproach) {
    opps.push({
      icon: '☀️', category: 'Seasonal',
      headline: 'Summer planning season is approaching. Camp and activity content has peak relevance now.',
      detail: 'Families research summer programs in spring. Fresh camp guide content and sponsor placements capture this window.',
      href: '/admin/guides',
    })
  } else if (isBackToSchool) {
    opps.push({
      icon: '🏫', category: 'Seasonal',
      headline: 'Back-to-school season is the highest teacher nomination period of the year.',
      detail: 'Teacher of the Month submissions peak in August–September. Promote the form now to capture the season.',
      href: '/submit/teacher-of-the-month',
    })
  } else if (isHoliday) {
    opps.push({
      icon: '🎄', category: 'Seasonal',
      headline: 'Holiday season is approaching. Family events and gift guide content drives strong engagement.',
      detail: 'Local event submissions and Family Favorites activity typically spike in November. Plan content and sponsor placements now.',
      href: '/admin/engagement',
    })
  }

  // Newsletter growth moment
  const subThankYouOpportunity = submissions.filter(s => s.status === 'published').length
  if (subThankYouOpportunity > 10) {
    opps.push({
      icon: '📧', category: 'Audience',
      headline: 'Published community content creates newsletter signup opportunities.',
      detail: 'Families whose submissions have gone live are the highest-trust newsletter signup moment in the platform.',
      href: '/admin/engagement?view=email',
    })
  }

  // Upgrade conversation opportunity
  const renewalAdv = advertisers.filter(a => {
    if (!a.contract_end_date) return false
    const d = daysUntil(a.contract_end_date)
    return d >= 0 && d <= 60
  })
  if (renewalAdv.length > 0) {
    opps.push({
      icon: '🤝', category: 'Revenue',
      headline: `${renewalAdv.length} advertiser${renewalAdv.length !== 1 ? 's' : ''} approaching renewal within 60 days.`,
      detail: 'Renewal conversations that include an upgrade offer close at a higher rate than renewal-only conversations.',
      href: '/admin/advertisers/pipeline',
    })
  }

  return opps.slice(0, 6)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ pub?: string }>
}) {
  const { pub: rawPub } = await searchParams
  const filterPub = normalizePublication(rawPub)

  const supabase = await createClient()

  const now     = new Date()
  const hour    = now.getHours()
  const month   = now.getMonth() // 0-indexed
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Working late'

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  // ── 10 parallel queries (publication filter applied where relevant) ───────────

  // Submission query applies pub filter; advertiser/asset queries are global
  let subQuery = supabase
    .from('community_submissions')
    .select('id, submission_type, status, ai_draft_status, approved_social, approved_newsletter, social_queue, newsletter_include, newsletter_teaser, caption_facebook, social_planner_ready, exported_to_social_planner, image_status, target_publication, created_at, updated_at')
    .not('status', 'in', '("archived","rejected","published")')
    .order('created_at', { ascending: false })
    .limit(500)
  if (filterPub) subQuery = subQuery.eq('target_publication', filterPub)

  const [
    { data: rawAdv },
    { data: rawProposals },
    { data: rawSubs },
    { data: rawArticles },
    { data: rawAITasks },
    { data: rawAssets },
    { data: rawSubCount },
    { data: rawLeads },
    { data: rawFFNoms },
    { data: rawAdPlacements },
  ] = await Promise.all([
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, lifecycle_stage, package_tier, loyalty_tier, upgrade_flagged_at, at_risk_flagged_at, sponsor_category_slug, contract_end_date')
      .limit(500),
    supabase
      .from('proposals')
      .select('id, business_name, token_slug, status, viewed_count, sent_at, accepted_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(100),
    subQuery,
    supabase
      .from('guide_articles')
      .select('guide_slug, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('ai_tasks')
      .select('id, task_type, status, priority, created_at')
      .not('status', 'in', '("approved","rejected","canceled")')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('media_assets')
      .select('status, needs_canva_graphic, permission_confirmed, alt_text, content_category')
      .neq('status', 'archived')
      .limit(500),
    supabase
      .from('newsletter_subscribers')
      .select('publication_slug, is_subscribed, created_at')
      .eq('is_subscribed', true)
      .limit(5000),
    supabase
      .from('partner_leads')
      .select('id, advertiser_id, created_at, partner_marked_converted, partner_last_action_at')
      .gte('created_at', yesterday.slice(0, 10))
      .limit(200),
    supabase
      .from('ff_nominations')
      .select('id, status, vote_count, created_at')
      .limit(500),
    supabase
      .from('ad_placements')
      .select('id, impression_count, click_count, is_active')
      .eq('is_active', true)
      .limit(100),
  ])

  const advertisers  = (rawAdv        ?? []) as unknown as AdvertiserRow[]
  const proposals    = (rawProposals  ?? []) as unknown as ProposalRow[]
  const submissions  = (rawSubs       ?? []) as unknown as SubmissionRow[]
  const articles     = (rawArticles   ?? []) as Array<{ guide_slug: string; created_at: string }>
  const aiTasks      = (rawAITasks    ?? []) as unknown as AITaskRow[]
  const assets       = (rawAssets     ?? []) as unknown as MediaAssetRow[]
  const subscribers  = (rawSubCount   ?? []) as Array<{ publication_slug: string; created_at: string }>
  const leads24h     = (rawLeads      ?? []) as unknown as PartnerLeadRow[]
  const ffNoms       = (rawFFNoms     ?? []) as unknown as FFNomination[]
  const adPlacements = (rawAdPlacements ?? []) as Array<{ impression_count: number; click_count: number }>

  const activeStagesSet = new Set<string>([...ACTIVE_LIFECYCLE_STAGES])

  // ── Computed: advertiser intelligence ────────────────────────────────────

  const activeAdv    = advertisers.filter(a => activeStagesSet.has(a.lifecycle_stage))
  const upgradeReady = advertisers.filter(a => a.lifecycle_stage === 'upgrade-ready' || !!a.upgrade_flagged_at)
  const atRisk       = advertisers.filter(a => !!a.at_risk_flagged_at)
  const sponsoredCats = new Set(
    advertisers
      .filter(a => activeStagesSet.has(a.lifecycle_stage) && a.sponsor_category_slug)
      .map(a => a.sponsor_category_slug!)
  )
  const renewalSoon = advertisers.filter(a => {
    if (!a.contract_end_date) return false
    const d = daysUntil(a.contract_end_date)
    return d >= 0 && d <= 60
  })

  // ── Computed: editorial intelligence ─────────────────────────────────────

  const pendingReview     = submissions.filter(s => s.status === 'needs-review' || s.status === 'new')
  const inProgress        = submissions.filter(s => ['in-progress', 'in-editing', 'ai-draft-ready'].includes(s.status))
  const readyToPublish    = submissions.filter(s => s.status === 'approved' || s.status === 'scheduled')
  const socialUnexported  = submissions.filter(s => s.approved_social && !s.exported_to_social_planner)
  const socialReady       = submissions.filter(s => s.approved_social)
  const newsletterReady   = submissions.filter(s => s.newsletter_include)
  const noTeaser          = submissions.filter(s => s.newsletter_include && !s.newsletter_teaser)
  const highShareReady    = submissions.filter(s => HIGH_SHARE_TYPES.has(s.submission_type))
  const aiPending         = aiTasks.filter(t => t.status === 'completed' || t.status === 'needs_review')
  const aiFailed          = aiTasks.filter(t => t.status === 'failed')

  // Submission type counts (all-time from current queue)
  const subTypeCounts = new Map<string, number>()
  for (const s of submissions) {
    subTypeCounts.set(s.submission_type, (subTypeCounts.get(s.submission_type) ?? 0) + 1)
  }
  const topSubmissionType = [...subTypeCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  // ── Computed: guide intelligence ─────────────────────────────────────────

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
    const stat    = guideArticleMap.get(g.slug)
    const lastDays = stat ? daysSince(stat.latest) : 999
    return {
      slug: g.slug, name: g.name, emoji: g.emoji,
      count: stat?.count ?? 0,
      lastDays,
      status: guideStatus(stat?.count ?? 0, lastDays),
    }
  }).sort((a, b) => b.count - a.count)

  const activeGuides  = guideHealth.filter(g => g.status === 'active').length
  const dormantGuides = guideHealth.filter(g => g.status === 'dormant' || g.status === 'empty').length

  // ── Computed: asset intelligence ─────────────────────────────────────────

  const assetsNeedDesign      = assets.filter(a => a.needs_canva_graphic).length
  const assetsNeedPermission  = assets.filter(a => !a.permission_confirmed).length
  const assetsNeedAlt         = assets.filter(a => !a.alt_text).length
  const totalAssets           = assets.length

  // ── Computed: audience intelligence ──────────────────────────────────────

  const totalSubscribers = subscribers.length
  const newSubs24h       = subscribers.filter(s => s.created_at >= yesterday).length
  const totalImpressions = adPlacements.reduce((sum, a) => sum + (a.impression_count ?? 0), 0)
  const totalClicks      = adPlacements.reduce((sum, a) => sum + (a.click_count ?? 0), 0)
  const ffActive         = ffNoms.filter(n => n.status === 'approved' || n.status === 'finalist').length
  const ffPending        = ffNoms.filter(n => n.status === 'pending').length
  const leadsYesterday   = leads24h.length

  // ── Computed: proposals intelligence ─────────────────────────────────────

  const proposalsSent     = proposals.filter(p => p.status === 'sent')
  const proposalsViewed   = proposals.filter(p => p.viewed_count > 0 && p.status === 'sent')
  const proposalsExpiring = proposals.filter(p => {
    if (!p.expires_at || (p.status !== 'sent' && p.status !== 'viewed')) return false
    const d = daysUntil(p.expires_at)
    return d >= 0 && d <= 7
  })
  const proposalsAccepted = proposals.filter(p => p.status === 'accepted').length

  // ── Ecosystem health score (0–100) ────────────────────────────────────────

  const guideScore       = Math.round((activeGuides / Math.max(GUIDE_CONFIGS.length, 1)) * 100)
  const editorialScore   = pendingReview.length < 5 ? 100 : pendingReview.length < 15 ? 60 : 30
  const revenueScore     = Math.round((activeAdv.length / Math.max(advertisers.length, 1)) * 100)
  const ecosystemScore   = Math.round((guideScore + editorialScore + revenueScore) / 3)
  const ecosystemColor   = ecosystemScore >= 70 ? '#16a34a' : ecosystemScore >= 45 ? '#d97706' : '#ef4444'

  // ── Sponsor gap analysis ──────────────────────────────────────────────────

  const sponsorGaps = [...new Set(Object.values(TYPE_TO_SPONSOR_CATEGORY))]
    .filter(cat => !sponsoredCats.has(cat))
    .slice(0, 4)

  // ── Recommended actions ───────────────────────────────────────────────────

  const recommendedActions = computeRecommendedActions({
    submissions, advertisers, proposals, aiTasks, assets,
    guideHealth, sponsoredCats, subTypeCounts,
  })

  // ── AI opportunity cards ──────────────────────────────────────────────────

  const aiOpportunities = computeAIOpportunities({
    submissions, guideHealth, advertisers, subTypeCounts, sponsoredCats, month,
  })

  // ── Render ────────────────────────────────────────────────────────────────

  const PRIORITY_STYLE = {
    urgent: { bar: '#dc2626', bg: 'bg-red-50',   border: 'border-red-100',   label: 'bg-red-100 text-red-700'   },
    high:   { bar: '#d97706', bg: 'bg-portal-amber-lt', border: 'border-amber-100', label: 'bg-portal-amber-lt text-portal-amber'},
    medium: { bar: '#2563eb', bg: 'bg-portal-blue-lt',  border: 'border-portal-blue/20',  label: 'bg-portal-blue-lt text-portal-blue' },
  }

  return (
    <main className="min-h-screen pb-20">

      {/* ── Greeting header ─────────────────────────────────────────────── */}
      <div className="px-6 py-8" style={{ backgroundColor: '#1a2744' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">{dateLabel}</p>
              <h1 className="text-3xl font-bold text-white tracking-tight">{greeting}, Jason.</h1>
              <p className="text-white/50 text-sm mt-1">
                {filterPub ? publicationName(filterPub) : 'All Publications'} · Ecosystem Intelligence
              </p>
              <PubFilterBar
                activePub={filterPub}
                makeHref={p => p ? `/admin/intelligence?pub=${p}` : '/admin/intelligence'}
                variant="dark"
                className="mt-3"
              />
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold" style={{ color: ecosystemColor }}>{ecosystemScore}</p>
              <p className="text-white/40 text-xs mt-0.5">Ecosystem health</p>
            </div>
          </div>

          {/* Pulse strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
            {([
              { label: 'Active Partners', val: activeAdv.length,        color: '#22c55e', sub: `${renewalSoon.length} renewing soon`,           href: '/admin/advertisers' },
              { label: 'Upgrade Ready',   val: upgradeReady.length,     color: '#f59e0b', sub: atRisk.length > 0 ? `${atRisk.length} at-risk` : 'no at-risk', href: '/admin/advertisers/pipeline' },
              { label: 'Editorial Queue', val: pendingReview.length,    color: pendingReview.length > 10 ? '#ef4444' : '#60a5fa', sub: `${inProgress.length} in progress`, href: '/admin/community' },
              { label: 'Social Ready',    val: socialUnexported.length, color: '#a78bfa', sub: `${socialReady.length} approved`,                href: '/admin/distribution/social-export' },
              { label: 'Subscribers',     val: totalSubscribers,        color: '#34d399', sub: newSubs24h > 0 ? `+${newSubs24h} today` : 'all publications' },
              { label: 'AI Pending',      val: aiPending.length,        color: aiPending.length > 0 ? '#fb923c' : '#6b7280', sub: 'awaiting review', href: '/admin/ai-tasks' },
            ] as const).map((m) => (
              <MetricCard key={m.label} label={String(m.label)} value={m.val} color={m.color} sub={m.sub} href={'href' in m ? m.href : undefined} variant="dark" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-6 max-w-[1200px] mx-auto space-y-8">

        {/* ── Recommended Actions ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-bold text-portal-text">Recommended Actions</h2>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-portal-muted">{recommendedActions.length} items</span>
          </div>

          {recommendedActions.length === 0 ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl px-6 py-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-semibold text-green-800">No urgent actions — ecosystem is in good shape.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recommendedActions.map(action => {
                const style = PRIORITY_STYLE[action.priority]
                return (
                  <div
                    key={action.id}
                    className={`relative ${style.bg} border ${style.border} rounded-xl overflow-hidden`}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: style.bar }}
                    />
                    <div className="pl-5 pr-4 py-3.5 flex items-start gap-3">
                      <span className="text-xl mt-0.5 shrink-0">{action.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-portal-text flex-1">{action.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${style.label}`}>
                            {action.priority}
                          </span>
                        </div>
                        <p className="text-xs text-portal-sub mt-0.5 leading-relaxed">{action.detail}</p>
                      </div>
                      <Link
                        href={action.href}
                        className="text-xs font-bold text-portal-sub hover:text-portal-text shrink-0 pt-0.5 hover:underline"
                      >
                        Go →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 2-col: Revenue + Editorial ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue Intelligence */}
          <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-portal-text">Revenue Intelligence</h2>
              <Link href="/admin/advertisers" className="text-xs text-indigo-600 hover:underline font-semibold">Advertisers →</Link>
            </div>
            <div className="p-5 space-y-4">

              {/* Key revenue numbers */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Active',    val: activeAdv.length,    color: '#16a34a' },
                  { label: 'Upgrading', val: upgradeReady.length, color: '#d97706' },
                  { label: 'At-Risk',   val: atRisk.length,       color: atRisk.length > 0 ? '#dc2626' : '#9ca3af' },
                ] as const).map(({ label, val, color }) => (
                  <div key={label} className="text-center bg-portal-bg rounded-xl py-3">
                    <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                    <p className="text-[11px] text-portal-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Proposals */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Proposals</p>
                <div className="space-y-1.5">
                  {proposalsSent.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Open / sent</span>
                      <span className="font-semibold text-portal-text">{proposalsSent.length}</span>
                    </div>
                  )}
                  {proposalsViewed.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Viewed (intent signal)</span>
                      <span className="font-semibold text-amber-600">{proposalsViewed.length}</span>
                    </div>
                  )}
                  {proposalsExpiring.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Expiring ≤7 days</span>
                      <span className="font-semibold text-portal-red">{proposalsExpiring.length}</span>
                    </div>
                  )}
                  {proposalsAccepted > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Accepted</span>
                      <span className="font-semibold text-green-600">{proposalsAccepted}</span>
                    </div>
                  )}
                  {proposals.length === 0 && (
                    <p className="text-xs text-portal-muted">No proposals yet.</p>
                  )}
                </div>
              </div>

              {/* Sponsor coverage gaps */}
              {sponsorGaps.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Unsponsored Category Gaps</p>
                  <div className="space-y-1">
                    {sponsorGaps.map(cat => (
                      <div key={cat} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span className="text-portal-sub truncate font-mono text-[11px]">{cat}</span>
                        <span className="text-red-500 font-semibold shrink-0">No sponsor</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Renewal window */}
              {renewalSoon.length > 0 && (
                <div className="bg-portal-amber-lt border border-amber-100 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-portal-amber font-semibold">{renewalSoon.length} partner{renewalSoon.length !== 1 ? 's' : ''} renewing within 60 days</p>
                  <div className="mt-1 space-y-0.5">
                    {renewalSoon.slice(0, 3).map(a => (
                      <p key={a.id} className="text-[11px] text-portal-amber truncate">
                        {a.business_name} — ends {a.contract_end_date}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Ad placement signals */}
              {totalImpressions > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-1.5">Ad Placement Activity</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-portal-sub">{totalImpressions.toLocaleString()} impressions</span>
                    <span className="text-portal-muted">·</span>
                    <span className="text-portal-sub">{totalClicks.toLocaleString()} clicks</span>
                    {totalImpressions > 0 && (
                      <>
                        <span className="text-portal-muted">·</span>
                        <span className="font-semibold text-indigo-600">{((totalClicks / totalImpressions) * 100).toFixed(1)}% CTR</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Editorial Intelligence */}
          <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-portal-text">Editorial Intelligence</h2>
              <Link href="/admin/community" className="text-xs text-indigo-600 hover:underline font-semibold">Community →</Link>
            </div>
            <div className="p-5 space-y-4">

              {/* Queue status */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Pending',    val: pendingReview.length, color: pendingReview.length > 5 ? '#ef4444' : '#374151' },
                  { label: 'In Work',    val: inProgress.length,    color: '#2563eb' },
                  { label: 'Ready',      val: readyToPublish.length, color: '#16a34a' },
                ] as const).map(({ label, val, color }) => (
                  <div key={label} className="text-center bg-portal-bg rounded-xl py-3">
                    <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                    <p className="text-[11px] text-portal-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Distribution readiness */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Distribution Readiness</p>
                <div className="space-y-2">
                  {[
                    { label: 'Social approved', val: socialReady.length,       suffix: `${socialUnexported.length} not yet exported`, color: '#7c3aed' },
                    { label: 'Newsletter lined up', val: newsletterReady.length, suffix: noTeaser.length > 0 ? `${noTeaser.length} need teasers` : 'all have teasers', color: '#0891b2' },
                    { label: 'High-share content', val: highShareReady.length, suffix: 'in active queue', color: '#ec4899' },
                  ].map(({ label, val, suffix, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-portal-text flex-1">{label}</span>
                      <span className="text-xs font-bold text-portal-text">{val}</span>
                      <span className="text-[10px] text-portal-muted shrink-0">{suffix}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guide health */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Guide Health</p>
                <div className="space-y-1.5">
                  {guideHealth.slice(0, 6).map(g => {
                    const statusColor =
                      g.status === 'active'  ? '#16a34a' :
                      g.status === 'slow'    ? '#d97706' :
                      g.status === 'dormant' ? '#f97316' : '#ef4444'
                    return (
                      <div key={g.slug} className="flex items-center gap-2">
                        <span className="text-sm shrink-0">{g.emoji}</span>
                        <span className="text-xs text-portal-sub flex-1 truncate">{g.name}</span>
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: statusColor }}>
                          {g.count} articles
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                          style={{ backgroundColor: statusColor + '20', color: statusColor }}
                        >
                          {g.status}
                        </span>
                      </div>
                    )
                  })}
                  {dormantGuides > 0 && (
                    <Link href="/admin/engagement?view=content" className="text-[11px] text-indigo-500 hover:underline">
                      {dormantGuides} guide{dormantGuides !== 1 ? 's' : ''} dormant or empty →
                    </Link>
                  )}
                </div>
              </div>

              {/* AI task summary */}
              {(aiPending.length > 0 || aiFailed.length > 0) && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-orange-800 mb-1">AI Task Queue</p>
                  <div className="flex gap-4 text-[11px] text-orange-700">
                    {aiPending.length > 0 && <span>{aiPending.length} awaiting human review</span>}
                    {aiFailed.length > 0  && <span>{aiFailed.length} failed</span>}
                  </div>
                  <Link href="/admin/ai-tasks" className="text-[11px] text-orange-600 font-semibold hover:underline mt-0.5 block">
                    Review AI queue →
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── 2-col: Operational + Audience ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Operational Intelligence */}
          <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-portal-text">Operational Intelligence</h2>
              <Link href="/admin/assets" className="text-xs text-indigo-600 hover:underline font-semibold">Assets →</Link>
            </div>
            <div className="p-5 space-y-4">

              {/* Asset readiness */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Asset Readiness ({totalAssets} total)</p>
                <div className="space-y-2">
                  {[
                    { label: 'Need design/Canva work', val: assetsNeedDesign,     color: '#ea580c', href: '/admin/assets?view=design'     },
                    { label: 'Missing permission',     val: assetsNeedPermission, color: '#dc2626', href: '/admin/assets?view=readiness'  },
                    { label: 'Missing alt text',       val: assetsNeedAlt,        color: '#d97706', href: '/admin/assets?view=readiness'  },
                  ].map(({ label, val, color, href }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: totalAssets > 0 ? `${Math.min((val / totalAssets) * 100, 100)}%` : '0%', backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[11px] font-bold w-6 text-right" style={{ color }}>{val}</span>
                      <Link href={href} className="text-[11px] text-portal-muted hover:text-indigo-600 hover:underline truncate max-w-[120px]">
                        {label}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow bottlenecks */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Workflow Bottlenecks</p>
                <div className="space-y-2">
                  {pendingReview.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Editorial review queue</span>
                      <Link href="/admin/community" className="font-semibold text-portal-red hover:underline">{pendingReview.length} waiting</Link>
                    </div>
                  )}
                  {noTeaser.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Newsletter teasers needed</span>
                      <Link href="/admin/editorial/approval" className="font-semibold text-amber-600 hover:underline">{noTeaser.length} items</Link>
                    </div>
                  )}
                  {socialUnexported.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-portal-sub">Social export pending</span>
                      <Link href="/admin/distribution/social-export" className="font-semibold text-purple-600 hover:underline">{socialUnexported.length} ready</Link>
                    </div>
                  )}
                  {pendingReview.length === 0 && noTeaser.length === 0 && socialUnexported.length === 0 && (
                    <p className="text-xs text-portal-muted">No workflow bottlenecks detected.</p>
                  )}
                </div>
              </div>

              {/* Distribution summary */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Quick Navigation</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '📋 Editorial',    href: '/admin/editorial'              },
                    { label: '📱 Social Export', href: '/admin/distribution/social-export'},
                    { label: '📧 Newsletter',    href: '/admin/distribution?view=newsletter'},
                    { label: '🖼️ Assets',       href: '/admin/assets'                },
                    { label: '🤖 AI Tasks',     href: '/admin/ai-tasks'              },
                    { label: '📊 Engagement',   href: '/admin/engagement'            },
                  ].map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className="text-[11px] font-semibold text-portal-sub hover:text-portal-text hover:bg-portal-bg px-3 py-2 rounded-lg border border-gray-100 hover:border-portal-border transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Audience Intelligence */}
          <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-portal-text">Audience Intelligence</h2>
              <Link href="/admin/engagement" className="text-xs text-indigo-600 hover:underline font-semibold">Engagement →</Link>
            </div>
            <div className="p-5 space-y-4">

              {/* Newsletter growth */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Newsletter Audience</p>
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-3xl font-bold text-portal-text">{totalSubscribers.toLocaleString()}</p>
                    <p className="text-[11px] text-portal-muted">subscribers across all publications</p>
                  </div>
                  {newSubs24h > 0 && (
                    <span className="text-sm font-bold text-green-600 mb-0.5">+{newSubs24h} today</span>
                  )}
                </div>
              </div>

              {/* Participation signals */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Participation Signals (Active Queue)</p>
                <div className="space-y-2">
                  {[...subTypeCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([type, count]) => {
                      const tc    = SUBMISSION_TYPES.find(t => t.type === type)
                      const isHS  = HIGH_SHARE_TYPES.has(type)
                      const maxVal = [...subTypeCounts.values()].reduce((a, b) => Math.max(a, b), 1)
                      const pct   = Math.round((count / maxVal) * 100)
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-base w-5 shrink-0">{tc?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <p className="text-[11px] font-semibold text-portal-text truncate">{tc?.shortLabel ?? type}</p>
                              {isHS && <span className="text-[9px] bg-pink-100 text-pink-600 px-1 rounded font-bold shrink-0">🔥</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="h-1 rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-portal-sub w-4 text-right">{count}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  {subTypeCounts.size === 0 && (
                    <p className="text-xs text-portal-muted">No active submissions in queue.</p>
                  )}
                </div>
              </div>

              {/* Family Favorites */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-2">Family Favorites</p>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-500">{ffActive + ffPending}</p>
                    <p className="text-[10px] text-portal-muted">nominations</p>
                  </div>
                  {ffPending > 0 && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-amber-500">{ffPending}</p>
                      <p className="text-[10px] text-portal-muted">pending review</p>
                    </div>
                  )}
                </div>
                <Link href="/admin/family-favorites" className="text-[11px] text-indigo-500 hover:underline mt-1 block">
                  Manage Family Favorites →
                </Link>
              </div>

              {/* Leads yesterday */}
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wide mb-1.5">Partner Leads (Last 24h)</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold" style={{ color: leadsYesterday > 0 ? '#16a34a' : '#9ca3af' }}>
                    {leadsYesterday}
                  </p>
                  <p className="text-xs text-portal-sub">new lead{leadsYesterday !== 1 ? 's' : ''} from partner engine</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── AI Opportunity Layer ─────────────────────────────────────── */}
        {aiOpportunities.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <h2 className="text-base font-bold text-portal-text">Strategic Opportunities</h2>
              </div>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-portal-muted">Data-derived · Not AI-generated yet</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiOpportunities.map((opp, i) => {
                const catColors: Record<string, string> = {
                  Content:  '#2563eb',
                  Revenue:  '#16a34a',
                  Seasonal: '#d97706',
                  Audience: '#7c3aed',
                }
                const color = catColors[opp.category] ?? '#374151'
                return (
                  <Link
                    key={i}
                    href={opp.href}
                    className="block bg-white border border-gray-100 rounded-2xl p-5 hover:border-portal-border hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{opp.icon}</span>
                      <div className="min-w-0">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide"
                          style={{ color }}
                        >
                          {opp.category}
                        </span>
                        <p className="text-sm font-semibold text-portal-text mt-0.5 leading-snug group-hover:text-portal-text">
                          {opp.headline}
                        </p>
                        <p className="text-xs text-portal-muted mt-1.5 leading-relaxed">{opp.detail}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Future AI layer placeholder ──────────────────────────────── */}
        <section className="bg-portal-bg border border-gray-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-lg">🔮</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-portal-sub mb-1">AI Intelligence Layer — Coming Soon</p>
              <p className="text-xs text-portal-muted leading-relaxed mb-3">
                These cards will be driven by Claude-powered pattern analysis once wired — not autonomous agents,
                but intelligent surface of signals already in the platform.
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  'Identify viral local stories',
                  'Suggest engagement campaigns',
                  'Detect seasonal interest spikes',
                  'Flag newsletter growth opportunities',
                  'Recommend participation pushes',
                  'Surface advertiser outreach timing',
                ].map(label => (
                  <span key={label} className="text-[10px] px-2.5 py-1 border border-portal-border rounded-lg text-portal-muted flex items-center gap-1">
                    {label}
                    <span className="bg-gray-100 text-portal-muted text-[9px] px-1 rounded font-semibold">Soon</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
