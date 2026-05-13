// ── src/lib/workflow-status.ts ────────────────────────────────────────────────
// Canonical workflow status reference.
// Single source of truth for all status values, display labels, and colors
// across the platform's editorial, social, AI, and asset workflows.
//
// Usage:
//   import { SUBMISSION_STATUS, SOCIAL_STATUS, AI_TASK_STATUS } from '@/lib/workflow-status'
//   const style = SUBMISSION_STATUS[item.status]?.style ?? ''
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowStatus {
  label:       string   // display name in UI
  color:       string   // hex text color
  bg:          string   // hex or Tailwind bg for badge background
  style:       string   // combined Tailwind className for badge
  description: string   // one-line operator-facing explanation
}

// ── community_submissions.status ─────────────────────────────────────────────
// 12 values. Source: migrations 053.
// Operator journey: new → needs-review → in-progress → approved → published.

export const SUBMISSION_STATUS: Record<string, WorkflowStatus> = {
  'new': {
    label: 'New', color: '#16a34a', bg: '#f0fdf4',
    style: 'bg-green-50 text-green-700',
    description: 'Just submitted — not yet reviewed.',
  },
  'needs-review': {
    label: 'Needs Review', color: '#2563eb', bg: '#eff6ff',
    style: 'bg-blue-50 text-blue-700',
    description: 'In the editorial review queue.',
  },
  'awaiting-info': {
    label: 'Awaiting Info', color: '#d97706', bg: '#fefce8',
    style: 'bg-amber-50 text-amber-700',
    description: 'Waiting on more information from the submitter.',
  },
  'in-progress': {
    label: 'In Progress', color: '#7c3aed', bg: '#f5f3ff',
    style: 'bg-purple-50 text-purple-700',
    description: 'Operator is actively working on this.',
  },
  'ready-for-ai': {
    label: 'Ready for AI', color: '#0891b2', bg: '#ecfeff',
    style: 'bg-cyan-50 text-cyan-700',
    description: 'All information present — queued for AI draft.',
  },
  'ai-draft-ready': {
    label: 'AI Draft Ready', color: '#0284c7', bg: '#e0f2fe',
    style: 'bg-sky-50 text-sky-700',
    description: 'AI generated a first-pass draft for review.',
  },
  'in-editing': {
    label: 'In Editing', color: '#c4622d', bg: '#fff7ed',
    style: 'bg-orange-50 text-orange-700',
    description: 'Editor is refining the content.',
  },
  'approved': {
    label: 'Approved', color: '#15803d', bg: '#f0fdf4',
    style: 'bg-green-100 text-green-800',
    description: 'Approved and ready to publish.',
  },
  'scheduled': {
    label: 'Scheduled', color: '#b45309', bg: '#fefce8',
    style: 'bg-yellow-50 text-yellow-700',
    description: 'Assigned to a specific issue or date.',
  },
  'published': {
    label: 'Published', color: '#374151', bg: '#f9fafb',
    style: 'bg-gray-100 text-gray-700',
    description: 'Live in digital or print.',
  },
  'rejected': {
    label: 'Rejected', color: '#dc2626', bg: '#fef2f2',
    style: 'bg-red-50 text-red-700',
    description: 'Not moving forward.',
  },
  'archived': {
    label: 'Archived', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: 'Completed or closed.',
  },
}

// ── community_submissions.ai_draft_status ────────────────────────────────────
// 7 values. Source: migrations 053, 054, 056.

export const AI_DRAFT_STATUS: Record<string, WorkflowStatus> = {
  'none': {
    label: 'Not Started', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: 'No AI draft has been requested.',
  },
  'queued': {
    label: 'Queued', color: '#6b7280', bg: '#f3f4f6',
    style: 'bg-gray-100 text-gray-600',
    description: 'Draft request queued for processing.',
  },
  'generating': {
    label: 'Generating', color: '#0891b2', bg: '#ecfeff',
    style: 'bg-cyan-50 text-cyan-700',
    description: 'AI is actively generating the draft.',
  },
  'ready': {
    label: 'Draft Ready', color: '#16a34a', bg: '#f0fdf4',
    style: 'bg-green-50 text-green-700',
    description: 'AI draft is ready for operator review.',
  },
  'edited': {
    label: 'Edited', color: '#7c3aed', bg: '#f5f3ff',
    style: 'bg-purple-50 text-purple-700',
    description: 'Operator has edited the AI draft.',
  },
  'needs_info': {
    label: 'Missing Info', color: '#d97706', bg: '#fefce8',
    style: 'bg-amber-50 text-amber-700',
    description: 'Submission lacks required fields for draft generation.',
  },
  'failed': {
    label: 'Failed', color: '#dc2626', bg: '#fef2f2',
    style: 'bg-red-50 text-red-700',
    description: 'Draft generation encountered an error.',
  },
}

// ── social_workflow_status ────────────────────────────────────────────────────
// 8 values. Source: migration 064.
// Replaces approved_social, social_queue, social_planner_ready,
// exported_to_social_planner booleans.

