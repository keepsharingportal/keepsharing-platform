// ── src/lib/queries/aiTasks.ts ────────────────────────────────────────────────
// Shared query helpers for ai_tasks.
// Safety invariant preserved: human_review_required = TRUE on every row.
// No query in this file bypasses human review.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AITaskRow }      from '@/types/db'

// ── Column lists ──────────────────────────────────────────────────────────────

/** Summary columns for queue/count views */
export const AI_TASK_SUMMARY_COLS = [
  'id', 'task_type', 'status', 'priority',
  'source_table', 'source_id',
  'output_preview', 'human_review_required',
  'created_at', 'completed_at',
].join(', ')

/** Full columns for the review desk */
export const AI_TASK_FULL_COLS = [
  'id', 'task_type', 'status', 'priority',
  'source_table', 'source_id',
  'requested_by', 'assigned_to',
  'input_snapshot', 'output_preview', 'output_payload',
  'error_message', 'human_review_required',
  'approved_by', 'approved_at', 'rejected_at', 'rejection_note',
  'created_at', 'started_at', 'completed_at',
].join(', ')

// ── Status groups ─────────────────────────────────────────────────────────────

/** Tasks that need a human to take action */
export const PENDING_REVIEW_STATUSES = ['completed', 'needs_review'] as const

/** Tasks that are actively being worked */
export const ACTIVE_STATUSES = ['queued', 'running'] as const

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Tasks awaiting human review — the primary review queue.
 * Only returns tasks where human_review_required = TRUE (all of them by invariant).
 */
export async function getPendingAITasks(
  db: SupabaseClient,
): Promise<AITaskRow[]> {
  const { data } = await db
    .from('ai_tasks')
    .select(AI_TASK_SUMMARY_COLS)
    .in('status', [...PENDING_REVIEW_STATUSES])
    .eq('human_review_required', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(100)
  return (data ?? []) as unknown as AITaskRow[]
}

/**
 * Tasks in the active processing queue (queued + running).
 * Used for queue depth monitoring.
 */
export async function getActiveAITasks(
  db: SupabaseClient,
): Promise<AITaskRow[]> {
  const { data } = await db
    .from('ai_tasks')
    .select(AI_TASK_SUMMARY_COLS)
    .in('status', [...ACTIVE_STATUSES])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(100)
  return (data ?? []) as unknown as AITaskRow[]
}

/**
 * Failed tasks — may need retry or investigation.
 */
export async function getFailedAITasks(
  db: SupabaseClient,
): Promise<AITaskRow[]> {
  const { data } = await db
    .from('ai_tasks')
    .select(AI_TASK_FULL_COLS)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as unknown as AITaskRow[]
}

/**
 * Tasks for a specific source record (e.g., all AI tasks for a submission).
 */
export async function getAITasksBySource(
  db: SupabaseClient,
  sourceTable: string,
  sourceId: string,
): Promise<AITaskRow[]> {
  const { data } = await db
    .from('ai_tasks')
    .select(AI_TASK_FULL_COLS)
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as unknown as AITaskRow[]
}

/**
 * Count of tasks awaiting human review.
 * Lightweight — use for badge counts without loading full rows.
 */
export async function getPendingAITaskCount(
  db: SupabaseClient,
): Promise<number> {
  const { count } = await db
    .from('ai_tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', [...PENDING_REVIEW_STATUSES])
    .eq('human_review_required', true)
  return count ?? 0
}
