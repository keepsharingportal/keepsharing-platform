// src/lib/queries/operations.ts
// Aggregated daily operations snapshot for /admin/today.
// All sub-queries run in parallel via Promise.allSettled — a single slow or
// missing table never blocks the entire dashboard from rendering.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  STALL_THRESHOLD_HOURS,
  RENEWAL_URGENT_DAYS,
  RENEWAL_WARNING_DAYS,
} from '@/lib/operations/routing'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OpsQueueItem {
  id:       string
  label:    string
  sub?:     string    // submission type or secondary descriptor
  ageHours: number    // hours since created_at
  stalled:  boolean   // hours since updated_at > stall threshold for this status
  href:     string    // admin link for one-click navigation
}

export interface OpsSnapshot {
  // Editorial intake (VA owns)
  inboxNew:            number
  inboxNeedsReview:    number
  inboxOldestAgeHours: number
  inboxItems:          OpsQueueItem[]

  // Editorial pipeline (Editor owns)
  draftReady:          number   // ai-draft-ready waiting for editor
  inEditing:           number   // in-editing, actively being worked
  stalledEditorial:    number   // any pipeline item past stall threshold

  // Asset queue (Designer owns)
  assetsNeedingReview: number
  assetsNeedingDesign: number

  // Advertiser alerts (Jason owns)
  renewingIn30:        number   // contracts ending within 30 days
  renewingIn60:        number   // contracts ending within 31–60 days
  onboardingStuck:     number   // in onboarding stage > 14 days without update
  atRisk:              number   // at_risk_flagged_at is not null

  // Social queue (Publisher owns)
  socialApprovedNotExported: number   // approved but exported_to_social_planner = false
  socialMissingAsset:        number   // approved items missing usable image

  // Newsletter (Publisher owns)
  newsletterItems:         number
  newsletterQualityIssues: number   // missing section, teaser, or newsletter approval

  // Family Favorites (Jason + team)
  ffPhase:       string | null
  ffSeasonLabel: string | null
  ffDeadline:    string | null   // ISO date string of phase deadline

  // AI task queue (Editor owns)
  aiTasksNeedingReview: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursAgo(ts: string | null | undefined): number {
  if (!ts) return 0
  return (Date.now() - new Date(ts).getTime()) / 3600000
}

function safeCount<T>(result: PromiseSettledResult<{ data: T[] | null }>): T[] {
  return result.status === 'fulfilled' ? (result.value.data ?? []) : []
}

// ── Main snapshot query ───────────────────────────────────────────────────────

export async function getOpsSnapshot(db: SupabaseClient): Promise<OpsSnapshot> {
  const now      = new Date()
  const today    = now.toISOString().slice(0, 10)
  const cutoff30 = new Date(now.getTime() + RENEWAL_URGENT_DAYS  * 86400000).toISOString().slice(0, 10)
  const cutoff60 = new Date(now.getTime() + RENEWAL_WARNING_DAYS * 86400000).toISOString().slice(0, 10)
  const stuckCutoff = new Date(now.getTime() - 14 * 86400000).toISOString()

  const [
    inboxRes,
    editorialRes,
    assetsReviewRes,
    assetsDesignRes,
    renew30Res,
    renew60Res,
    onboardRes,
    atRiskRes,
    socialRes,
    newsletterRes,
    ffRes,
    aiTasksRes,
  ] = await Promise.allSettled([

    // 1. Submissions inbox: new + needs-review, oldest first
    db.from('community_submissions')
      .select('id, working_title, related_person_name, submission_type, status, created_at, updated_at')
      .in('status', ['new', 'needs-review'])
      .order('created_at', { ascending: true })
      .limit(50),

    // 2. Editorial pipeline: ai-draft-ready + in-editing, oldest updated first
    db.from('community_submissions')
      .select('id, working_title, related_person_name, submission_type, status, updated_at')
      .in('status', ['ai-draft-ready', 'in-editing'])
      .order('updated_at', { ascending: true })
      .limit(50),

    // 3. Assets needing review (new arrivals)
    db.from('media_assets')
      .select('id')
      .in('status', ['uploaded', 'needs_review'])
      .limit(200),

    // 4. Assets needing design work
    db.from('media_assets')
      .select('id')
      .or('needs_canva_graphic.eq.true,needs_social_square.eq.true,needs_print_crop.eq.true')
      .is('graphic_completed_at', null)
      .limit(200),

    // 5. Renewals within 30 days (urgent)
    db.from('advertiser_accounts')
      .select('id')
      .gte('contract_end_date', today)
      .lte('contract_end_date', cutoff30)
      .limit(100),

    // 6. Renewals within 31–60 days (warning)
    db.from('advertiser_accounts')
      .select('id')
      .gt('contract_end_date', cutoff30)
      .lte('contract_end_date', cutoff60)
      .limit(100),

    // 7. Advertisers stuck in onboarding > 14 days
    db.from('advertiser_accounts')
      .select('id')
      .eq('lifecycle_stage', 'onboarding')
      .lt('updated_at', stuckCutoff)
      .limit(100),

    // 8. At-risk advertisers
    db.from('advertiser_accounts')
      .select('id')
      .not('at_risk_flagged_at', 'is', null)
      .limit(100),

    // 9. Social: approved but not yet exported to planner
    db.from('community_submissions')
      .select('id, working_title, image_status, updated_at')
      .eq('approved_social', true)
      .or('exported_to_social_planner.is.null,exported_to_social_planner.eq.false')
      .limit(100),

    // 10. Newsletter items queued for next send
    db.from('community_submissions')
      .select('id, newsletter_section, approved_newsletter, newsletter_teaser')
      .eq('newsletter_include', true)
      .not('status', 'in', '("archived","rejected","published")')
      .limit(100),

    // 11. Active Family Favorites season
    db.from('ff_seasons')
      .select('id, season_label, status, phase_deadline')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),

    // 12. AI tasks completed but not yet human-reviewed
    db.from('ai_tasks')
      .select('id')
      .in('status', ['completed', 'needs_review'])
      .eq('human_review_required', true)
      .limit(100),
  ])

