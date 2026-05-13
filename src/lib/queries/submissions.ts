// ── src/lib/queries/submissions.ts ────────────────────────────────────────────
// Shared query helpers for community_submissions.
// Centralizes SELECT column lists, status filters, and ordering
// that were previously duplicated across 15+ admin pages.
//
// Usage:
//   const supabase = await createClient()
//   const items = await getActiveSubmissions(supabase, filterPub)
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubmissionRow }  from '@/types/db'
import type { PublicationSlug } from './publications'

// ── Column lists ──────────────────────────────────────────────────────────────
// Each list is purpose-scoped to minimize data transfer.
// Import the constant that matches your view's needs.

/** Minimal columns for queue/list views — inbox, community queue, count displays */
export const SUBMISSION_SUMMARY_COLS = [
  'id', 'submission_type', 'target_publication', 'status', 'ai_draft_status',
  'working_title', 'related_person_name', 'related_business_name', 'related_school_name',
  'internal_priority', 'assigned_to', 'created_at', 'updated_at',
].join(', ')

/** Columns needed by the intelligence dashboard — adds approval/social flags */
export const SUBMISSION_INTELLIGENCE_COLS = [
  'id', 'submission_type', 'target_publication', 'status', 'ai_draft_status',
  'approved_social', 'approved_newsletter', 'social_queue', 'newsletter_include',
  'newsletter_teaser', 'caption_facebook', 'social_planner_ready',
  'exported_to_social_planner', 'image_status', 'created_at', 'updated_at',
].join(', ')

/** Columns needed by the distribution page — adds routing and channel metadata */
export const SUBMISSION_DISTRIBUTION_COLS = [
  'id', 'submission_type', 'target_publication', 'status', 'ai_draft_status',
  'working_title', 'related_person_name', 'related_business_name', 'related_school_name',
  'excerpt', 'destination_section', 'destination_guide_slug',
  'issue_month', 'issue_year',
  'homepage_feature', 'homepage_section', 'homepage_priority', 'homepage_remove_on',
  'newsletter_include', 'newsletter_section', 'newsletter_order',
  'social_queue', 'social_priority',
  'approved_newsletter', 'newsletter_teaser', 'published_url', 'social_link',
  'feature_image_url', 'photo_urls', 'assigned_to', 'created_at', 'updated_at',
].join(', ')

/** Columns needed by the social export page */
export const SUBMISSION_SOCIAL_EXPORT_COLS = [
  'id', 'submission_type', 'target_publication',
  'working_title', 'related_person_name', 'related_business_name', 'related_school_name',
  'approved_social', 'social_planner_ready', 'social_queue',
  'caption_facebook', 'caption_instagram', 'caption_sms',
  'social_hashtags', 'social_image_note', 'social_publish_date', 'social_link',
  'feature_image_url', 'photo_urls',
  'image_status', 'exported_to_social_planner', 'social_promoted_at',
  'created_at', 'updated_at',
].join(', ')

// ── Status groups ─────────────────────────────────────────────────────────────

/** Statuses considered "active" — not yet closed, not archived */
export const ACTIVE_STATUSES = [
  'new', 'needs-review', 'awaiting-info', 'in-progress',
  'ready-for-ai', 'ai-draft-ready', 'in-editing', 'approved', 'scheduled',
] as const

/** Statuses that appear in the editorial production pipeline */
export const EDITORIAL_STATUSES = [
  'approved', 'scheduled', 'ai-draft-ready', 'in-editing',
] as const

/** Statuses that represent "pending operator attention" */
export const REVIEW_STATUSES = ['new', 'needs-review'] as const

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Active submissions for the intelligence dashboard.
 * Lightweight — uses SUBMISSION_INTELLIGENCE_COLS.
 * Excludes archived, rejected, published.
 */
export async function getActiveSubmissions(
  db: SupabaseClient,
  pub?: PublicationSlug | null,
): Promise<SubmissionRow[]> {
  let q = db
    .from('community_submissions')
    .select(SUBMISSION_INTELLIGENCE_COLS)
    .not('status', 'in', '("archived","rejected","published")')
    .order('created_at', { ascending: false })
    .limit(500)
  if (pub) q = q.eq('target_publication', pub)
  const { data } = await q
  return (data ?? []) as unknown as SubmissionRow[]
}

/**
 * Submissions for the distribution center.
 * Heavier column set — includes routing and channel metadata.
 * Filters to editorial-ready statuses only.
 */
export async function getDistributionItems(
  db: SupabaseClient,
  pub?: PublicationSlug | null,
): Promise<SubmissionRow[]> {
  let q = db
    .from('community_submissions')
    .select(SUBMISSION_DISTRIBUTION_COLS)
    .in('status', ['approved', 'scheduled', 'ai-draft-ready', 'in-editing'])
    .order('created_at', { ascending: false })
    .limit(300)
  if (pub) q = q.eq('target_publication', pub)
  const { data } = await q
  return (data ?? []) as unknown as SubmissionRow[]
}

/**
 * Submissions pending editorial review (new + needs-review).
 * Used in community queue, operations, and intelligence pending-action counts.
 */
export async function getPendingReviewSubmissions(
  db: SupabaseClient,
  pub?: PublicationSlug | null,
): Promise<SubmissionRow[]> {
  let q = db
    .from('community_submissions')
    .select(SUBMISSION_SUMMARY_COLS)
    .in('status', ['new', 'needs-review'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (pub) q = q.eq('target_publication', pub)
  const { data } = await q
  return (data ?? []) as unknown as SubmissionRow[]
}

/**
 * Approved social posts for the social export workflow.
 */
export async function getSocialExportItems(
  db: SupabaseClient,
  pub?: PublicationSlug | null,
): Promise<SubmissionRow[]> {
  let q = db
    .from('community_submissions')
    .select(SUBMISSION_SOCIAL_EXPORT_COLS)
    .or('approved_social.eq.true,social_planner_ready.eq.true,social_queue.eq.true')
    .order('social_publish_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200)
  if (pub) q = q.eq('target_publication', pub)
  const { data } = await q
  return (data ?? []) as unknown as SubmissionRow[]
}

/**
 * Single submission by ID. Returns null if not found.
 */
export async function getSubmissionById(
  db: SupabaseClient,
  id: string,
): Promise<SubmissionRow | null> {
  const { data } = await db
    .from('community_submissions')
    .select('*')
    .eq('id', id)
    .single()
  return (data ?? null) as unknown as SubmissionRow | null
}

/**
 * Submission count by type for participation analysis.
 * Returns a Map of submission_type → count.
 */
export async function getSubmissionTypeCounts(
  db: SupabaseClient,
  pub?: PublicationSlug | null,
): Promise<Map<string, number>> {
  let q = db
    .from('community_submissions')
    .select('submission_type')
    .limit(2000)
  if (pub) q = q.eq('target_publication', pub)
  const { data } = await q
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const t = (row as { submission_type: string }).submission_type
    map.set(t, (map.get(t) ?? 0) + 1)
  }
  return map
}
