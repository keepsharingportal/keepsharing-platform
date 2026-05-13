// src/lib/queries/health.ts
// Derives ecosystem health scores and publisher focus actions from OpsSnapshot.
// No additional DB queries — computed entirely from the existing OpsSnapshot.
// Used by the Publisher Command Center on /admin/today.

import type { OpsSnapshot } from '@/lib/queries/operations'

// ── Types ─────────────────────────────────────────────────────────────────────

export type HealthLevel = 'green' | 'amber' | 'red'

export interface HealthArea {
  label:   string
  level:   HealthLevel
  summary: string      // one-line plain-language status
  href:    string      // admin link
}

export interface EcosystemHealth {
  editorial:   HealthArea
  community:   HealthArea
  newsletter:  HealthArea
  partner:     HealthArea
  social:      HealthArea
  familyFavs:  HealthArea | null   // null when no active FF season
  overall:     HealthLevel          // worst area drives the overall signal
}

export interface FocusAction {
  label:   string        // what Jason should do
  context: string        // one-line why it matters now
  href:    string        // where to go to act
  urgency: HealthLevel
}

// ── Health score derivation ───────────────────────────────────────────────────

export function deriveEcosystemHealth(s: OpsSnapshot): EcosystemHealth {

  // ── Editorial ──────────────────────────────────────────────────────────────
  let editLevel: HealthLevel = 'green'
  let editSummary = 'Pipeline flowing — no stalls detected'

  if (s.stalledEditorial > 3 || s.inboxOldestAgeHours > 96) {
    editLevel = 'red'
    editSummary = s.stalledEditorial > 3
      ? `${s.stalledEditorial} items stalled — editorial queue backing up`
      : `Oldest submission is ${Math.round(s.inboxOldestAgeHours)}h old — triage overdue`
  } else if (s.stalledEditorial > 0 || s.inboxOldestAgeHours > 48) {
    editLevel = 'amber'
    editSummary = s.stalledEditorial > 0
      ? `${s.stalledEditorial} item${s.stalledEditorial > 1 ? 's' : ''} stalled in pipeline`
      : `Inbox item ${Math.round(s.inboxOldestAgeHours)}h old — needs triage`
  } else if (s.inboxNew + s.inboxNeedsReview > 0) {
    editSummary = `${s.inboxNew + s.inboxNeedsReview} items in queue, within threshold`
  }

  // ── Community ──────────────────────────────────────────────────────────────
  const activeSubmissions = s.inboxNew + s.inboxNeedsReview + s.draftReady + s.inEditing
  let communityLevel: HealthLevel = 'green'
  let communitySummary = 'Submissions arriving normally'

  if (activeSubmissions === 0) {
    communityLevel = 'amber'
    communitySummary = 'No active submissions — consider a nomination push'
  } else if (s.inboxNew + s.inboxNeedsReview > 25) {
    communityLevel = 'amber'
    communitySummary = `${s.inboxNew + s.inboxNeedsReview} unreviewed — VA triage overloaded`
  } else {
    communitySummary = `${activeSubmissions} active submission${activeSubmissions > 1 ? 's' : ''} in the pipeline`
  }

  // ── Newsletter ─────────────────────────────────────────────────────────────
  let nlLevel: HealthLevel = 'green'
  let nlSummary = `${s.newsletterItems} items queued — send ready`

  if (s.newsletterItems < 4) {
    nlLevel = 'red'
    nlSummary = `Only ${s.newsletterItems} item${s.newsletterItems !== 1 ? 's' : ''} queued — Wednesday send at risk`
  } else if (s.newsletterQualityIssues > 0) {
    nlLevel = 'amber'
    nlSummary = `${s.newsletterQualityIssues} quality issue${s.newsletterQualityIssues > 1 ? 's' : ''} — resolve before send`
  } else if (s.newsletterItems < 6) {
    nlLevel = 'amber'
    nlSummary = `${s.newsletterItems} items — add more for a full issue`
  }

  // ── Partner ────────────────────────────────────────────────────────────────
  let partnerLevel: HealthLevel = 'green'
  let partnerSummary = 'No immediate partner attention needed'

  if (s.atRisk > 0 || s.renewingIn30 > 2) {
    partnerLevel = 'red'
    partnerSummary = s.atRisk > 0
      ? `${s.atRisk} partner${s.atRisk > 1 ? 's' : ''} at risk of churn`
      : `${s.renewingIn30} contracts renewing within 30 days`
  } else if (s.renewingIn30 > 0 || s.onboardingStuck > 0) {
    partnerLevel = 'amber'
    const parts: string[] = []
    if (s.renewingIn30 > 0)    parts.push(`${s.renewingIn30} renewing soon`)
    if (s.onboardingStuck > 0) parts.push(`${s.onboardingStuck} onboarding stuck`)
    partnerSummary = parts.join(' · ')
  } else if (s.renewingIn60 > 0) {
    partnerSummary = `${s.renewingIn60} partner${s.renewingIn60 > 1 ? 's' : ''} renewing in 60 days — begin conversations`
  }

  // ── Social ─────────────────────────────────────────────────────────────────
  let socialLevel: HealthLevel = 'green'
  let socialSummary = 'Social queue current'

  if (s.socialApprovedNotExported > 10) {
    socialLevel = 'red'
    socialSummary = `${s.socialApprovedNotExported} posts approved but not exported — backlog growing`
  } else if (s.socialApprovedNotExported > 4 || s.socialMissingAsset > 0) {
    socialLevel = 'amber'
    socialSummary = s.socialMissingAsset > 0
      ? `${s.socialMissingAsset} post${s.socialMissingAsset > 1 ? 's' : ''} missing image — need assets before export`
      : `${s.socialApprovedNotExported} posts ready to export this week`
  } else if (s.socialApprovedNotExported > 0) {
    socialSummary = `${s.socialApprovedNotExported} post${s.socialApprovedNotExported > 1 ? 's' : ''} approved — export when ready`
  }

  // ── Family Favorites ───────────────────────────────────────────────────────
  let familyFavs: HealthArea | null = null
  if (s.ffPhase && s.ffSeasonLabel) {
    let ffLevel: HealthLevel = 'green'
    let ffSummary = `${s.ffSeasonLabel} · ${s.ffPhase} phase active`

    if (s.ffDeadline) {
      const daysUntil = Math.ceil((new Date(s.ffDeadline).getTime() - Date.now()) / 86400000)
      if (daysUntil < 0) {
        ffLevel = 'red'
        ffSummary = 'Phase deadline has passed — transition required'
      } else if (daysUntil <= 3) {
        ffLevel = 'red'
        ffSummary = `Deadline in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — immediate action required`
      } else if (daysUntil <= 7) {
        ffLevel = 'amber'
        ffSummary = `Deadline in ${daysUntil} days — review phase readiness`
      } else {
        ffSummary = `${s.ffPhase} · ${daysUntil} days until deadline`
      }
    }

    familyFavs = {
      label:   'Family Favorites',
      level:   ffLevel,
      summary: ffSummary,
      href:    '/admin/family-favorites',
    }
  }

  // ── Overall ────────────────────────────────────────────────────────────────
  const allLevels: HealthLevel[] = [
    editLevel, communityLevel, nlLevel, partnerLevel, socialLevel,
    ...(familyFavs ? [familyFavs.level] : []),
  ]
  const overall: HealthLevel = allLevels.includes('red') ? 'red'
    : allLevels.includes('amber') ? 'amber'
    : 'green'

  return {
    editorial:  { label: 'Editorial',  level: editLevel,      summary: editSummary,      href: '/admin/editorial' },
    community:  { label: 'Community',  level: communityLevel, summary: communitySummary, href: '/admin/community' },
    newsletter: { label: 'Newsletter', level: nlLevel,        summary: nlSummary,        href: '/admin/distribution' },
    partner:    { label: 'Partners',   level: partnerLevel,   summary: partnerSummary,   href: '/admin/advertisers' },
    social:     { label: 'Social',     level: socialLevel,    summary: socialSummary,    href: '/admin/distribution/social-export' },
    familyFavs,
    overall,
  }
}