  // ── Inbox ────────────────────────────────────────────────────────────────
  type InboxRow = { id: string; working_title: string | null; related_person_name: string | null; submission_type: string; status: string; created_at: string; updated_at: string }
  const inboxRows = safeCount(inboxRes as PromiseSettledResult<{ data: InboxRow[] | null }>)

  const inboxNew         = inboxRows.filter(r => r.status === 'new').length
  const inboxNeedsReview = inboxRows.filter(r => r.status === 'needs-review').length
  const inboxOldestAgeHours = inboxRows.length > 0 ? hoursAgo(inboxRows[0].created_at) : 0

  const inboxItems: OpsQueueItem[] = inboxRows.slice(0, 6).map(r => ({
    id:       r.id,
    label:    r.working_title ?? r.related_person_name ?? r.submission_type,
    sub:      r.submission_type.replace(/-/g, ' '),
    ageHours: hoursAgo(r.created_at),
    stalled:  hoursAgo(r.updated_at) > (STALL_THRESHOLD_HOURS[r.status] ?? 48),
    href:     `/admin/community/${r.id}`,
  }))

  // ── Editorial pipeline ────────────────────────────────────────────────────
  type EditRow = { id: string; working_title: string | null; related_person_name: string | null; submission_type: string; status: string; updated_at: string }
  const editorialRows = safeCount(editorialRes as PromiseSettledResult<{ data: EditRow[] | null }>)

  const draftReady       = editorialRows.filter(r => r.status === 'ai-draft-ready').length
  const inEditing        = editorialRows.filter(r => r.status === 'in-editing').length
  const stalledEditorial = editorialRows.filter(r =>
    hoursAgo(r.updated_at) > (STALL_THRESHOLD_HOURS[r.status] ?? 72)
  ).length

  // ── Assets ───────────────────────────────────────────────────────────────
  const assetsNeedingReview = safeCount(assetsReviewRes as PromiseSettledResult<{ data: { id: string }[] | null }>).length
  const assetsNeedingDesign = safeCount(assetsDesignRes as PromiseSettledResult<{ data: { id: string }[] | null }>).length

  // ── Advertisers ──────────────────────────────────────────────────────────
  const renewingIn30    = safeCount(renew30Res  as PromiseSettledResult<{ data: { id: string }[] | null }>).length
  const renewingIn60    = safeCount(renew60Res  as PromiseSettledResult<{ data: { id: string }[] | null }>).length
  const onboardingStuck = safeCount(onboardRes  as PromiseSettledResult<{ data: { id: string }[] | null }>).length
  const atRisk          = safeCount(atRiskRes   as PromiseSettledResult<{ data: { id: string }[] | null }>).length

  // ── Social ───────────────────────────────────────────────────────────────
  type SocialRow = { id: string; image_status: string | null }
  const socialRows              = safeCount(socialRes as PromiseSettledResult<{ data: SocialRow[] | null }>)
  const socialApprovedNotExported = socialRows.length
  const socialMissingAsset        = socialRows.filter(r =>
    !['image_ready', 'use_existing_image', 'no_image_needed'].includes(r.image_status ?? '')
  ).length

  // ── Newsletter ───────────────────────────────────────────────────────────
  type NlRow = { id: string; newsletter_section: string | null; approved_newsletter: boolean | null; newsletter_teaser: string | null }
  const newsletterRows         = safeCount(newsletterRes as PromiseSettledResult<{ data: NlRow[] | null }>)
  const newsletterItems        = newsletterRows.length
  const newsletterQualityIssues = newsletterRows.filter(r =>
    !r.newsletter_section || !r.approved_newsletter || !r.newsletter_teaser
  ).length

  // ── Family Favorites ─────────────────────────────────────────────────────
  type FfRow = { season_label: string; status: string; phase_deadline: string | null }
  const ffData      = ffRes.status === 'fulfilled' ? (ffRes.value.data as FfRow | null) : null
  const ffPhase       = ffData?.status ?? null
  const ffSeasonLabel = ffData?.season_label ?? null
  const ffDeadline    = ffData?.phase_deadline ?? null

  // ── AI tasks ─────────────────────────────────────────────────────────────
  const aiTasksNeedingReview = safeCount(aiTasksRes as PromiseSettledResult<{ data: { id: string }[] | null }>).length

  return {
    inboxNew,
    inboxNeedsReview,
    inboxOldestAgeHours,
    inboxItems,
    draftReady,
    inEditing,
    stalledEditorial,
    assetsNeedingReview,
    assetsNeedingDesign,
    renewingIn30,
    renewingIn60,
    onboardingStuck,
    atRisk,
    socialApprovedNotExported,
    socialMissingAsset,
    newsletterItems,
    newsletterQualityIssues,
    ffPhase,
    ffSeasonLabel,
    ffDeadline,
    aiTasksNeedingReview,
  }
}
