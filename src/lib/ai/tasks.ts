// ── src/lib/ai/tasks.ts ───────────────────────────────────────────────────────
// AI Task Routing Foundation.
// Helpers for creating entries in the ai_tasks queue.
//
// ARCHITECTURE INTENT:
//   Current state: community-drafts.ts and editorial-promo-ai.ts write directly
//   to community_submissions columns (ai_draft_content, caption_facebook, etc.).
//   This bypasses the ai_tasks audit trail.
//
//   Target state (Phase 3): all AI generation routes through this module.
//   Pages enqueue tasks → worker processes them → operators review in /admin/ai-tasks
//   → approved output is applied to source records by a separate human-triggered action.
//
//   This file builds the foundation without breaking existing flows.
//   Existing direct-write functions are NOT replaced here — they continue to work.
//   New AI features SHOULD use createAITask() instead of writing directly.
//
// SAFETY INVARIANT:
//   human_review_required = TRUE on every row. This is enforced at DB level AND
//   in this module. No AI output is ever applied without operator approval.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AITaskType =
  | 'social_caption'
  | 'newsletter_teaser'
  | 'missing_info_email'
  | 'article_refresh'
  | 'proposal_notes'
  | 'sponsor_pairing'
  | 'headline_options'
  | 'seo_suggestions'
  | 'event_summary'

export type AITaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CreateAITaskParams {
  task_type:      AITaskType
  source_table?:  string            // e.g. 'community_submissions'
  source_id?:     string            // UUID of the source record
  priority?:      AITaskPriority
  requested_by?:  string            // operator name or 'system'
  input_snapshot?:Record<string, unknown>  // snapshot of data sent to AI (audit trail)
}

export interface AITaskResult {
  success: boolean
  taskId:  string | null
  error?:  string
}

// ── Core task creation ────────────────────────────────────────────────────────

/**
 * Enqueue a new AI task for background processing.
 * human_review_required is always set to TRUE — this is a safety invariant
 * that cannot be overridden by callers.
 *
 * Returns the new task ID, or null on failure.
 */
export async function createAITask(
  db: SupabaseClient,
  params: CreateAITaskParams,
): Promise<AITaskResult> {
  const { data, error } = await db
    .from('ai_tasks')
    .insert({
      task_type:             params.task_type,
      source_table:          params.source_table   ?? null,
      source_id:             params.source_id      ?? null,
      priority:              params.priority        ?? 'normal',
      requested_by:          params.requested_by   ?? 'system',
      input_snapshot:        params.input_snapshot ?? null,
      status:                'queued',
      human_review_required: true,   // SAFETY INVARIANT — never override
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, taskId: null, error: error.message }
  }

  return { success: true, taskId: (data as { id: string }).id }
}

// ── Submission-specific task shortcuts ───────────────────────────────────────
// These are typed wrappers around createAITask for the most common use cases.
// Use these instead of createAITask when the source is a community_submissions row.

/**
 * Queue a social caption generation task for a community submission.
 * Generates caption_facebook, caption_instagram, caption_sms.
 */
export async function queueSocialCaptionTask(
  db: SupabaseClient,
  submissionId: string,
  requestedBy?: string,
  snapshot?: Record<string, unknown>,
): Promise<AITaskResult> {
  return createAITask(db, {
    task_type:      'social_caption',
    source_table:   'community_submissions',
    source_id:      submissionId,
    priority:       'normal',
    requested_by:   requestedBy,
    input_snapshot: snapshot,
  })
}

/**
 * Queue a newsletter teaser generation task for a community submission.
 * Generates newsletter_teaser.
 */
export async function queueNewsletterTeaserTask(
  db: SupabaseClient,
  submissionId: string,
  requestedBy?: string,
  snapshot?: Record<string, unknown>,
): Promise<AITaskResult> {
  return createAITask(db, {
    task_type:      'newsletter_teaser',
    source_table:   'community_submissions',
    source_id:      submissionId,
    priority:       'normal',
    requested_by:   requestedBy,
    input_snapshot: snapshot,
  })
}

/**
 * Queue a headline options task — AI suggests alternative headlines.
 */
export async function queueHeadlineOptionsTask(
  db: SupabaseClient,
  submissionId: string,
  requestedBy?: string,
): Promise<AITaskResult> {
  return createAITask(db, {
    task_type:    'headline_options',
    source_table: 'community_submissions',
    source_id:    submissionId,
    priority:     'low',
    requested_by: requestedBy,
  })
}

/**
 * Queue a missing-info email task — AI drafts an outreach to the submitter.
 */
export async function queueMissingInfoEmailTask(
  db: SupabaseClient,
  submissionId: string,
  requestedBy?: string,
  snapshot?: Record<string, unknown>,
): Promise<AITaskResult> {
  return createAITask(db, {
    task_type:      'missing_info_email',
    source_table:   'community_submissions',
    source_id:      submissionId,
    priority:       'normal',
    requested_by:   requestedBy,
    input_snapshot: snapshot,
  })
}

// ── Advertiser-specific task shortcuts ───────────────────────────────────────

/**
 * Queue a proposal notes task — AI prepares context notes for an advertiser proposal.
 */
export async function queueProposalNotesTask(
  db: SupabaseClient,
  advertiserId: string,
  requestedBy?: string,
): Promise<AITaskResult> {
  return createAITask(db, {
    task_type:    'proposal_notes',
    source_table: 'advertiser_accounts',
    source_id:    advertiserId,
    priority:     'normal',
    requested_by: requestedBy,
  })
}

/**
 * Queue a sponsor pairing task — AI suggests content/sponsor alignment.
 */
export async function queueSponsorPairingTask(
  db: SupabaseClient,
  advertiserId: string,
  requestedBy?: string,
): Promise<AITaskResult> {
  return createAITask(db, {
    task_type:    'sponsor_pairing',
    source_table: 'advertiser_accounts',
    source_id:    advertiserId,
    priority:     'low',
    requested_by: requestedBy,
  })
}

// ── Task query helpers ────────────────────────────────────────────────────────

/**
 * Check if a pending AI task already exists for a source record + type.
 * Prevents duplicate queuing (e.g., user clicks "Generate" twice).
 */
export async function hasPendingTask(
  db: SupabaseClient,
  sourceTable: string,
  sourceId: string,
  taskType: AITaskType,
): Promise<boolean> {
  const { count } = await db
    .from('ai_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId)
    .eq('task_type', taskType)
    .in('status', ['queued', 'running', 'completed', 'needs_review'])

  return (count ?? 0) > 0
}

// ── Migration path documentation ──────────────────────────────────────────────
//
// PHASE 3 MIGRATION PLAN (future):
//
// 1. community-drafts.ts: generateCommunityDraft() currently writes directly to
//    community_submissions.ai_draft_content. Migrate to:
//    → queueSocialCaptionTask() → worker calls Claude → stores in ai_tasks.output_payload
//    → operator approves → server action copies to ai_draft_content
//
// 2. editorial-promo-ai.ts: generatePromo() currently writes directly to
//    caption_facebook, caption_instagram, etc. Migrate to:
//    → queueSocialCaptionTask() / queueNewsletterTeaserTask()
//    → worker processes → operator approves → applies to source record
//
// 3. ai-review.ts and ai/article-generator.ts:
//    → route through ai_tasks table with appropriate task_type
//
// Until Phase 3, the direct-write functions continue to work.
// This file provides the queue infrastructure for new AI features.