// ── Focus action engine ───────────────────────────────────────────────────────
// Surfaces the top 3 highest-leverage actions Jason personally should take today.
// Weighted by business impact. Sorted highest-weight first.

type ScoredAction = FocusAction & { weight: number }

export function deriveFocusActions(s: OpsSnapshot): FocusAction[] {
  const candidates: ScoredAction[] = []

  // At-risk partners — highest business impact, immediate churn risk
  if (s.atRisk > 0) {
    candidates.push({
      label:   `Review ${s.atRisk} at-risk partner${s.atRisk > 1 ? 's' : ''}`,
      context: 'Active churn risk — a personal call now costs less than a lost contract',
      href:    '/admin/advertisers',
      urgency: 'red',
      weight:  100,
    })
  }

  // Urgent renewals (30 days)
  if (s.renewingIn30 > 0) {
    candidates.push({
      label:   `${s.renewingIn30} contract${s.renewingIn30 > 1 ? 's' : ''} renewing in 30 days`,
      context: 'The renewal conversation should have started at 60 days — begin immediately',
      href:    '/admin/advertisers',
      urgency: 'red',
      weight:  90,
    })
  }

  // FF deadline within 7 days
  if (s.ffDeadline) {
    const daysUntil = Math.ceil((new Date(s.ffDeadline).getTime() - Date.now()) / 86400000)
    if (daysUntil >= 0 && daysUntil <= 7) {
      candidates.push({
        label:   `Family Favorites deadline in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        context: 'Phase transition is a strategic decision that only you can make',
        href:    '/admin/family-favorites',
        urgency: daysUntil <= 3 ? 'red' : 'amber',
        weight:  daysUntil <= 3 ? 95 : 82,
      })
    }
  }

  // Newsletter at risk
  if (s.newsletterItems < 4) {
    candidates.push({
      label:   `Newsletter needs content — only ${s.newsletterItems} item${s.newsletterItems !== 1 ? 's' : ''} queued`,
      context: 'Missing Wednesday send breaks the audience habit — most damaging skip is the first',
      href:    '/admin/distribution',
      urgency: 'red',
      weight:  85,
    })
  }

  // Onboarding stuck
  if (s.onboardingStuck > 0) {
    candidates.push({
      label:   `${s.onboardingStuck} new partner${s.onboardingStuck > 1 ? 's' : ''} stuck in onboarding`,
      context: 'First impression at risk — a quick check-in prevents an early churn',
      href:    '/admin/advertisers',
      urgency: 'amber',
      weight:  75,
    })
  }

  // Stalled editorial
  if (s.stalledEditorial > 0) {
    candidates.push({
      label:   `${s.stalledEditorial} editorial item${s.stalledEditorial > 1 ? 's' : ''} stalled in pipeline`,
      context: 'Content backing up usually signals a resource or decision bottleneck',
      href:    '/admin/editorial',
      urgency: 'amber',
      weight:  68,
    })
  }

  // Warning renewals (60 days — schedule a check-in)
  if (s.renewingIn60 > 0 && s.renewingIn30 === 0) {
    candidates.push({
      label:   `${s.renewingIn60} partner${s.renewingIn60 > 1 ? 's' : ''} renewing within 60 days`,
      context: 'Schedule a visibility review now — renewal conversations that start here stay warm',
      href:    '/admin/advertisers',
      urgency: 'amber',
      weight:  60,
    })
  }

  // Newsletter quality issues
  if (s.newsletterQualityIssues > 0 && s.newsletterItems >= 4) {
    candidates.push({
      label:   `${s.newsletterQualityIssues} newsletter quality issue${s.newsletterQualityIssues > 1 ? 's' : ''} before Wednesday`,
      context: 'Missing sections or teasers — a 10-minute pass clears these before send',
      href:    '/admin/distribution',
      urgency: 'amber',
      weight:  55,
    })
  }

  // Social backlog
  if (s.socialApprovedNotExported > 10) {
    candidates.push({
      label:   `${s.socialApprovedNotExported} approved posts not exported to GHL`,
      context: 'Social rhythm is breaking — export this week or the backlog grows further',
      href:    '/admin/distribution/social-export',
      urgency: 'amber',
      weight:  52,
    })
  }

  // AI tasks pending review
  if (s.aiTasksNeedingReview > 0) {
    candidates.push({
      label:   `${s.aiTasksNeedingReview} AI task${s.aiTasksNeedingReview > 1 ? 's' : ''} awaiting human review`,
      context: 'AI completed work that cannot be applied until you approve it',
      href:    '/admin/ai-tasks',
      urgency: 'amber',
      weight:  45,
    })
  }

  // All clear
  if (candidates.length === 0) {
    return [{
      label:   'All systems healthy — no immediate action required',
      context: 'Good time for school partner outreach or a prospective guide partner conversation',
      href:    '/admin/today',
      urgency: 'green',
    }]
  }

  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ weight: _w, ...rest }) => rest)
}