export const SOCIAL_STATUS: Record<string, WorkflowStatus> = {
  'draft': {
    label: 'Draft', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: 'Not yet submitted for social consideration.',
  },
  'needs_review': {
    label: 'Needs Review', color: '#d97706', bg: '#fefce8',
    style: 'bg-amber-50 text-amber-700',
    description: 'Marked for social; awaiting editorial approval.',
  },
  'approved': {
    label: 'Approved', color: '#16a34a', bg: '#f0fdf4',
    style: 'bg-green-50 text-green-700',
    description: 'Editor has approved this content for social use.',
  },
  'queued': {
    label: 'Queued', color: '#2563eb', bg: '#eff6ff',
    style: 'bg-blue-50 text-blue-700',
    description: 'All prep done; ready to export to social planner.',
  },
  'exported': {
    label: 'Exported', color: '#7c3aed', bg: '#f5f3ff',
    style: 'bg-purple-50 text-purple-700',
    description: 'Operator exported to GHL Social Planner or other tool.',
  },
  'scheduled': {
    label: 'Scheduled', color: '#0891b2', bg: '#ecfeff',
    style: 'bg-cyan-50 text-cyan-700',
    description: 'Confirmed scheduled in external scheduling tool.',
  },
  'posted': {
    label: 'Posted', color: '#374151', bg: '#f9fafb',
    style: 'bg-gray-100 text-gray-700',
    description: 'Operator confirmed the post went live.',
  },
  'archived': {
    label: 'Archived', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: 'Removed from active social workflow.',
  },
}

// ── Valid social_workflow_status transitions ──────────────────────────────────
// Enforced at application layer (DB constraint only enforces valid values, not order).

export const SOCIAL_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:       ['needs_review', 'archived'],
  needs_review:['approved', 'draft', 'archived'],
  approved:    ['queued', 'needs_review', 'archived'],
  queued:      ['exported', 'approved', 'archived'],
  exported:    ['scheduled', 'posted', 'queued', 'archived'],
  scheduled:   ['posted', 'archived'],
  posted:      ['archived'],
  archived:    [],
}

// ── ai_tasks.status ───────────────────────────────────────────────────────────
// 8 values. Source: migration 059.
// SAFETY: human_review_required = TRUE on every row. No output auto-applied.

export const AI_TASK_STATUS: Record<string, WorkflowStatus> = {
  'queued': {
    label: 'Queued', color: '#6b7280', bg: '#f3f4f6',
    style: 'bg-gray-100 text-gray-600',
    description: 'Waiting to be processed by the AI worker.',
  },
  'running': {
    label: 'Running', color: '#0891b2', bg: '#ecfeff',
    style: 'bg-cyan-50 text-cyan-700',
    description: 'AI worker is actively processing.',
  },
  'completed': {
    label: 'Completed', color: '#d97706', bg: '#fefce8',
    style: 'bg-amber-50 text-amber-700',
    description: 'AI finished — awaiting human review before use.',
  },
  'needs_review': {
    label: 'Needs Review', color: '#dc2626', bg: '#fef2f2',
    style: 'bg-red-50 text-red-700',
    description: 'Explicitly flagged for operator attention.',
  },
  'approved': {
    label: 'Approved', color: '#16a34a', bg: '#f0fdf4',
    style: 'bg-green-50 text-green-700',
    description: 'Operator approved — output may be applied to source record.',
  },
  'rejected': {
    label: 'Rejected', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-500',
    description: 'Operator rejected — output will not be used.',
  },
  'failed': {
    label: 'Failed', color: '#dc2626', bg: '#fef2f2',
    style: 'bg-red-50 text-red-700',
    description: 'Processing error — see error_message for details.',
  },
  'canceled': {
    label: 'Canceled', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: 'Manually stopped before completion.',
  },
}

// ── media_assets.status ───────────────────────────────────────────────────────
// 7 values. Source: migration 061.

export const ASSET_STATUS: Record<string, WorkflowStatus> = {
  'uploaded': {
    label: 'Uploaded', color: '#6b7280', bg: '#f3f4f6',
    style: 'bg-gray-100 text-gray-600',
    description: 'Just arrived — not yet reviewed.',
  },
  'needs_review': {
    label: 'Needs Review', color: '#d97706', bg: '#fefce8',
    style: 'bg-amber-50 text-amber-700',
    description: 'Queued for operator review.',
  },
  'approved': {
    label: 'Approved', color: '#16a34a', bg: '#f0fdf4',
    style: 'bg-green-50 text-green-700',
    description: 'Cleared for use.',
  },
  'needs_graphic': {
    label: 'Needs Graphic', color: '#ea580c', bg: '#fff7ed',
    style: 'bg-orange-50 text-orange-700',
    description: 'Raw photo exists but Canva/design work needed.',
  },
  'social_ready': {
    label: 'Social Ready', color: '#2563eb', bg: '#eff6ff',
    style: 'bg-blue-50 text-blue-700',
    description: 'Ready for social media use.',
  },
  'print_ready': {
    label: 'Print Ready', color: '#7c3aed', bg: '#f5f3ff',
    style: 'bg-purple-50 text-purple-700',
    description: 'Resolution and crop cleared for print.',
  },
  'archived': {
    label: 'Archived', color: '#9ca3af', bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: 'No longer in active rotation.',
  },
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Get a status object safely, with a fallback for unknown values. */
export function getStatus(
  map: Record<string, WorkflowStatus>,
  value: string | null | undefined,
): WorkflowStatus {
  return map[value ?? ''] ?? {
    label: value ?? 'Unknown',
    color: '#9ca3af',
    bg: '#f9fafb',
    style: 'bg-gray-50 text-gray-400',
    description: '',
  }
}
